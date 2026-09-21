import fs from "fs";
import path from "path";
import { Pool } from "pg";

/**
 * Leads are stored in Postgres when DATABASE_URL is set, and in a JSON file
 * otherwise. The file backend keeps local development (and the current
 * deploy) working with no database; switching is a matter of setting the
 * environment variable and running the one-off import below.
 */

export type Lead = {
  id: string;
  /**
   * Id anônimo do navegador que virou este contato. Liga o lead ao rastro de
   * acessos dele, para você ver o histórico antes de chamar no WhatsApp.
   * Vazio nos leads capturados antes desta coluna existir.
   */
  visitorId: string;
  name: string;
  phone: string;
  message: string;
  courseSlug: string;
  moduleTitle: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  referrer: string;
  timestamp: string;
};

export type NewLead = Omit<Lead, "id" | "timestamp">;

export interface LeadStore {
  /** Newest first — the admin list is a work queue for manual follow-up. */
  list(): Promise<Lead[]>;
  add(lead: NewLead): Promise<Lead>;
  /** Accepts ids and, for rows created before ids existed, timestamps. */
  remove(keys: string[]): Promise<void>;
  readonly kind: "postgres" | "file";
}

const COLUMNS = `id, visitor_id, name, phone, message, course_slug, module_title,
  utm_source, utm_medium, utm_campaign, utm_content, referrer, created_at`;

function rowToLead(row: any): Lead {
  return {
    id: String(row.id),
    visitorId: row.visitor_id ?? "",
    name: row.name ?? "",
    phone: row.phone ?? "",
    message: row.message ?? "",
    courseSlug: row.course_slug ?? "",
    moduleTitle: row.module_title ?? "",
    utmSource: row.utm_source ?? "",
    utmMedium: row.utm_medium ?? "",
    utmCampaign: row.utm_campaign ?? "",
    utmContent: row.utm_content ?? "",
    referrer: row.referrer ?? "",
    timestamp: new Date(row.created_at).toISOString(),
  };
}

class PostgresLeadStore implements LeadStore {
  readonly kind = "postgres" as const;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      // Most managed Postgres providers terminate TLS with their own CA.
      ssl: /\bsslmode=disable\b/.test(connectionString)
        ? false
        : { rejectUnauthorized: false },
      max: 5,
    });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id            BIGSERIAL PRIMARY KEY,
        visitor_id    TEXT,
        name          TEXT NOT NULL,
        phone         TEXT,
        message       TEXT,
        course_slug   TEXT,
        module_title  TEXT,
        utm_source    TEXT,
        utm_medium    TEXT,
        utm_campaign  TEXT,
        utm_content   TEXT,
        referrer      TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    // Bancos criados antes desta coluna precisam ganhá-la sem perder os dados.
    await this.pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS visitor_id TEXT`);
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC)`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS leads_visitor_idx ON leads (visitor_id)`
    );
  }

  async list(): Promise<Lead[]> {
    const res = await this.pool.query(
      `SELECT ${COLUMNS} FROM leads ORDER BY created_at DESC, id DESC LIMIT 5000`
    );
    return res.rows.map(rowToLead);
  }

  /** `createdAt` is only passed by the import, to keep the original dates. */
  async add(lead: NewLead, createdAt?: string): Promise<Lead> {
    const res = await this.pool.query(
      `INSERT INTO leads
         (visitor_id, name, phone, message, course_slug, module_title,
          utm_source, utm_medium, utm_campaign, utm_content, referrer, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, COALESCE($12::timestamptz, now()))
       RETURNING ${COLUMNS}`,
      [
        lead.visitorId,
        lead.name,
        lead.phone,
        lead.message,
        lead.courseSlug,
        lead.moduleTitle,
        lead.utmSource,
        lead.utmMedium,
        lead.utmCampaign,
        lead.utmContent,
        lead.referrer,
        createdAt || null,
      ]
    );
    return rowToLead(res.rows[0]);
  }

  async remove(keys: string[]): Promise<void> {
    const ids = keys.filter((k) => /^\d+$/.test(k));
    const timestamps = keys.filter((k) => !/^\d+$/.test(k));

    if (ids.length) {
      await this.pool.query(`DELETE FROM leads WHERE id = ANY($1::bigint[])`, [ids]);
    }
    if (timestamps.length) {
      await this.pool.query(
        `DELETE FROM leads WHERE created_at = ANY($1::timestamptz[])`,
        [timestamps]
      );
    }
  }
}

class FileLeadStore implements LeadStore {
  readonly kind = "file" as const;

  constructor(private file: string) {}

  private read(): any[] {
    if (!fs.existsSync(this.file)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf-8"));
    } catch (err) {
      console.error(`Failed to parse ${this.file}:`, err);
      return [];
    }
  }

  /** Temp file + rename, so a crash mid-write can't truncate the data. */
  private write(rows: any[]) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(rows, null, 2), "utf-8");
    fs.renameSync(tmp, this.file);
  }

  async list(): Promise<Lead[]> {
    return this.read()
      .map((row) => ({
        id: String(row.id ?? row.timestamp ?? ""),
        visitorId: row.visitorId ?? "",
        name: row.name ?? "",
        phone: row.phone ?? "",
        message: row.message ?? "",
        courseSlug: row.courseSlug ?? "",
        moduleTitle: row.moduleTitle ?? "",
        utmSource: row.utmSource ?? "",
        utmMedium: row.utmMedium ?? "",
        utmCampaign: row.utmCampaign ?? "",
        utmContent: row.utmContent ?? "",
        referrer: row.referrer ?? "",
        timestamp: row.timestamp ?? "",
      }))
      .reverse();
  }

  async add(lead: NewLead): Promise<Lead> {
    const rows = this.read();
    const record: Lead = {
      ...lead,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    rows.push(record);
    this.write(rows);
    return record;
  }

  async remove(keys: string[]): Promise<void> {
    const rows = this.read().filter(
      (row: any) => !keys.includes(row.id) && !keys.includes(row.timestamp)
    );
    this.write(rows);
  }
}

export async function createLeadStore(opts: {
  databaseUrl?: string;
  file: string;
}): Promise<LeadStore> {
  if (opts.databaseUrl) {
    const store = new PostgresLeadStore(opts.databaseUrl);
    await store.init();
    return store;
  }
  return new FileLeadStore(opts.file);
}

/**
 * One-off migration: copies the leads sitting in the JSON file into Postgres.
 * Run with `npm run import-leads` after pointing DATABASE_URL at the database.
 */
export async function importFileLeadsIntoPostgres(file: string, databaseUrl: string) {
  const source = new FileLeadStore(file);
  const target = new PostgresLeadStore(databaseUrl);
  await target.init();

  // list() reverses for display; put them back in chronological order.
  const rows = (await source.list()).reverse();
  for (const row of rows) {
    const { id, timestamp, ...rest } = row;
    await target.add(rest, timestamp || undefined);
  }
  return rows.length;
}
