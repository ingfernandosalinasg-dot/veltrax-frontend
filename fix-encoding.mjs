// fix-encoding.mjs
// Corrige la corrupcion de encoding "UTF-8 leido como GBK" en todas las paginas.
// Cada caracter roto se mapea SIEMPRE al mismo caracter correcto (es determinista),
// asi que este reemplazo es seguro de aplicar en automatico.
//
// Uso:
//   cd C:\Users\user\veltrax-frontend
//   node fix-encoding.mjs

import fs from "fs";
import path from "path";

const PAGES_DIR = path.join(process.cwd(), "src", "pages");
const COMPONENTS_DIR = path.join(process.cwd(), "src", "components");
const BACKUP_DIR = path.join(process.cwd(), "src", "_backup_encoding");

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Mapeo directo: caracter corrupto -> caracter correcto
const MAP = {
  "茅": "é",
  "贸": "ó",
  "谩": "á",
  "铆": "í",
  "煤": "ú",
  "脺": "Ü",
  "眉": "ü",
  "脫": "Ó",
  "脕": "Á",
  "脡": "É",
  "脥": "Í",
  "脷": "Ú",
  "帽": "ñ",
  "脩": "Ñ",
  "驴": "¿",
  "隆": "¡",
};

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".jsx") || f.endsWith(".js"))
    .map(f => path.join(dir, f));
}

const files = [...collectFiles(PAGES_DIR), ...collectFiles(COMPONENTS_DIR)];

let totalFilesChanged = 0;
let totalReplacements = 0;
const summary = [];

for (const filePath of files) {
  const original = fs.readFileSync(filePath, "utf8");
  let content = original;
  let countThisFile = 0;

  for (const [bad, good] of Object.entries(MAP)) {
    const re = new RegExp(bad, "g");
    const matches = content.match(re);
    if (matches) {
      countThisFile += matches.length;
      content = content.replace(re, good);
    }
  }

  if (content !== original) {
    const relName = path.basename(filePath);
    fs.writeFileSync(path.join(BACKUP_DIR, relName), original, "utf8");
    fs.writeFileSync(filePath, content, { encoding: "utf8" });
    totalFilesChanged++;
    totalReplacements += countThisFile;
    summary.push({ file: path.relative(process.cwd(), filePath), count: countThisFile });
  }
}

console.log(`\n=== Resumen: ${totalFilesChanged} archivo(s) modificado(s), ${totalReplacements} caracter(es) corregido(s) ===\n`);
for (const s of summary) {
  console.log(`✔ ${s.file}  (${s.count} caracteres corregidos)`);
}
console.log(`\nBackups guardados en: src/_backup_encoding/`);
console.log("Revisa con 'git diff' antes de hacer commit.\n");
