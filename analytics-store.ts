import fs from "fs";
import path from "path";
import { Pool } from "pg";

/**
 * Anonymous access tracking. Every visitor is counted, registered or not: the
 * browser generates a random visitor id and keeps it in localStorage. No name,
 * no phone, no IP is stored — the id is only used to tell one browser from
 * another when counting "unique" figures.
 *
 * Same split as the leads: Postgres when DATABASE_URL is set, JSON file
 * otherwise.
 */

export type EventType = "course_view" | "module_view" | "course_complete" | "lead";

export type NewEvent = {
  visitorId: string;
  type: EventType;
  courseSlug: string;
  moduleIndex: number | null;
  moduleTitle: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  referrer: string;
};

export type StoredEvent = NewEvent & { timestamp: string };

export interface AnalyticsStore {
  add(event: NewEvent): Promise<void>;
  /** Events inside the range, oldest first. `to` is exclusive. */
  range(from: Date, to: Date): Promise<StoredEvent[]>;
  /** Todos os eventos destes navegadores, sem recorte de data. */
  byVisitors(ids: string[]): Promise<StoredEvent[]>;
  readonly kind: "postgres" | "file";
}

/** Events are high-volume; a range query is capped so one call can't blow memory. */
const MAX_ROWS = 200_000;

function rowToEvent(row: any): StoredEvent {
  return {
    visitorId: row.visitor_id ?? "",
    type: row.type,
    courseSlug: row.course_slug ?? "",
    moduleIndex: row.module_index === null || row.module_index === undefined ? null : Number(row.module_index),
    moduleTitle: row.module_title ?? "",
    utmSource: row.utm_source ?? "",
    utmMedium: row.utm_medium ?? "",
    utmCampaign: row.utm_campaign ?? "",
    utmContent: row.utm_content ?? "",
    referrer: row.referrer ?? "",
    timestamp: new Date(row.created_at).toISOString(),
  };
}

