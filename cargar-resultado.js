#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
 * cargar-resultado.js — carga el resultado de una elección en su página de Land.
 *
 * Pensado para la NOCHE ELECTORAL: bajo presión no se editan cuatro cosas a
 * mano. Este script hace una sola edición real (la entrada en HISTORY); el
 * keyfact "Última elección" y el aviso de "resultados pendientes" se derivan
 * solos en la página, y la pastilla del hub ya se calcula por fecha.
 *
 * Uso:
 *   node cargar-resultado.js sachsen-anhalt --date 2026-09-06 --turnout 60,3 \
 *        --results "union=31,2 afd=27,4 spd=12,1 linke=9,8 gruene=5,4"
 *
 *   --dry-run   muestra qué haría, sin escribir nada
 *   --no-build  no corre build-i18n.js (por defecto SÍ lo corre)
 *
 * Acepta coma o punto decimal. El orden de --results da el orden de las barras;
 * si no viene ordenado de mayor a menor, el script lo ordena y avisa.
 * ────────────────────────────────────────────────────────────────────────── */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const LANDS = {
  "sachsen-anhalt": "sachsen-anhalt.html",
  "mecklenburg-vorpommern": "mecklenburg-vorpommern.html",
  "berlin": "berlin.html"
};

function die(msg) { console.error("\n✖ " + msg + "\n"); process.exit(1); }
function num(s) { return parseFloat(String(s).replace(",", ".")); }

/* ── argumentos ─────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const land = argv[0];
if (!land || !LANDS[land]) {
  die("Primer argumento: uno de " + Object.keys(LANDS).join(", "));
}
function opt(name) {
  const i = argv.indexOf("--" + name);
  return i === -1 ? null : argv[i + 1];
}
const dryRun = argv.includes("--dry-run");
const noBuild = argv.includes("--no-build");
const date = opt("date");
const turnout = opt("turnout");
const resultsRaw = opt("results");

if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) die("--date debe ser AAAA-MM-DD");
if (turnout === null || isNaN(num(turnout))) die("--turnout falta o no es un número");
if (!resultsRaw) die('--results falta, p. ej. "union=31,2 afd=27,4"');

/* ── página y paleta ────────────────────────────────────────────────────── */
const file = path.join(ROOT, LANDS[land]);
let html = fs.readFileSync(file, "utf8");

const partyBlock = html.match(/var PARTY = \{[\s\S]*?\n  \};/);
if (!partyBlock) die("No encontré el objeto PARTY en " + LANDS[land]);
const known = [...partyBlock[0].matchAll(/^\s*([a-z]+):\s*\{ name:/gm)].map(m => m[1])
  .concat([...partyBlock[0].matchAll(/,\s*([a-z]+):\s*\{ name:/g)].map(m => m[1]));
const KNOWN = [...new Set(known)];

/* ── resultados ─────────────────────────────────────────────────────────── */
const results = resultsRaw.trim().split(/[\s,]*\s+/).filter(Boolean).map(pair => {
  const m = pair.match(/^([a-z]+)=(-?[\d.,]+)$/);
  if (!m) die("No entiendo el par «" + pair + "». Formato: clave=porcentaje");
  const pct = num(m[2]);
  if (isNaN(pct) || pct < 0 || pct > 100) die("Porcentaje fuera de rango en «" + pair + "»");
  return { p: m[1], pct };
});

const unknown = results.map(r => r.p).filter(p => !KNOWN.includes(p));
if (unknown.length) {
  die("Estos partidos no están en PARTY de " + LANDS[land] + ": " + unknown.join(", ") +
      "\n  Conocidos: " + KNOWN.join(", ") +
      "\n  Agregalos a PARTY (nombre + color) antes de cargar, o saldrían grises y sin nombre.");
}
const dupes = results.map(r => r.p).filter((p, i, a) => a.indexOf(p) !== i);
if (dupes.length) die("Partido repetido en --results: " + dupes.join(", "));

const suma = results.reduce((a, r) => a + r.pct, 0);
if (suma > 100.5) die("Los porcentajes suman " + suma.toFixed(1) + " %, imposible. Revisá los números.");

const ordenado = [...results].sort((a, b) => b.pct - a.pct);
const venian_ordenados = ordenado.every((r, i) => r.p === results[i].p);
if (!venian_ordenados) console.log("• Reordené los partidos de mayor a menor.");

/* ── idempotencia ───────────────────────────────────────────────────────── */
if (html.includes('date: "' + date + '"')) {
  die("Ya existe una entrada para " + date + " en " + LANDS[land] + ".\n" +
      "  Si querés reemplazarla (cifras provisorias → definitivas), borrá esa entrada primero\n" +
      "  o revertí con: git checkout -- " + LANDS[land]);
}

/* ── construir la entrada e insertarla al tope de HISTORY ───────────────────
 * El archivo puede estar en LF o en CRLF según cómo se haya hecho el checkout
 * (git convierte en Windows). Se detecta y se respeta el que ya tiene, para no
 * dejar el archivo con finales de línea mezclados. */
const EOL = html.includes("\r\n") ? "\r\n" : "\n";
const filas = ordenado.map(r => '{ p: "' + r.p + '", pct: ' + r.pct + ' }');
const lineas = [];
for (let i = 0; i < filas.length; i += 3) lineas.push("      " + filas.slice(i, i + 3).join(", "));
const entrada =
  '    { date: "' + date + '", turnout: ' + num(turnout) + ', results: [' + EOL +
  lineas.join("," + EOL) + ' ] },' + EOL;

const anchorRe = /( {2}var HISTORY = \[\r?\n)/;
if (!anchorRe.test(html)) die("No encontré el array HISTORY en " + LANDS[land]);
const nuevoHtml = html.replace(anchorRe, "$1" + entrada.replace(/\$/g, "$$$$"));

/* ── SITE_LAST_UPDATED ──────────────────────────────────────────────────── */
const idx = path.join(ROOT, "index.html");
let idxHtml = fs.readFileSync(idx, "utf8");
const hoy = new Date().toISOString().slice(0, 10);
const idxNuevo = idxHtml.replace(/var SITE_LAST_UPDATED = "\d{4}-\d{2}-\d{2}";/,
                                 'var SITE_LAST_UPDATED = "' + hoy + '";');

/* ── salida ─────────────────────────────────────────────────────────────── */
console.log("\n" + LANDS[land] + " · " + date + " · participación " + num(turnout) + " %");
ordenado.forEach(r => console.log("   " + r.p.padEnd(8) + String(r.pct).padStart(5) + " %"));
console.log("   suma " + suma.toFixed(1) + " %");
console.log("\nSe deriva solo: keyfact «última elección», aviso de resultados pendientes,\npastilla del hub y — en Sachsen-Anhalt — el bloque de plazos.\n");

if (dryRun) { console.log("--dry-run: no escribí nada.\n"); process.exit(0); }

fs.writeFileSync(file, nuevoHtml, "utf8");
fs.writeFileSync(idx, idxNuevo, "utf8");
console.log("✔ " + LANDS[land] + " actualizado");
console.log("✔ SITE_LAST_UPDATED → " + hoy);

if (!noBuild) {
  execFileSync(process.execPath, [path.join(ROOT, "build-i18n.js")], { stdio: "inherit", cwd: ROOT });
}

console.log("\nAhora, para publicar:");
console.log('  git add ' + LANDS[land] + ' es/' + LANDS[land] + ' en/' + LANDS[land] +
            ' index.html es/index.html en/index.html sitemap.xml');
console.log('  git commit -m "Load ' + land + ' ' + date.slice(0, 4) + ' election results"');
console.log("  git push origin main\n");
