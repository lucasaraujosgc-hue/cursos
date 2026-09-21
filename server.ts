import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import { createLeadStore, LeadStore } from "./lead-store";
import {
  createAnalyticsStore,
  summarise,
  listaVisitas,
  historicoPorVisitante,
  AnalyticsStore,
  EventType,
} from "./analytics-store";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Where courses and leads live on disk. Point DATA_DIR at a mounted volume in
 * production — otherwise the directory lives inside the container and every
 * deploy or restart wipes the captured leads.
 */
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

const DATA_FILE = path.join(DATA_DIR, "courses.json");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const EVENTS_FILE = path.join(DATA_DIR, "events.jsonl");
/** Course cover images uploaded from the admin, served at /uploads/<file>. */
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

const JWT_SECRET = process.env.JWT_SECRET;
if (IS_PROD && (!JWT_SECRET || JWT_SECRET.length < 16)) {
  // A fallback secret here would let anyone forge an admin cookie.
  throw new Error("JWT_SECRET must be set (16+ chars) when NODE_ENV=production");
}
if (IS_PROD && (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD)) {
  throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set when NODE_ENV=production");
}
const SIGNING_SECRET = JWT_SECRET || "dev-only-insecure-secret";

// Image uploads arrive as a raw body, so they are handled before the JSON
// parsers, which would otherwise try (and fail) to parse the bytes.
app.use(
  "/api/admin/uploads",
  express.raw({ type: ["image/png", "image/jpeg", "image/webp", "image/gif"], limit: "8mb" })
);
// Admin payloads carry whole course JSONs, so they get a generous limit; every
// other route gets a small one so a public endpoint can't be used to fill the disk.
app.use("/api/admin", express.json({ limit: "25mb" }));
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());

function readJsonFile(file: string) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    console.error(`Failed to parse ${file}:`, err);
    return [];
  }
}

/** Write via a temp file + rename so a crash mid-write can't truncate the data. */
function writeJsonFile(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

/**
 * When DATA_DIR points at an empty volume, copy the courses shipped in the
 * repo into it once, so a fresh deploy doesn't come up with zero courses.
 */
function seedCoursesIfEmpty() {
  if (fs.existsSync(DATA_FILE)) return;
  const bundled = path.join(process.cwd(), "data", "courses.json");
  if (bundled === DATA_FILE || !fs.existsSync(bundled)) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.copyFileSync(bundled, DATA_FILE);
  console.log(`Seeded courses into ${DATA_FILE}`);
}
seedCoursesIfEmpty();

const getCourses = () => readJsonFile(DATA_FILE);
const saveCourses = (courses: any) => writeJsonFile(DATA_FILE, courses);

// Postgres when DATABASE_URL is set, files otherwise. Assigned in start().
let leadStore: LeadStore;
let analyticsStore: AnalyticsStore;

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  const token = req.cookies.admin_token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    jwt.verify(token, SIGNING_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * Minimal in-memory throttle. Enough to stop a script hammering the public
 * endpoints; it resets on restart, which is fine for this scale.
 */
function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();

  return (req: any, res: any, next: any) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde um instante." });
    }

    recent.push(now);
    hits.set(key, recent);

    // Opportunistic cleanup so the map doesn't grow without bound.
    if (hits.size > 5000) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }
    next();
  };
}

// API Routes
app.post("/api/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), (req, res) => {
  const { username, password } = req.body || {};

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ role: "admin" }, SIGNING_SECRET, { expiresIn: "1d" });
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.json({ success: true });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("admin_token");
  res.json({ success: true });
});

// Admin routes (protected)
app.get("/api/admin/courses", requireAuth, (req, res) => {
  res.json(getCourses());
});

app.post("/api/admin/courses", requireAuth, (req, res) => {
  const courses = getCourses();
  const newCourse = req.body;
  if (!newCourse?.slug) {
    return res.status(400).json({ error: "O curso precisa de um slug" });
  }
  if (courses.some((c: any) => c.slug === newCourse.slug)) {
    return res.status(409).json({ error: "Já existe um curso com esse slug" });
  }
  courses.push(newCourse);
  saveCourses(courses);
  res.json(newCourse);
});

/**
 * Reordena os cursos. O corpo traz todos os slugs na ordem desejada; a ordem
 * do array em courses.json é a ordem que a home usa, então basta reescrevê-lo.
 * Caminho próprio (não /courses/order) para não colidir com :slug.
 */