class PostgresAnalyticsStore implements AnalyticsStore {
  readonly kind = "postgres" as const;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: /\bsslmode=disable\b/.test(connectionString) ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS course_events (
        id           BIGSERIAL PRIMARY KEY,
        visitor_id   TEXT NOT NULL,
        type         TEXT NOT NULL,
        course_slug  TEXT,
        module_index INTEGER,
        module_title TEXT,
        utm_source   TEXT,
        utm_medium   TEXT,
        utm_campaign TEXT,
        utm_content  TEXT,
        referrer     TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS course_events_created_at_idx ON course_events (created_at)`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS course_events_slug_idx ON course_events (course_slug, created_at)`
    );
    // Usado ao montar o histórico de um lead a partir do id do navegador dele.
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS course_events_visitor_idx ON course_events (visitor_id)`
    );
  }

  async add(event: NewEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO course_events
         (visitor_id, type, course_slug, module_index, module_title,
          utm_source, utm_medium, utm_campaign, utm_content, referrer)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        event.visitorId,
        event.type,
        event.courseSlug,
        event.moduleIndex,
        event.moduleTitle,
        event.utmSource,
        event.utmMedium,
        event.utmCampaign,
        event.utmContent,
        event.referrer,
      ]
    );
  }

  async range(from: Date, to: Date): Promise<StoredEvent[]> {
    const res = await this.pool.query(
      `SELECT visitor_id, type, course_slug, module_index, module_title,
              utm_source, utm_medium, utm_campaign, utm_content, referrer, created_at
         FROM course_events
        WHERE created_at >= $1 AND created_at < $2
        ORDER BY created_at
        LIMIT ${MAX_ROWS}`,
      [from.toISOString(), to.toISOString()]
    );
    return res.rows.map(rowToEvent);
  }

  async byVisitors(ids: string[]): Promise<StoredEvent[]> {
    if (!ids.length) return [];
    const res = await this.pool.query(
      `SELECT visitor_id, type, course_slug, module_index, module_title,
              utm_source, utm_medium, utm_campaign, utm_content, referrer, created_at
         FROM course_events
        WHERE visitor_id = ANY($1::text[])
        ORDER BY created_at
        LIMIT ${MAX_ROWS}`,
      [ids]
    );
    return res.rows.map(rowToEvent);
  }
}

/**
 * File backend. Events are appended as one JSON object per line (JSONL), so a
 * write never rewrites the whole file — which matters here, because events are
 * far more frequent than leads.
 */
class FileAnalyticsStore implements AnalyticsStore {
  readonly kind = "file" as const;

  constructor(private file: string) {}

  async add(event: NewEvent): Promise<void> {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const record: StoredEvent = { ...event, timestamp: new Date().toISOString() };
    fs.appendFileSync(this.file, JSON.stringify(record) + "\n", "utf-8");
  }

  async range(from: Date, to: Date): Promise<StoredEvent[]> {
    if (!fs.existsSync(this.file)) return [];
    const out: StoredEvent[] = [];
    const lines = fs.readFileSync(this.file, "utf-8").split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as StoredEvent;
        const when = new Date(row.timestamp);
        if (when >= from && when < to) out.push(row);
      } catch {
        // A half-written last line is possible after a crash; skip it.
      }
      if (out.length >= MAX_ROWS) break;
    }
    out.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return out;
  }

  async byVisitors(ids: string[]): Promise<StoredEvent[]> {
    if (!ids.length || !fs.existsSync(this.file)) return [];
    const procurados = new Set(ids);
    const out: StoredEvent[] = [];
    for (const line of fs.readFileSync(this.file, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as StoredEvent;
        if (procurados.has(row.visitorId)) out.push(row);
      } catch {
        // linha pela metade após um crash
      }
      if (out.length >= MAX_ROWS) break;
    }
    out.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return out;
  }
}

export async function createAnalyticsStore(opts: {
  databaseUrl?: string;
  file: string;
}): Promise<AnalyticsStore> {
  if (opts.databaseUrl) {
    const store = new PostgresAnalyticsStore(opts.databaseUrl);
    await store.init();
    return store;
  }
  return new FileAnalyticsStore(opts.file);
}

/* ------------------------------------------------------------------ */
/* Aggregation                                                         */
/* ------------------------------------------------------------------ */

export type CourseStats = {
  slug: string;
  courseName: string;
  /** Times the course was opened. */
  views: number;
  /** Distinct browsers that opened it. */
  visitors: number;
  /** Distinct browsers that reached the last module. */
  completions: number;
  completionRate: number;
  /** Average module index reached, 1-based, among visitors of this course. */
  averageDepth: number;
  /** Per module: how many distinct visitors got that far. */
  funnel: { index: number; title: string; visitors: number; pctOfStart: number }[];
  /** Leads captured on this course inside the range. */
  leads: number;
};

export type Stats = {
  from: string;
  to: string;
  totals: {
    views: number;
    visitors: number;
    completions: number;
    leads: number;
    moduleViews: number;
  };
  daily: { date: string; views: number; visitors: number; completions: number; leads: number }[];
  courses: CourseStats[];
  sources: { source: string; views: number; visitors: number; leads: number }[];
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/* ------------------------------------------------------------------ */
/* Visitantes, um por um                                               */
/* ------------------------------------------------------------------ */

export type Visita = {
  visitorId: string;
  courseSlug: string;
  courseName: string;
  primeiroAcesso: string;
  ultimoAcesso: string;
  /** Quantas vezes esse navegador abriu este curso no período. */
  acessos: number;
  /** Índice do módulo mais fundo alcançado; -1 quando só abriu a capa. */
  moduloIndice: number;
  moduloTitulo: string;
  totalModulos: number;
  concluiu: boolean;
  utmSource: string;
  utmCampaign: string;
  utmContent: string;
  referrer: string;
};

/**
 * Uma linha por navegador e curso, para ver quem abriu e não deixou contato —
 * o grupo que nunca aparece na aba de leads. Os ids são anônimos: não há nome,
 * telefone nem IP, só o número aleatório que o navegador guardou.
 */
export function listaVisitas(
  events: StoredEvent[],
  courses: { slug: string; courseName: string; modules: { shortTitle: string }[] }[],
  limite = 500
): Visita[] {
  const porCurso = new Map(courses.map((c) => [c.slug, c]));
  const visitas = new Map<string, Visita>();

  for (const ev of events) {
    if (!ev.visitorId || ev.type === "lead") continue;
    const chave = `${ev.visitorId}|${ev.courseSlug}`;

    let visita = visitas.get(chave);
    if (!visita) {
      const curso = porCurso.get(ev.courseSlug);
      visita = {
        visitorId: ev.visitorId,
        courseSlug: ev.courseSlug,
        courseName: curso?.courseName || ev.courseSlug || "(curso removido)",
        primeiroAcesso: ev.timestamp,
        ultimoAcesso: ev.timestamp,
        acessos: 0,
        moduloIndice: -1,
        moduloTitulo: "",
        totalModulos: curso?.modules?.length || 0,
        concluiu: false,
        // A atribuição fica a do primeiro evento: é a origem que trouxe a pessoa.
        utmSource: ev.utmSource || "direto",
        utmCampaign: ev.utmCampaign,
        utmContent: ev.utmContent,
        referrer: ev.referrer,
      };
      visitas.set(chave, visita);
    }

    if (ev.timestamp < visita.primeiroAcesso) visita.primeiroAcesso = ev.timestamp;
    if (ev.timestamp > visita.ultimoAcesso) visita.ultimoAcesso = ev.timestamp;

    if (ev.type === "course_view") visita.acessos++;
    if (ev.type === "course_complete") visita.concluiu = true;
    if (ev.type === "module_view" && ev.moduleIndex !== null && ev.moduleIndex > visita.moduloIndice) {
      visita.moduloIndice = ev.moduleIndex;
      visita.moduloTitulo = ev.moduleTitle;
    }
  }

  return [...visitas.values()]
    .sort((a, b) => b.ultimoAcesso.localeCompare(a.ultimoAcesso))
    .slice(0, limite);
}

/**
 * Turns raw events into everything the dashboard shows. Done in JS for both
 * backends so the two never drift apart in how a number is defined.
 */
export function summarise(
  events: StoredEvent[],
  courses: { slug: string; courseName: string; modules: { shortTitle: string }[] }[],
  from: Date,
  to: Date
): Stats {
  const dayKey = (iso: string) => iso.slice(0, 10);

  const totals = { views: 0, visitors: 0, completions: 0, leads: 0, moduleViews: 0 };
  const allVisitors = new Set<string>();

  const daily = new Map<string, { views: number; visitors: Set<string>; completions: number; leads: number }>();
  // Pre-fill every day in the range, so a quiet day shows as zero instead of a gap.
  for (let d = new Date(from); d < to; d.setUTCDate(d.getUTCDate() + 1)) {
    daily.set(d.toISOString().slice(0, 10), { views: 0, visitors: new Set(), completions: 0, leads: 0 });
  }

  const perCourse = new Map<string, {
    views: number;
    visitors: Set<string>;
    completions: Set<string>;
    leads: number;
    /** module index -> visitors that reached it */
    moduleVisitors: Map<number, Set<string>>;
    /** visitor -> deepest module index reached */
    depth: Map<string, number>;
  }>();

  const ensureCourse = (slug: string) => {
    let entry = perCourse.get(slug);
    if (!entry) {
      entry = {
        views: 0,
        visitors: new Set(),
        completions: new Set(),
        leads: 0,
        moduleVisitors: new Map(),
        depth: new Map(),
      };
      perCourse.set(slug, entry);
    }
    return entry;
  };

  const sources = new Map<string, { views: number; visitors: Set<string>; leads: number }>();
  const ensureSource = (name: string) => {
    let entry = sources.get(name);
    if (!entry) {
      entry = { views: 0, visitors: new Set(), leads: 0 };
      sources.set(name, entry);
    }
    return entry;
  };

  for (const ev of events) {
    const day = daily.get(dayKey(ev.timestamp));
    const course = ensureCourse(ev.courseSlug);
    // An empty utm_source is direct traffic (link in bio, typed, shared).
    const source = ensureSource(ev.utmSource || "direto");

    // Leads are folded into this stream with a synthetic id so they land on the
    // same timeline; they are not browsers, so they never count as visitors.
    if (ev.visitorId && ev.type !== "lead") allVisitors.add(ev.visitorId);

    switch (ev.type) {
      case "course_view":
        totals.views++;
        course.views++;
        course.visitors.add(ev.visitorId);
        source.views++;
        source.visitors.add(ev.visitorId);
        if (day) {
          day.views++;
          day.visitors.add(ev.visitorId);
        }
        break;

      case "module_view": {
        totals.moduleViews++;
        if (ev.moduleIndex === null) break;
        let reached = course.moduleVisitors.get(ev.moduleIndex);
        if (!reached) {
          reached = new Set();
          course.moduleVisitors.set(ev.moduleIndex, reached);
        }
        reached.add(ev.visitorId);
        const best = course.depth.get(ev.visitorId) ?? -1;
        if (ev.moduleIndex > best) course.depth.set(ev.visitorId, ev.moduleIndex);
        break;
      }

      case "course_complete":
        course.completions.add(ev.visitorId);
        if (day) day.completions++;
        break;

      case "lead":
        totals.leads++;
        course.leads++;
        source.leads++;
        if (day) day.leads++;
        break;
    }
  }

  totals.visitors = allVisitors.size;
  totals.completions = [...perCourse.values()].reduce((sum, c) => sum + c.completions.size, 0);

  const courseStats: CourseStats[] = courses.map((definition) => {
    const entry = perCourse.get(definition.slug);
    const modules = definition.modules || [];

    if (!entry) {
      return {
        slug: definition.slug,
        courseName: definition.courseName,
        views: 0,
        visitors: 0,
        completions: 0,
        completionRate: 0,
        averageDepth: 0,
        leads: 0,
        funnel: modules.map((m, i) => ({
          index: i,
          title: m.shortTitle,
          visitors: 0,
          pctOfStart: 0,
        })),
      };
    }

    const firstModuleVisitors = entry.moduleVisitors.get(0)?.size ?? entry.visitors.size;
    const depths = [...entry.depth.values()];

    return {
      slug: definition.slug,
      courseName: definition.courseName,
      views: entry.views,
      visitors: entry.visitors.size,
      completions: entry.completions.size,
      completionRate: pct(entry.completions.size, entry.visitors.size),
      averageDepth: depths.length
        ? Math.round((depths.reduce((a, b) => a + b + 1, 0) / depths.length) * 10) / 10
        : 0,
      leads: entry.leads,
      funnel: modules.map((m, i) => {
        const reached = entry.moduleVisitors.get(i)?.size ?? 0;
        return {
          index: i,
          title: m.shortTitle,
          visitors: reached,
          pctOfStart: pct(reached, firstModuleVisitors),
        };
      }),
    };
  });

  // Courses that were deleted but still have events shouldn't disappear silently.
  for (const [slug, entry] of perCourse) {
    if (slug && !courses.some((c) => c.slug === slug)) {
      courseStats.push({
        slug,
        courseName: `${slug} (curso removido)`,
        views: entry.views,
        visitors: entry.visitors.size,
        completions: entry.completions.size,
        completionRate: pct(entry.completions.size, entry.visitors.size),
        averageDepth: 0,
        leads: entry.leads,
        funnel: [],
      });
    }
  }

  courseStats.sort((a, b) => b.views - a.views);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    totals,
    daily: [...daily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        views: d.views,
        visitors: d.visitors.size,
        completions: d.completions,
        leads: d.leads,
      })),
    courses: courseStats,
    sources: [...sources.entries()]
      .map(([source, s]) => ({ source, views: s.views, visitors: s.visitors.size, leads: s.leads }))
      .filter((s) => s.views > 0 || s.leads > 0)
      .sort((a, b) => b.views - a.views),
  };
}


export type HistoricoVisitante = {
  /** Cursos que este navegador abriu, do mais recente para o mais antigo. */
  cursos: { courseSlug: string; moduloIndice: number; totalModulos: number; concluiu: boolean }[];
  visitas: number;
  primeiroAcesso: string;
  ultimoAcesso: string;
};

/** Resume, por navegador, o que ele leu — para mostrar junto do lead. */
export function historicoPorVisitante(
  events: StoredEvent[],
  courses: { slug: string; modules: { shortTitle: string }[] }[]
): Map<string, HistoricoVisitante> {
  const totalPorSlug = new Map(courses.map((c) => [c.slug, c.modules?.length || 0]));
  const porVisitante = new Map<string, HistoricoVisitante>();
  const fundo = new Map<string, Map<string, { indice: number; concluiu: boolean; quando: string }>>();

  for (const ev of events) {
    if (!ev.visitorId) continue;

    let h = porVisitante.get(ev.visitorId);
    if (!h) {
      h = { cursos: [], visitas: 0, primeiroAcesso: ev.timestamp, ultimoAcesso: ev.timestamp };
      porVisitante.set(ev.visitorId, h);
      fundo.set(ev.visitorId, new Map());
    }
    if (ev.timestamp < h.primeiroAcesso) h.primeiroAcesso = ev.timestamp;
    if (ev.timestamp > h.ultimoAcesso) h.ultimoAcesso = ev.timestamp;
    if (ev.type === "course_view") h.visitas++;

    const cursos = fundo.get(ev.visitorId)!;
    let c = cursos.get(ev.courseSlug);
    if (!c) {
      c = { indice: -1, concluiu: false, quando: ev.timestamp };
      cursos.set(ev.courseSlug, c);
    }
    if (ev.timestamp > c.quando) c.quando = ev.timestamp;
    if (ev.type === "course_complete") c.concluiu = true;
    if (ev.type === "module_view" && ev.moduleIndex !== null && ev.moduleIndex > c.indice) {
      c.indice = ev.moduleIndex;
    }
  }

  for (const [id, h] of porVisitante) {
    h.cursos = [...fundo.get(id)!.entries()]
      .sort(([, a], [, b]) => b.quando.localeCompare(a.quando))
      .map(([courseSlug, c]) => ({
        courseSlug,
        moduloIndice: c.indice,
        totalModulos: totalPorSlug.get(courseSlug) || 0,
        concluiu: c.concluiu,
      }));
  }

  return porVisitante;
}
