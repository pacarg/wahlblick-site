/*
 * build-es.js — genera las versiones en español (carpeta es/) a partir de las
 * páginas alemanas, que son la ÚNICA fuente de verdad.
 *
 * Node puro, sin dependencias. Uso:  node build-es.js
 *
 * Cada página alemana se GENERA en español, así no hay archivos duplicados que
 * mantener a mano: se toca una página → se corre este script → su /es/ queda en
 * sync. Es el generador multilingüe del sitio (a futuro: + inglés).
 *
 * Qué hace con cada página:
 *   - <html lang="es"> + head (title/description/og/twitter) en español
 *   - fuerza el idioma "es" al cargar (localStorage) → el propio JS de la página
 *     renderiza el cuerpo en español; navegar a otras internas sigue en español
 *   - links y assets relativos → rutas absolutas (para resolver desde /es/…)
 *   - canonical + og:url propios de /es/…  (los hreflang ya vienen del source,
 *     son simétricos y se copian tal cual)
 *   - la home además hornea su franja de bienvenida en español (bake[])
 *
 * NOTA SEO: el cuerpo de las internas se indexa por render de JS (Google
 * renderiza) + el head horneado en español. La home hornea también el cuerpo
 * (señal más fuerte) por ser la página de mayor valor.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, "es");

// Manifiesto: qué páginas se generan y sus textos de <head> en español.
// path = ruta bajo wahlblick.de/  ("" para la home, "faq.html" para /faq.html…)
const PAGES = [
  {
    file: "index.html",
    path: "",
    title: "Wahlblick — Mapa electoral interactivo de Alemania",
    description: "Mapa interactivo e independiente: resultados electorales por estado federado (Bundesland) en Alemania — elección federal al Bundestag y elecciones estatales (Landtag), con su historial. Deutsch · Español · English.",
    ogTitle: "Wahlblick — Mapa electoral de Alemania",
    ogDescription: "Mapa interactivo e independiente de los resultados electorales de Alemania: Bundestag y los 16 Landtage, con historial. Neutral y en tres idiomas.",
    twTitle: "Wahlblick — Mapa electoral de Alemania",
    twDescription: "Mapa interactivo de los resultados electorales de Alemania: Bundestag y los 16 Landtage.",
    bake: [
      { re: /(<h1 class="welcome-title" id="welcomeTitle">)[^<]*(<\/h1>)/, value: "Alemania vota. Acá lo ves claro." },
      { re: /(<p class="welcome-body" id="welcomeBody">)[\s\S]*?(<\/p>)/, value: 'Wahlblick es un mapa interactivo e independiente de los resultados electorales de Alemania. Elegí un estado federado (Bundesland) para ver quién ganó, con qué resultado y cómo cambió frente a la elección anterior — tanto para el Bundestag como para los 16 parlamentos regionales (Landtage), con su historial. ¿Querés entender cómo los votos se convierten en escaños? La sección <a href="sitzverteilung.html">Sistema electoral</a> lo explica paso a paso.' }
    ]
  },
  {
    file: "landtagswahlen-2026.html",
    path: "landtagswahlen-2026.html",
    title: "Elecciones estatales de Alemania 2026: ¿qué estados votan y cuándo? — Fechas y resultados | Wahlblick",
    description: "¿Qué estados alemanes votan en 2026 y cuándo? Cinco elecciones estatales (Landtag): Baden-Wurtemberg y Renania-Palatinado en marzo; Sajonia-Anhalt (6/9), Mecklemburgo-Pomerania (13/9) y Berlín (20/9) en septiembre. Fechas, resultados e historial. Neutral, trilingüe.",
    ogTitle: "Elecciones estatales de Alemania 2026: ¿qué estados votan y cuándo?",
    ogDescription: "Las cinco elecciones estatales de 2026: fechas, resultados e historial — neutral y con fuentes en wahlblick.de.",
    twDescription: "Las cinco elecciones estatales de Alemania en 2026: fechas, resultados e historial."
  },
  {
    file: "faq.html",
    path: "faq.html",
    title: "Preguntas frecuentes sobre el Bundestag y el sistema político de Alemania | Wahlblick",
    description: "¿Cómo se elige y se destituye al Canciller Federal? ¿Qué significan inmunidad, indemnidad y el Hammelsprung? ¿Hay referéndums a nivel federal? Respuestas neutrales y con fuentes, en tres idiomas.",
    ogTitle: "Preguntas frecuentes sobre el sistema político de Alemania",
    ogDescription: "Elección y destitución del canciller, inmunidad e indemnidad, Hammelsprung, referéndums — respuestas neutrales en wahlblick.de.",
    twDescription: "Respuestas neutrales a preguntas frecuentes sobre el Bundestag y el sistema político de Alemania."
  }
];

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escRepl = (s) => String(s).replace(/\$/g, "$$$$"); // $ es especial en replace()

function generate(page) {
  const src = path.join(ROOT, page.file);
  let html = fs.readFileSync(src, "utf8");
  const canonUrl = "https://wahlblick.de/" + page.path;
  const esUrl = "https://wahlblick.de/es/" + page.path;

  function req(re, value, label) {
    if (!re.test(html)) throw new Error("build-es [" + page.file + "]: falta el patrón « " + label + " » — ¿cambió el head?");
    html = html.replace(re, escRepl(value));
  }
  function opt(re, value) { // reemplaza solo si el patrón está presente
    if (value !== undefined && re.test(html)) html = html.replace(re, escRepl(value));
  }

  // documento + head (esenciales)
  req(/<html lang="de">/, '<html lang="es">', "html lang");
  req(/<title>[^<]*<\/title>/, "<title>" + page.title + "</title>", "title");
  req(new RegExp('<link rel="canonical" href="' + escRe(canonUrl) + '">'), '<link rel="canonical" href="' + esUrl + '">', "canonical");
  req(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + page.description + '">', "meta description");

  // Open Graph + Twitter (og:locale y twitter:title: opcionales, solo la home)
  opt(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + page.ogTitle + '">');
  opt(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + page.ogDescription + '">');
  opt(new RegExp('<meta property="og:url" content="' + escRe(canonUrl) + '">'), '<meta property="og:url" content="' + esUrl + '">');
  opt(/<meta property="og:locale" content="de_DE">/, '<meta property="og:locale" content="es_ES">');
  opt(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + (page.twTitle || page.ogTitle) + '">');
  opt(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + page.twDescription + '">');

  // forzar español al cargar, antes de que el script de la página lea localStorage
  req(/<body>/, '<body>\n<script>try{localStorage.setItem("wahlblickLang","es")}catch(e){}</script>', "<body>");

  // horneado extra del cuerpo (solo la home)
  (page.bake || []).forEach(function (b, i) {
    if (!b.re.test(html)) throw new Error("build-es [" + page.file + "]: falta el bake #" + (i + 1));
    html = html.replace(b.re, "$1" + escRepl(b.value) + "$2");
  });

  // rutas absolutas para resolver desde /es/…  Solo links literales X.html(#ancla)
  // y assets X.svg/png/… — nunca el href="' + var + '" que arma el JS.
  html = html.replace(/href="([\w-]+\.html(?:#[\w-]+)?)"/g, 'href="/$1"');
  html = html.replace(/(href|src)="([\w-]+\.(?:svg|png|ico|jpe?g|webp))"/g, '$1="/$2"');
  // idem para los links con comillas escapadas dentro de los objetos i18n del JS
  html = html.replace(/href=\\"([\w-]+\.html(?:#[\w-]+)?)\\"/g, 'href=\\"/$1\\"');
  // y los links en datos del JS con formato de propiedad: href: "X.html(?query)"
  // (p. ej. el array ELECTIONS del hub). No matchea el href="' + var + '".
  html = html.replace(/href: "([\w-]+\.html(?:[?#][^"]*)?)"/g, 'href: "/$1"');

  const out = path.join(OUT_DIR, page.file);
  fs.writeFileSync(out, html, "utf8");
  return path.relative(ROOT, out).replace(/\\/g, "/") + " (" + html.length + " bytes)";
}

fs.mkdirSync(OUT_DIR, { recursive: true });
PAGES.forEach(function (p) { console.log("build-es: " + generate(p)); });
