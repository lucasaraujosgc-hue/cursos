/**
 * Copia os leads do arquivo JSON para o Postgres, preservando as datas.
 *
 *   DATABASE_URL=postgres://... npm run import-leads
 *
 * Pode ser rodado mais de uma vez, mas cada execução insere tudo de novo —
 * rode uma vez só, ou limpe a tabela antes de repetir.
 */
import path from "path";
import * as dotenv from "dotenv";
import { importFileLeadsIntoPostgres } from "./lead-store";

dotenv.config();

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL não está definida.");
  process.exit(1);
}

importFileLeadsIntoPostgres(LEADS_FILE, databaseUrl)
  .then((count) => {
    console.log(`${count} lead(s) importado(s) de ${LEADS_FILE} para o Postgres.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Falha na importação:", err);
    process.exit(1);
  });
