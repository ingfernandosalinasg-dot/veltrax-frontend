// fix-cliente-nombre.mjs
// Corrige el bug donde el frontend lee el campo viejo "name" del cliente
// en vez del campo nuevo "nombre" (donde ClientesPage.jsx realmente guarda el dato).
// Aplica un fallback: primero intenta "nombre", si no existe usa "name" (compatibilidad con datos viejos).
//
// Uso:
//   cd C:\Users\user\veltrax-frontend
//   node fix-cliente-nombre.mjs

import fs from "fs";
import path from "path";

const PAGES_DIR = path.join(process.cwd(), "src", "pages");
const BACKUP_DIR = path.join(process.cwd(), "src", "_backup_cliente_nombre");

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Cada entrada: { file, replacements: [ [textoViejo, textoNuevo], ... ] }
const fixes = [
  {
    file: "CajasPage.jsx",
    replacements: [
      [`m.cliente?.name || "Sin cliente"`, `m.cliente?.nombre || m.cliente?.name || "Sin cliente"`],
      [`m.cliente?.name?.toLowerCase().includes(busqueda.toLowerCase())`, `(m.cliente?.nombre || m.cliente?.name || "").toLowerCase().includes(busqueda.toLowerCase())`],
      [`{m.cliente?.name || "-"}`, `{m.cliente?.nombre || m.cliente?.name || "-"}`],
      [`{clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}`, `{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.name}</option>)}`],
      [`{o.cliente?.name || ""}`, `{o.cliente?.nombre || o.cliente?.name || ""}`],
    ],
  },
  {
    file: "FacturasPage.jsx",
    replacements: [
      [`receptorRazonSocial: c ? c.name : ""`, `receptorRazonSocial: c ? (c.nombre || c.name) : ""`],
      [`{f.cliente?.name || f.receptorRazonSocial || "-"}`, `{f.cliente?.nombre || f.cliente?.name || f.receptorRazonSocial || "-"}`],
      [`{o.cliente?.name||""}`, `{o.cliente?.nombre||o.cliente?.name||""}`],
      [`{f.cliente?.name||f.receptorRazonSocial}`, `{f.cliente?.nombre||f.cliente?.name||f.receptorRazonSocial}`],
      [`{clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}`, `{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.name}</option>)}`],
    ],
  },
  {
    file: "ReportesPage.jsx",
    replacements: [
      [`{clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}`, `{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.name}</option>)}`],
    ],
  },
  {
    file: "ViajesPage.jsx",
    replacements: [
      [`{v.cliente?.name || v.clienteNombre || "-"}`, `{v.cliente?.nombre || v.cliente?.name || v.clienteNombre || "-"}`],
      [`{viajeSeleccionado.cliente?.name || viajeSeleccionado.clienteNombre || "Sin cliente"}`, `{viajeSeleccionado.cliente?.nombre || viajeSeleccionado.cliente?.name || viajeSeleccionado.clienteNombre || "Sin cliente"}`],
      [`{clientes.map(c => <option key={c.id} value={c.id}>{c.name} -{c.company}</option>)}`, `{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.name} -{c.company}</option>)}`],
    ],
  },
];

let totalFilesChanged = 0;

for (const { file, replacements } of fixes) {
  const filePath = path.join(PAGES_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ No encontrado: ${file}`);
    continue;
  }
  const original = fs.readFileSync(filePath, "utf8");
  let content = original;
  let appliedCount = 0;
  let notFound = [];

  for (const [oldStr, newStr] of replacements) {
    if (content.includes(newStr)) continue; // ya aplicado, idempotente
    if (content.includes(oldStr)) {
      content = content.split(oldStr).join(newStr);
      appliedCount++;
    } else {
      notFound.push(oldStr);
    }
  }

  if (content !== original) {
    fs.writeFileSync(path.join(BACKUP_DIR, file), original, "utf8");
    fs.writeFileSync(filePath, content, "utf8");
    totalFilesChanged++;
  }

  console.log(`\n${file}: ${appliedCount}/${replacements.length} reemplazos aplicados`);
  if (notFound.length) {
    console.log(`  ⚠ No se encontraron estos textos exactos (revisar manualmente):`);
    notFound.forEach(s => console.log(`    - ${s}`));
  }
}

console.log(`\n=== Total: ${totalFilesChanged} archivo(s) modificado(s) ===`);
console.log(`Backups en: src/_backup_cliente_nombre/\n`);
