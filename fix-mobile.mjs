// fix-mobile.mjs
// Aplica fixes responsive SEGUROS e IDEMPOTENTES (puedes correrlo varias veces sin duplicar clases)
// a todas las páginas de src/pages que tengan los patrones fijos que rompen mobile.
//
// Uso:
//   cd C:\Users\user\veltrax-frontend
//   node fix-mobile.mjs
//
// El script:
//  1. Hace un backup de cada archivo tocado en src/pages/_backup_mobile/
//  2. Aplica los reemplazos
//  3. Imprime un resumen de qué cambió en cada archivo

import fs from "fs";
import path from "path";

const PAGES_DIR = path.join(process.cwd(), "src", "pages");
const BACKUP_DIR = path.join(PAGES_DIR, "_backup_mobile");

if (!fs.existsSync(PAGES_DIR)) {
  console.error("No encontré src/pages. Corre este script desde la raíz de veltrax-frontend.");
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith(".jsx"));

// Cada regla: { test: regex para saber si ya está aplicada (skip), find: regex a reemplazar, replace: string }
const rules = [
  {
    name: "grid-cols-4 -> responsive",
    test: /sm:grid-cols-4/,
    find: /\bgrid-cols-4\b/g,
    replace: "grid-cols-2 sm:grid-cols-4",
  },
  {
    name: "grid-cols-3 -> responsive",
    test: /sm:grid-cols-3/,
    find: /\bgrid-cols-3\b/g,
    replace: "grid-cols-1 sm:grid-cols-3",
  },
  {
    name: "text-6xl -> responsive",
    test: /md:text-6xl/,
    find: /(?<!md:)\btext-6xl\b/g,
    replace: "text-3xl md:text-6xl",
  },
  {
    name: "text-5xl -> responsive",
    test: /md:text-5xl/,
    find: /(?<!md:)\btext-5xl\b/g,
    replace: "text-2xl md:text-5xl",
  },
  {
    name: "contenedor principal 'flex-1 p-10' -> responsive",
    test: /flex-1 p-5 md:p-10/,
    find: /flex-1 p-10 overflow-auto relative/g,
    replace: "flex-1 p-5 md:p-10 overflow-auto relative w-full min-w-0",
  },
  {
    name: "grid-cols-2 fijo en tabla de stats (mismo contenedor 'grid grid-cols-2 gap-6 mb-10') -> responsive",
    test: /sm:grid-cols-2 gap-4 md:gap-6/,
    find: /grid grid-cols-2 gap-6 mb-10/g,
    replace: "grid grid-cols-2 sm:grid-cols-2 gap-4 md:gap-6 mb-10",
  },
];

let totalChanged = 0;
const summary = [];

for (const file of files) {
  const filePath = path.join(PAGES_DIR, file);
  const original = fs.readFileSync(filePath, "utf8");
  let content = original;
  const appliedRules = [];

  for (const rule of rules) {
    if (rule.test.test(content)) continue; // ya aplicada, skip (idempotente)
    if (rule.find.test(content)) {
      content = content.replace(rule.find, rule.replace);
      appliedRules.push(rule.name);
    }
  }

  if (content !== original) {
    // backup del original antes de tocarlo
    fs.writeFileSync(path.join(BACKUP_DIR, file), original, "utf8");
    // escribir sin BOM, forzando utf8 plano
    fs.writeFileSync(filePath, content, { encoding: "utf8" });
    totalChanged++;
    summary.push({ file, appliedRules });
  }
}

console.log(`\n=== Resumen: ${totalChanged} archivo(s) modificado(s) de ${files.length} revisados ===\n`);
for (const s of summary) {
  console.log(`✔ ${s.file}`);
  for (const r of s.appliedRules) console.log(`    - ${r}`);
}
console.log(`\nBackups guardados en: src/pages/_backup_mobile/`);
console.log("Revisa los cambios con 'git diff' antes de hacer commit.\n");
