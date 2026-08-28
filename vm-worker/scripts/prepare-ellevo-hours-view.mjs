import sql from "mssql";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apply = process.argv.includes("--apply");
const inspect = process.argv.includes("--inspect");
const inspectSdMembers = process.argv.includes("--inspect-sd-members");
const confirmation = process.argv
  .find((argument) => argument.startsWith("--confirm-database="))
  ?.split("=")[1];
const sampleLogin = process.argv
  .find((argument) => argument.startsWith("--sample-login="))
  ?.split("=")[1];
const sampleDate = process.argv
  .find((argument) => argument.startsWith("--sample-date="))
  ?.split("=")[1];
const sampleWeekStart = process.argv
  .find((argument) => argument.startsWith("--sample-week-start="))
  ?.split("=")[1];

const server = process.env.MSSQL_HOST ?? "";
const database = process.env.MSSQL_DATABASE ?? "Siplan_AcessoIA";
const user = process.env.MSSQL_USER ?? "";
const password = process.env.MSSQL_PASSWORD || (await readPassword());
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const viewSql = fs.readFileSync(
  path.resolve(scriptDirectory, "../sql/horas_analistas_0800.sql"),
  "utf8",
);

if (!server || !user || !password) {
  fail("Informe MSSQL_HOST, MSSQL_USER e MSSQL_PASSWORD.");
}
if (apply && confirmation !== database) {
  fail(`Confirme o banco de destino com --confirm-database=${database}.`);
}

const pool = await new sql.ConnectionPool({
  server,
  port: Number(process.env.MSSQL_PORT || 1433),
  database,
  user,
  password,
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 120_000,
}).connect();

try {
  const target = await pool.request().query(
    "SELECT DB_NAME() AS database_name, SUSER_SNAME() AS login_name",
  );
  console.log(
    `Destino validado: ${target.recordset[0].database_name} (${target.recordset[0].login_name}).`,
  );

  if (inspect) {
    const metadata = await pool.request().query(`
      SELECT
        schema_name(o.schema_id) AS schema_name,
        o.name AS object_name,
        c.column_id,
        c.name AS column_name,
        data_type.name AS data_type
      FROM PlataformaEllevo.sys.objects o
      JOIN PlataformaEllevo.sys.columns c ON c.object_id = o.object_id
      JOIN PlataformaEllevo.sys.types data_type ON data_type.user_type_id = c.user_type_id
      WHERE o.name IN ('TempoGasto', 'Tramite', 'Solicitacao', 'Usuario', 'TipoTempoGasto')
      ORDER BY o.name, c.column_id;
    `);
    console.table(metadata.recordset);
  }

  if (inspectSdMembers) {
    const members = await pool.request().query(`
      SELECT
        grupo.UsuID AS group_id,
        grupo.UsuNome AS group_name,
        COUNT_BIG(*) AS member_count,
        SUM(CASE WHEN analyst.DataExclusao IS NULL THEN 1 ELSE 0 END) AS active_member_count
      FROM PlataformaEllevo.dbo.Usuario AS analyst
      INNER JOIN PlataformaEllevo.dbo.Usuario AS grupo
        ON grupo.UsuID = analyst.UsuIDGrupo
      WHERE UPPER(LTRIM(RTRIM(grupo.UsuNome))) IN (
        N'SD - TN/RC', N'SD - GLOBAL', N'SD - PROTESTO', N'SD - RI/TD'
      )
      GROUP BY grupo.UsuID, grupo.UsuNome
      ORDER BY grupo.UsuNome;
    `);
    console.table(members.recordset);
  }

  if (apply) {
    await pool.request().batch(viewSql);
    const validation = await pool.request().query(`
      SELECT
        OBJECT_ID('dbo.horas_analistas_0800', 'V') AS view_id,
        COUNT_BIG(*) AS total_rows
      FROM dbo.horas_analistas_0800;
    `);
    if (!validation.recordset[0].view_id) fail("A view não foi criada.");
    console.log(
      `View dbo.horas_analistas_0800 publicada e validada (${validation.recordset[0].total_rows} linhas).`,
    );
  } else {
    console.log("Validação concluída; nenhuma escrita executada.");
  }

  if (sampleLogin && sampleDate) {
    const sample = await pool
      .request()
      .input("login", sql.NVarChar(200), sampleLogin.toLowerCase())
      .input("workDate", sql.Date, sampleDate)
      .query(`
        SELECT COUNT(*) AS lancamentos, SUM(minutos) AS minutos
        FROM dbo.horas_analistas_0800
        WHERE login_analista = @login AND data_lancamento = @workDate;
      `);
    console.log(
      `Amostra ${sampleLogin}/${sampleDate}: ${sample.recordset[0].lancamentos} lançamentos, ${sample.recordset[0].minutos ?? 0} minutos.`,
    );
  }

  if (sampleWeekStart) {
    const week = await pool
      .request()
      .input("startDate", sql.Date, sampleWeekStart)
      .query(`
        SELECT
          COUNT_BIG(*) AS lancamentos,
          COUNT(DISTINCT login_analista) AS analistas,
          SUM(minutos) AS minutos
        FROM dbo.horas_analistas_0800
        WHERE data_lancamento BETWEEN @startDate AND DATEADD(day, 6, @startDate)
          AND grupo_analista IN (N'SD - TN/RC', N'SD - GLOBAL', N'SD - Protesto', N'SD - RI/TD');
      `);
    console.log(
      `Semana ${sampleWeekStart}: ${week.recordset[0].lancamentos} lançamentos, ` +
        `${week.recordset[0].analistas} analistas, ${week.recordset[0].minutos ?? 0} minutos.`,
    );
  }
} finally {
  await pool.close();
}

async function readPassword() {
  if (!process.stdin.isTTY) return "";
  process.stdout.write("Senha MSSQL: ");
  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  let value = "";
  for await (const chunk of process.stdin) {
    for (const character of chunk) {
      if (character === "\r" || character === "\n") {
        process.stdin.setRawMode?.(false);
        process.stdout.write("\n");
        process.stdin.pause();
        return value;
      }
      if (character === "\u0003") process.exit(130);
      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
      } else {
        value += character;
      }
    }
  }
  return value;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
