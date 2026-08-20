// audit-encoding.mjs
// Escanea TODAS las paginas y componentes en busca de caracteres sospechosos:
// cualquier cosa que no sea ASCII normal, o un acento/simbolo espanol valido conocido.
// No corrige nada -- solo REPORTA, para que decidamos los fixes con calma.
//
// Uso:
//   cd C:\Users\user\veltrax-frontend
//   node audit-encoding.mjs

import fs from "fs";
import path from "path";

const DIRS = [
  path.join(process.cwd(), "src", "pages"),
  path.join(process.cwd(), "src", "components"),
];

// Caracteres validos que SI esperamos ver en español (whitelist).
// Todo lo demas fuera de ASCII imprimible se marca como sospechoso.
const VALID_EXTRA = new Set([
  "á","é","í","ó","ú","Á","É","Í","Ó","Ú",
  "ñ","Ñ","ü","Ü","¿","¡",
  "→","←","↑","↓", // flechas usadas en el UI
  "€","°","·","…","—","–", // simbolos comunes
  "“","”","‘","’", // comillas tipograficas
]);

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const findings = [];

  lines.forEach((line, idx) => {
    for (const ch of line) {
      const code = ch.codePointAt(0);
      if (code > 127 && !VALID_EXTRA.has(ch)) {
        findings.push({ lineNum: idx + 1, line: line.trim().slice(0, 150), char: ch, code });
        break; // solo reportar una vez por linea
      }
    }
  });

  return findings;
}

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".jsx") || f.endsWith(".js"))
    .map(f => path.join(dir, f));
}

let totalFindings = 0;
const filesWithIssues = [];

for (const dir of DIRS) {
  for (const filePath of collectFiles(dir)) {
    const findings = scanFile(filePath);
    if (findings.length > 0) {
      totalFindings += findings.length;
      filesWithIssues.push({ file: path.relative(process.cwd(), filePath), findings });
    }
  }
}

console.log(`\n=== AUDITORIA DE ENCODING ===`);
console.log(`${filesWithIssues.length} archivo(s) con caracteres sospechosos, ${totalFindings} linea(s) en total\n`);

for (const { file, findings } of filesWithIssues) {
  console.log(`\n📄 ${file} (${findings.length} linea(s)):`);
  for (const f of findings) {
    console.log(`  L${f.lineNum} [char U+${f.code.toString(16).toUpperCase()}]: ${f.line}`);
  }
}

if (filesWithIssues.length === 0) {
  console.log("✔ No se encontraron caracteres sospechosos. Todo limpio.\n");
}