app.put("/api/admin/course-order", requireAuth, (req, res) => {
  const { slugs } = req.body || {};
  if (!Array.isArray(slugs)) {
    return res.status(400).json({ error: "Envie a lista de slugs na nova ordem" });
  }

  const courses = getCourses();
  const porSlug = new Map(courses.map((c: any) => [c.slug, c]));
  const ordenados = slugs.map((s: any) => porSlug.get(String(s))).filter(Boolean);

  // Um curso criado em outra aba não pode sumir por não estar na lista enviada.
  const faltantes = courses.filter((c: any) => !slugs.includes(c.slug));
  if (ordenados.length + faltantes.length !== courses.length) {
    return res.status(400).json({ error: "Lista de ordem inválida" });
  }

  saveCourses([...ordenados, ...faltantes]);
  res.json({ success: true });
});

app.put("/api/admin/courses/:slug", requireAuth, (req, res) => {
  const courses = getCourses();
  const index = courses.findIndex((c: any) => c.slug === req.params.slug);
  if (index === -1) {
    return res.status(404).json({ error: "Course not found" });
  }
  courses[index] = req.body;
  saveCourses(courses);
  res.json(courses[index]);
});

app.delete("/api/admin/courses/:slug", requireAuth, (req, res) => {
  const courses = getCourses().filter((c: any) => c.slug !== req.params.slug);
  saveCourses(courses);
  res.json({ success: true });
});

/**
 * Accepted image types, each with the magic bytes that actually prove it. The
 * declared Content-Type is not trusted on its own: a file that merely claims to
 * be a PNG would otherwise end up served from our own origin.
 */
