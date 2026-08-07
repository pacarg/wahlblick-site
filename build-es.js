/*
 * build-es.js — genera es/index.html (home en español) a partir de index.html.
 *
 * Node puro, sin dependencias. Uso:  node build-es.js
 *
 * index.html (alemán) es la ÚNICA fuente de verdad. La home en español se
 * GENERA a partir de ella, así no hay un archivo duplicado que mantener a mano:
 * cada vez que se toca la home, se corre este script y es/index.html queda en
 * sync. Es el primer ladrillo del generador multilingüe completo (a futuro:
 * las 16 páginas + inglés, con /es/ /en/ y hreflang para todas).
 *
 * Qué hace con la home:
 *   - <html lang="es"> + meta (title/description/og/twitter) en español
 *   - hornea el texto de la franja de bienvenida en español (lo que Google lee)
 *   - fuerza el idioma "es" al cargar (localStorage) → navegar a las internas
 *     sigue en español aunque esas URLs sean todavía las de raíz
 *   - links y assets relativos → rutas absolutas (para que resuelvan desde /es/)
 *   - canonical propio (/es/) + hreflang (de / es / x-default)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "index.html");
const OUT_DIR = path.join(__dirname, "es");
const OUT = path.join(OUT_DIR, "index.html");

// Strings en español que se hornean en el HTML estático (lo que el buscador
// lee en la carga inicial, sin depender del JS). Los de bienvenida coinciden
// con I18N.es de la home; acá funcionan como el manifiesto de traducción del
// generador.
const ES = {
  title: "Wahlblick — Mapa electoral interactivo de Alemania",
  description: "Mapa interactivo e independiente: resultados electorales por estado federado (Bundesland) en Alemania — elección federal al Bundestag y elecciones estatales (Landtag), con su historial. Deutsch · Español · English.",
  ogTitle: "Wahlblick — Mapa electoral de Alemania",
  ogDescription: "Mapa interactivo e independiente de los resultados electorales de Alemania: Bundestag y los 16 Landtage, con historial. Neutral y en tres idiomas.",
  twTitle: "Wahlblick — Mapa electoral de Alemania",
  twDescription: "Mapa interactivo de los resultados electorales de Alemania: Bundestag y los 16 Landtage.",
  welcomeTitle: "Alemania vota. Acá lo ves claro.",
  welcomeBody: 'Wahlblick es un mapa interactivo e independiente de los resultados electorales de Alemania. Elegí un estado federado (Bundesland) para ver quién ganó, con qué resultado y cómo cambió frente a la elección anterior — tanto para el Bundestag como para los 16 parlamentos regionales (Landtage), con su historial. ¿Querés entender cómo los votos se convierten en escaños? La sección <a href="sitzverteilung.html">Sistema electoral</a> lo explica paso a paso.'
};

let html = fs.readFileSync(SRC, "utf8");

// replace() con string usa $ como especial; escapamos las inserciones.
function esc(s) { return s.replace(/\$/g, "$$$$"); }
function sub(re, value, label) {
  if (!re.test(html)) throw new Error("build-es: no se encontró el patrón de « " + label + " » — ¿cambió index.html?");
  html = html.replace(re, value);
}

// 1. idioma del documento
sub(/<html lang="de">/, '<html lang="es">', "html lang");

// 2. head: title + description
sub(/<title>[^<]*<\/title>/, "<title>" + esc(ES.title) + "</title>", "title");
sub(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(ES.description) + '">', "meta description");

// 3. canonical propio de /es/ (los hreflang ya vienen del source: son
//    simétricos — las mismas 3 líneas sirven para la home DE y la ES).
sub(/<link rel="canonical" href="https:\/\/wahlblick\.de\/">/, '<link rel="canonical" href="https://wahlblick.de/es/">', "canonical");

// 4. Open Graph + Twitter
sub(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(ES.ogTitle) + '">', "og:title");
sub(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(ES.ogDescription) + '">', "og:description");
sub(/<meta property="og:url" content="https:\/\/wahlblick\.de\/">/, '<meta property="og:url" content="https://wahlblick.de/es/">', "og:url");
sub(/<meta property="og:locale" content="de_DE">/, '<meta property="og:locale" content="es_ES">', "og:locale");
sub(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + esc(ES.twTitle) + '">', "twitter:title");
sub(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + esc(ES.twDescription) + '">', "twitter:description");

// 5. franja de bienvenida horneada en español (para indexación / sin-JS)
sub(/(<h1 class="welcome-title" id="welcomeTitle">)[^<]*(<\/h1>)/, "$1" + esc(ES.welcomeTitle) + "$2", "welcomeTitle");
sub(/(<p class="welcome-body" id="welcomeBody">)[\s\S]*?(<\/p>)/, "$1" + esc(ES.welcomeBody) + "$2", "welcomeBody");

// 6. forzar español al cargar, antes de que el script principal lea localStorage
sub(/<body>/, '<body>\n<script>try{localStorage.setItem("wahlblickLang","es")}catch(e){}</script>', "<body>");

// 7. rutas absolutas para que resuelvan desde /es/.
//    Solo links literales X.html(#ancla) y assets X.svg/png/… — NUNCA el
//    href="' + d.source + '" que arma el JS (empieza con comilla, no matchea).
html = html.replace(/href="([\w-]+\.html(?:#[\w-]+)?)"/g, 'href="/$1"');
html = html.replace(/(href|src)="([\w-]+\.(?:svg|png|ico|jpe?g|webp))"/g, '$1="/$2"');
// Los objetos i18n del JS re-renderizan algunos textos (p. ej. la franja de
// bienvenida) y llevan links con comillas escapadas: href=\"X.html\". También
// hay que absolutizarlos, o desde /es/ resolverían a /es/X.html (404).
html = html.replace(/href=\\"([\w-]+\.html(?:#[\w-]+)?)\\"/g, 'href=\\"/$1\\"');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html, "utf8");
console.log("build-es: escrito " + path.relative(__dirname, OUT).replace(/\\/g, "/") + " (" + html.length + " bytes)");
