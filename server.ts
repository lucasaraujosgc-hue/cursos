import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";

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

const JWT_SECRET = process.env.JWT_SECRET;
if (IS_PROD && (!JWT_SECRET || JWT_SECRET.length < 16)) {
  // A fallback secret here would let anyone forge an admin cookie.
  throw new Error("JWT_SECRET must be set (16+ chars) when NODE_ENV=production");
}
if (IS_PROD && (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD)) {
  throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set when NODE_ENV=production");
}
const SIGNING_SECRET = JWT_SECRET || "dev-only-insecure-secret";

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
const getLeads = () => readJsonFile(LEADS_FILE);
const saveLeads = (leads: any) => writeJsonFile(LEADS_FILE, leads);

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

app.get("/api/admin/leads", requireAuth, (req, res) => {
  // Newest first — the list is a work queue for manual follow-up.
  const leads = getLeads().slice().reverse();
  res.json(leads);
});

app.delete("/api/admin/leads", requireAuth, (req, res) => {
  const { timestamps } = req.body || {};
  if (!Array.isArray(timestamps)) {
    return res.status(400).json({ error: "Invalid data" });
  }
  const leads = getLeads().filter((lead: any) => !timestamps.includes(lead.timestamp));
  saveLeads(leads);
  res.json({ success: true });
});

// Public courses list route
app.get("/api/courses", (req, res) => {
  const list = getCourses().map((c: any) => ({
    slug: c.slug,
    courseName: c.courseName,
    description: c.description,
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
app.post("/api/leads", rateLimit({ windowMs: 10 * 60 * 1000, max: 15 }), (req, res) => {
  const body = req.body || {};
  const name = str(body.name, 120);

  if (name.length < 2) {
    return res.status(400).json({ error: "Informe um nome" });
  }

  const newLead = {
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
    timestamp: new Date().toISOString(),
  };

  const leads = getLeads();
  leads.push(newLead);
  saveLeads(leads);
  res.json({ success: true });
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

const DEFAULT_OG_IMAGE =
  process.env.DEFAULT_OG_IMAGE ||
  "https://www.virgulacontabil.com.br/wp-content/uploads/2026/07/icon-192.png";

// Vite middleware for development
async function setupVite() {
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
          // Courses can carry their own 1200x630 share image.
          if (course.ogImage) {
            ogImage = course.ogImage;
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
  });
}

setupVite();