const IMAGE_TYPES: { mime: string; ext: string; matches: (b: Buffer) => boolean }[] = [
  { mime: "image/png", ext: "png", matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: "jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", matches: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { mime: "image/gif", ext: "gif", matches: (b) => b.subarray(0, 6).toString() === "GIF87a" || b.subarray(0, 6).toString() === "GIF89a" },
];

// Upload a course cover image. SVG is deliberately not accepted: it can carry
// scripts and would run on our own origin.
app.post("/api/admin/uploads", requireAuth, (req, res) => {
  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length < 12) {
    return res.status(400).json({ error: "Envie um arquivo de imagem (PNG, JPG, WEBP ou GIF)." });
  }

  const type = IMAGE_TYPES.find((t) => t.matches(body));
  if (!type) {
    return res.status(415).json({ error: "Formato não suportado. Use PNG, JPG, WEBP ou GIF." });
  }

  // The name is generated here, so nothing the client sends can steer the path.
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}.${type.ext}`;
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, name), body);

  res.json({ url: `/uploads/${name}` });
});

app.get("/api/admin/leads", requireAuth, async (req, res, next) => {
  try {
    const leads = await leadStore.list();

    // Anexa o rastro anônimo de cada contato, para você saber o que a pessoa
    // leu antes de chamar no WhatsApp. Limitado aos mais recentes: é a fila de
    // trabalho, e buscar o histórico de milhares de leads de uma vez não paga.
    const ids = [...new Set(leads.slice(0, 200).map((l) => l.visitorId).filter(Boolean))];
    let historico = new Map();
    try {
      historico = historicoPorVisitante(await analyticsStore.byVisitors(ids), getCourses());
    } catch (err) {
      // O histórico é um extra: se falhar, a lista de contatos ainda serve.
      console.error("Failed to load lead history:", err);
    }

    res.json(
      leads.map((l) => ({
        ...l,
        historico: (l.visitorId && historico.get(l.visitorId)) || null,
      }))
    );
  } catch (err) {
    next(err);
  }
});

app.delete("/api/admin/leads", requireAuth, async (req, res, next) => {
  // `ids` is what the admin sends now; `timestamps` stays accepted so rows
  // captured before ids existed can still be removed.
  const { ids, timestamps } = req.body || {};
  const keys = Array.isArray(ids) ? ids : timestamps;
  if (!Array.isArray(keys)) {
    return res.status(400).json({ error: "Invalid data" });
  }
  try {
    await leadStore.remove(keys.map(String));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Public courses list route
app.get("/api/courses", (req, res) => {
  const list = getCourses().map((c: any) => ({
    slug: c.slug,
    courseName: c.courseName,
    description: c.description,
    image: c.image || "",
    category: c.category || "",
    moduleCount: c.modules?.length || 0,
  }));
  res.json(list);
});

// Public course route
app.get("/api/courses/:slug", (req, res) => {
  const course = getCourses().find((c: any) => c.slug === req.params.slug);
  if (course) {
    res.json(course);
  } else {
    res.status(404).json({ error: "Course not found" });
  }
});

const str = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

// Public lead route. Only known fields are persisted — the body is never spread
// into the stored record.
app.post("/api/leads", rateLimit({ windowMs: 10 * 60 * 1000, max: 15 }), async (req, res, next) => {
  const body = req.body || {};
  const name = str(body.name, 120);

  if (name.length < 2) {
    return res.status(400).json({ error: "Informe um nome" });
  }

  try {
    await leadStore.add({
      // Liga o contato ao rastro anônimo daquele navegador.
      visitorId: str(body.visitorId, 64),
      name,
      phone: str(body.phone, 40),
      message: str(body.message, 2000),
      courseSlug: str(body.courseSlug, 120),
      moduleTitle: str(body.moduleTitle, 160),
      utmSource: str(body.utmSource, 80),
      utmMedium: str(body.utmMedium, 80),
      utmCampaign: str(body.utmCampaign, 120),
      utmContent: str(body.utmContent, 120),
      referrer: str(body.referrer, 300),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

const EVENT_TYPES: EventType[] = ["course_view", "module_view", "course_complete"];

/**
 * Anonymous access tracking. Open to everyone — this is what makes the numbers
 * cover visitors who never register. The visitor id is generated in the browser
 * and means nothing outside these counts.
 *
 * The limit is generous because one reader legitimately fires one event per
 * module, plus the course view.
 */
app.post("/api/events", rateLimit({ windowMs: 10 * 60 * 1000, max: 200 }), async (req, res) => {
  const body = req.body || {};
  const type = str(body.type, 32) as EventType;

  // Never fail the page over tracking: answer 204 either way.
  if (!EVENT_TYPES.includes(type)) return res.status(204).end();

  const visitorId = str(body.visitorId, 64);
  if (!visitorId) return res.status(204).end();

  const rawIndex = Number(body.moduleIndex);
  const moduleIndex = Number.isInteger(rawIndex) && rawIndex >= 0 && rawIndex < 500 ? rawIndex : null;

  try {
    await analyticsStore.add({
      visitorId,
      type,
      courseSlug: str(body.courseSlug, 120),
      moduleIndex,
      moduleTitle: str(body.moduleTitle, 160),
      utmSource: str(body.utmSource, 80),
      utmMedium: str(body.utmMedium, 80),
      utmCampaign: str(body.utmCampaign, 120),
      utmContent: str(body.utmContent, 120),
      referrer: str(body.referrer, 300),
    });
  } catch (err) {
    console.error("Failed to record event:", err);
  }
  res.status(204).end();
});

/** Parses YYYY-MM-DD as a UTC day, falling back to `fallback`. */
function parseDay(value: unknown, fallback: Date): Date {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

/**
 * Intervalo pedido na query, em UTC. O `to` da query é o último dia que a
 * pessoa quer ver, então o fim devolvido é exclusivo (o dia seguinte).
 * Devolve from nulo quando o intervalo está invertido.
 */
function intervalo(qFrom: unknown, qTo: unknown): { from: Date | null; to: Date | null } {
  const hoje = new Date();
  const padraoTo = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  padraoTo.setUTCDate(padraoTo.getUTCDate() + 1);
  const padraoFrom = new Date(padraoTo);
  padraoFrom.setUTCDate(padraoFrom.getUTCDate() - 30);

  const from = parseDay(qFrom, padraoFrom);
  let to = parseDay(qTo, padraoTo);
  if (typeof qTo === "string") {
    to = new Date(to);
    to.setUTCDate(to.getUTCDate() + 1);
  }

  if (to <= from) return { from: null, to: null };
  return { from, to };
}

app.get("/api/admin/stats", requireAuth, async (req, res, next) => {
  try {
    const { from, to } = intervalo(req.query.from, req.query.to);
    if (!from || !to) return res.status(400).json({ error: "Intervalo de datas inválido" });

    const [events, leads] = await Promise.all([
      analyticsStore.range(from, to),
      leadStore.list(),
    ]);

    // Leads live in their own table; fold them in as events so the dashboard
    // shows captures on the same timeline as the accesses.
    const leadEvents = leads
      .filter((l) => {
        const when = new Date(l.timestamp);
        return when >= from && when < to;
      })
      .map((l) => ({
        visitorId: `lead:${l.id}`,
        type: "lead" as EventType,
        courseSlug: l.courseSlug,
        moduleIndex: null,
        moduleTitle: l.moduleTitle,
        utmSource: l.utmSource,
        utmMedium: l.utmMedium,
        utmCampaign: l.utmCampaign,
        utmContent: l.utmContent,
        referrer: l.referrer,
        timestamp: l.timestamp,
      }));

    const merged = [...events, ...leadEvents].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    res.json(summarise(merged, getCourses(), from, to));
  } catch (err) {
    next(err);
  }
});

/**
 * Visitantes um por um, inclusive quem nunca deixou contato. Cada linha é um
 * navegador anônimo num curso; quando aquele navegador virou lead, o contato
 * vem junto para você ver o histórico antes de chamar.
 */
app.get("/api/admin/visitors", requireAuth, async (req, res, next) => {
  try {
    const { from, to } = intervalo(req.query.from, req.query.to);
    if (!from) return res.status(400).json({ error: "Intervalo de datas inválido" });

    const [events, leads] = await Promise.all([
      analyticsStore.range(from, to!),
      leadStore.list(),
    ]);

    const leadPorVisitante = new Map<string, any>();
    for (const l of leads) {
      // Um navegador pode ter deixado contato mais de uma vez; o primeiro da
      // lista (mais recente) é o que interessa.
      if (l.visitorId && !leadPorVisitante.has(l.visitorId)) leadPorVisitante.set(l.visitorId, l);
    }

    const visitas = listaVisitas(events, getCourses()).map((v) => {
      const lead = leadPorVisitante.get(v.visitorId);
      return {
        ...v,
        lead: lead ? { id: lead.id, name: lead.name, phone: lead.phone } : null,
      };
    });

    res.json({ visitas, total: visitas.length });
  } catch (err) {
    next(err);
  }
});

/** Escape text before it goes inside an HTML attribute in the meta tags. */
function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Public address of the site, used to turn an uploaded cover into the absolute
 * URL that WhatsApp and Instagram need. Without it we fall back to the request
 * headers, which is wrong behind a proxy that terminates HTTPS.
 */
const PUBLIC_URL = process.env.PUBLIC_URL?.replace(/\/+$/, "");

const DEFAULT_OG_IMAGE =
  process.env.DEFAULT_OG_IMAGE ||
  "https://www.virgulacontabil.com.br/wp-content/uploads/2026/07/icon-192.png";

// Vite middleware for development
async function setupVite() {
  // Uploaded covers live in DATA_DIR, outside the build, so they survive a
  // redeploy along with the rest of the data.
  app.use(
    "/uploads",
    express.static(UPLOADS_DIR, {
      maxAge: "30d",
      index: false,
      dotfiles: "deny",
setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
    })
  );

  let vite: any;
  if (!IS_PROD) {
    vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "custom", // Use custom so Vite doesn't serve the HTML itself
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve static assets, but skip index.html so our catch-all below can handle it
    app.use(express.static(distPath, { index: false }));
  }

  // Catch-all route to serve index.html with injected SEO tags
  app.use("*", async (req, res, next) => {
    // Skip API routes and static files with extensions
    if (req.originalUrl.startsWith("/api/") || req.originalUrl.match(/\.[a-zA-Z0-9]+$/)) {
      return next();
    }

    try {
      let template;

      if (!IS_PROD) {
        template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        template = fs.readFileSync(path.resolve(process.cwd(), "dist", "index.html"), "utf-8");
      }

      // Identify if we're on a course page (/slug)
      const urlParts = req.originalUrl.split("?")[0].split("/");
      let title = "Mini cursos gratuitos - Vírgula Contábil";
      let description =
        "Cursos curtos e gratuitos sobre contabilidade e tributação para quem tem empresa. Sem cadastro, direto ao ponto.";
      let ogImage = DEFAULT_OG_IMAGE;

      if (urlParts.length >= 2 && urlParts[1] && urlParts[1] !== "admin") {
        const slug = urlParts[1];
        const course = getCourses().find((c: any) => c.slug === slug);
        if (course) {
          title = `${course.courseName} - Vírgula Contábil`;
          if (course.description) {
            description = course.description;
          }
          // Courses can carry their own 1200x630 share image; otherwise the
          // uploaded cover doubles as the link preview.
          const courseImage = course.ogImage || course.image;
          if (courseImage) {
            // og:image has to be absolute for WhatsApp and Instagram to fetch it.
            ogImage = /^https?:\/\//.test(courseImage)
              ? courseImage
              : `${PUBLIC_URL || `${req.protocol}://${req.get("host")}`}${courseImage}`;
          }
        }
      }

      const safeTitle = escapeHtml(title);
      const safeDescription = escapeHtml(description);
      const safeImage = escapeHtml(ogImage);

      const metaTags = `
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="pt_BR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImage}" />
      `;

      // Replace the placeholder title, or fall back to injecting before </head>
      // if the built HTML no longer carries one.
      if (/<title>.*?<\/title>/.test(template)) {
        template = template.replace(/<title>.*?<\/title>/, metaTags);
      } else {
        template = template.replace("</head>", `${metaTags}\n  </head>`);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e: any) {
      if (vite) {
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Lead storage: ${leadStore.kind}`);
  });
}

async function start() {
  try {
    leadStore = await createLeadStore({
      databaseUrl: process.env.DATABASE_URL,
      file: LEADS_FILE,
    });
    analyticsStore = await createAnalyticsStore({
      databaseUrl: process.env.DATABASE_URL,
      file: EVENTS_FILE,
    });
  } catch (err) {
    // Coming up without lead storage would silently drop every capture.
    console.error("Failed to initialise lead storage:", err);
    process.exit(1);
  }
  await setupVite();
}

start();
