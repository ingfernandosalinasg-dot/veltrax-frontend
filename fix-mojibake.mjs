// fix-mojibake.mjs
// Revierte la corrupcion "UTF-8 leido como GBK" de forma matematica y precisa.
//
// Logica: el texto correcto (UTF-8) fue leido por error usando el codec GBK,
// produciendo caracteres CJK sin sentido. Esos caracteres se volvieron a guardar
// como UTF-8 valido (por eso los vemos ahora). Para revertir:
//   1. Tomamos el texto corrupto tal como esta en el archivo (ya es UTF-8 valido).
//   2. Lo "re-codificamos" como si fueran bytes GBK (encode con GBK).
//   3. Esos bytes resultantes los decodificamos como UTF-8 (el encoding original correcto).
//
// MODO SEGURO: por default solo IMPRIME el antes/despues de cada archivo, sin escribir nada.
// Corre con --write para aplicar los cambios de verdad.
//
// Uso:
//   node fix-mojibake.mjs           (solo vista previa)
//   node fix-mojibake.mjs --write   (aplica los cambios)

import fs from "fs";
import path from "path";
import iconv from "iconv-lite";

const APPLY = process.argv.includes("--write");
const DOUBLE_ROUNDTRIP_FILES = new Set(["LiquidacionesPage.jsx"]);
const SKIP_FILES = new Set(["Sidebar.jsx"]); // aqui no habia corrupcion real, ya se confirmo

const TARGETS = [
  path.join(process.cwd(), "src", "pages", "RutasPage.jsx"),
  path.join(process.cwd(), "src", "pages", "LiquidacionesPage.jsx"),
].filter(p => !SKIP_FILES.has(path.basename(p)));

const BACKUP_DIR = path.join(process.cwd(), "src", "_backup_mojibake");
if (APPLY && !fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function repairLine(line, times = 1) {
  // Solo intenta reparar si la linea tiene caracteres fuera de ASCII normal
  if (!/[^\x00-\x7F]/.test(line)) return { changed: false, line };

  let current = line;
  let anyChange = false;
  try {
    for (let i = 0; i < times; i++) {
      const bytes = iconv.encode(current, "gbk");
      const repaired = iconv.decode(bytes, "utf8");
      if (repaired.includes("\uFFFD")) break; // resultado invalido, no seguir
      if (repaired !== current) {
        current = repaired;
        anyChange = true;
      }
    }
  } catch (e) {
    // si falla la conversion, dejamos la linea intacta
  }
  return { changed: anyChange, line: current };
}

for (const filePath of TARGETS) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ No encontrado: ${filePath}`);
    continue;
  }

  const original = fs.readFileSync(filePath, "utf8");
  const lines = original.split("\n");
  let changedCount = 0;
  const preview = [];

  const rounds = DOUBLE_ROUNDTRIP_FILES.has(path.basename(filePath)) ? 2 : 1;
  const newLines = lines.map((line, idx) => {
    const result = repairLine(line, rounds);
    if (result.changed) {
      changedCount++;
      preview.push({ num: idx + 1, before: line.trim().slice(0, 120), after: result.line.trim().slice(0, 120) });
    }
    return result.line;
  });

  console.log(`\n📄 ${path.relative(process.cwd(), filePath)}: ${changedCount} línea(s) reparada(s)`);
  for (const p of preview.slice(0, 15)) {
    console.log(`  L${p.num}`);
    console.log(`    ANTES:   ${p.before}`);
    console.log(`    DESPUES: ${p.after}`);
  }
  if (preview.length > 15) console.log(`  ... y ${preview.length - 15} línea(s) más`);

  if (APPLY && changedCount > 0) {
    fs.writeFileSync(path.join(BACKUP_DIR, path.basename(filePath)), original, "utf8");
    fs.writeFileSync(filePath, newLines.join("\n"), "utf8");
    console.log(`  ✔ Guardado (backup en src/_backup_mojibake/)`);
  }
}

if (!APPLY) {
  console.log(`\n\n>>> Esto fue solo VISTA PREVIA. Si se ve bien, corre: node fix-mojibake.mjs --write <<<\n`);
}
