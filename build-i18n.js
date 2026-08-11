/*
 * build-i18n.js — genera las versiones traducidas (carpetas es/ y en/) a partir
 * de las páginas alemanas, que son la ÚNICA fuente de verdad.
 *
 * Node puro, sin dependencias. Uso:  node build-i18n.js
 * (Reemplaza a build-es.js; ahora genera español E inglés desde un solo config.)
 *
 * Cada página alemana se GENERA en cada idioma, así no hay archivos duplicados
 * que mantener a mano: se toca una página → se corre este script → sus /es/ y
 * /en/ quedan en sync.
 *
 * Qué hace con cada página, por idioma:
 *   - <html lang="…"> + head (title/description/og/twitter) traducidos
 *   - fuerza el idioma al cargar (localStorage) → el propio JS de la página
 *     renderiza el cuerpo en ese idioma; navegar a otras internas lo mantiene
 *   - links y assets relativos → rutas absolutas (para resolver desde /es/ /en/)
 *   - canonical + og:url propios de /es/… o /en/…  (los hreflang ya vienen del
 *     source, son simétricos —de/es/en/x-default— y se copian tal cual)
 *   - la home además hornea su franja de bienvenida traducida (bake)
 *
 * NOTA SEO: el cuerpo de las internas se indexa por render de JS (Google
 * renderiza) + el head horneado. La home hornea también el cuerpo (señal más
 * fuerte) por ser la página de mayor valor.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = __dirname;

const LANGS = [
  { code: "es", dir: "es", storage: "es", ogLocale: "es_ES" },
  { code: "en", dir: "en", storage: "en", ogLocale: "en_US" }
];

// Regex de horneado del cuerpo de la home (mismo target en todos los idiomas;
// los valores traducidos van en cada page[lang].bake).
const HOME_BAKE_TARGETS = [
  /(<h1 class="welcome-title" id="welcomeTitle">)[\s\S]*?(<\/h1>)/,
  /(<p class="welcome-body" id="welcomeBody">)[\s\S]*?(<\/p>)/
];

const PAGES = [
  {
    file: "index.html", path: "", bakeTargets: HOME_BAKE_TARGETS,
    es: {
      title: "Wahlblick — Mapa electoral interactivo de Alemania",
      description: "Mapa interactivo e independiente: resultados electorales por estado federado (Bundesland) en Alemania — elección federal al Bundestag y elecciones estatales (Landtag), con su historial. Deutsch · Español · English.",
      ogTitle: "Wahlblick — Mapa electoral de Alemania",
      ogDescription: "Mapa interactivo e independiente de los resultados electorales de Alemania: Bundestag y los 16 Landtage, con historial. Neutral y en tres idiomas.",
      twTitle: "Wahlblick — Mapa electoral de Alemania",
      twDescription: "Mapa interactivo de los resultados electorales de Alemania: Bundestag y los 16 Landtage.",
      bake: [
        "Alemania vota.<br>Aquí lo ves claro.",
        "El mapa interactivo e independiente de los resultados electorales — el Bundestag y los 16 parlamentos regionales (Landtage), con su historial."
      ]
    },
    en: {
      title: "Wahlblick — Interactive election map of Germany",
      description: "Interactive, independent map of Germany's election results by federal state (Bundesland) — the federal election (Bundestag) and state elections (Landtag), with their history. Deutsch · Español · English.",
      ogTitle: "Wahlblick — Election map of Germany",
      ogDescription: "Interactive, independent map of Germany's election results: the Bundestag and all 16 Landtage, with history. Neutral and in three languages.",
      twTitle: "Wahlblick — Election map of Germany",
      twDescription: "Interactive map of Germany's election results: the Bundestag and all 16 Landtage.",
      bake: [
        "Germany votes.<br>See it clearly.",
        "The independent, interactive map of Germany's election results — the Bundestag and all 16 state parliaments (Landtage), with their history."
      ]
    }
  },
  {
    file: "landtagswahlen-2026.html", path: "landtagswahlen-2026.html",
    es: {
      title: "Elecciones estatales de Alemania 2026: ¿qué estados votan y cuándo? — Fechas y resultados | Wahlblick",
      description: "¿Qué estados alemanes votan en 2026 y cuándo? Cinco elecciones estatales (Landtag): Baden-Wurtemberg y Renania-Palatinado en marzo; Sajonia-Anhalt (6/9), Mecklemburgo-Pomerania (20/9) y Berlín (20/9) en septiembre. Fechas, resultados e historial. Neutral, trilingüe.",
      ogTitle: "Elecciones estatales de Alemania 2026: ¿qué estados votan y cuándo?",
      ogDescription: "Las cinco elecciones estatales de 2026: fechas, resultados e historial — neutral y con fuentes en wahlblick.de.",
      twDescription: "Las cinco elecciones estatales de Alemania en 2026: fechas, resultados e historial."
    },
    en: {
      title: "Germany's 2026 state elections: which states vote and when? — dates & results | Wahlblick",
      description: "Which German states vote in 2026 and when? Five state elections (Landtag): Baden-Württemberg and Rhineland-Palatinate in March; Saxony-Anhalt (6 Sept), Mecklenburg-Vorpommern (20 Sept) and Berlin (20 Sept) in September. Dates, results and history. Neutral, trilingual.",
      ogTitle: "Germany's 2026 state elections: which states vote and when?",
      ogDescription: "All five 2026 state elections: dates, results and history — neutral and sourced on wahlblick.de.",
      twDescription: "Germany's five 2026 state elections: dates, results and history."
    }
  },
  {
    file: "faq.html", path: "faq.html",
    es: {
      title: "Preguntas frecuentes sobre el Bundestag y el sistema político de Alemania | Wahlblick",
      description: "¿Cómo se elige y se destituye al Canciller Federal? ¿Qué significan inmunidad, indemnidad y el Hammelsprung? ¿Hay referéndums a nivel federal? Respuestas neutrales y con fuentes, en tres idiomas.",
      ogTitle: "Preguntas frecuentes sobre el sistema político de Alemania",
      ogDescription: "Elección y destitución del canciller, inmunidad e indemnidad, Hammelsprung, referéndums — respuestas neutrales en wahlblick.de.",
      twDescription: "Respuestas neutrales a preguntas frecuentes sobre el Bundestag y el sistema político de Alemania."
    },
    en: {
      title: "FAQ: the Bundestag and Germany's political system | Wahlblick",
      description: "How is the Federal Chancellor elected and removed? What are immunity, indemnity and the Hammelsprung? Are there federal referendums? Neutral, sourced answers, in three languages.",
      ogTitle: "Frequently asked questions about Germany's political system",
      ogDescription: "Chancellor election and removal, immunity and indemnity, the Hammelsprung, referendums — neutral answers on wahlblick.de.",
      twDescription: "Neutral answers to common questions about the Bundestag and Germany's political system."
    }
  },
  {
    file: "glossar.html", path: "glossar.html",
    es: {
      title: "Glosario electoral de Alemania — términos clave explicados | Wahlblick",
      description: "Glosario electoral: primer y segundo voto, circunscripción, mandato excedente, valla del 5 %, encuestas y más — explicados de forma breve, neutral y con traducción. En alemán, español e inglés.",
      ogTitle: "Glosario electoral de Alemania — términos clave explicados",
      ogDescription: "Primer y segundo voto, mandato excedente, valla del 5 %, encuestas y más — explicados simple, neutral y con traducción, en wahlblick.de.",
      twDescription: "Términos electorales alemanes explicados de forma breve, neutral y con traducción."
    },
    en: {
      title: "German electoral glossary — key terms explained | Wahlblick",
      description: "Electoral glossary: first and second vote, constituency, overhang seat, the 5% threshold, polls and more — explained briefly, neutrally and with translation. In German, Spanish and English.",
      ogTitle: "German electoral glossary — key terms explained",
      ogDescription: "First and second vote, overhang seat, the 5% threshold, polls and more — explained simply, neutrally and with translation, on wahlblick.de.",
      twDescription: "German electoral terms explained briefly, neutrally and with translation."
    }
  },
  {
    file: "sachsen-anhalt.html", path: "sachsen-anhalt.html",
    es: {
      title: "Elecciones estatales de Sajonia-Anhalt 2026 — fecha, historial y resultados | Wahlblick",
      description: "Elección estatal (Landtag) de Sajonia-Anhalt el 6 de septiembre de 2026: la fecha, los resultados de 2021, 2016 y 2011, y —la noche electoral— las cifras en vivo. Neutral, con fuentes, en alemán, español e inglés.",
      ogTitle: "Elecciones estatales de Sajonia-Anhalt 2026 — fecha y resultados",
      ogDescription: "Fecha, historial y resultados de la elección estatal de Sajonia-Anhalt — neutral y con fuentes en wahlblick.de.",
      twDescription: "Fecha, historial y resultados de la elección estatal de Sajonia-Anhalt — neutral y con fuentes."
    },
    en: {
      title: "Saxony-Anhalt state election 2026 — date, history & results | Wahlblick",
      description: "Saxony-Anhalt state election (Landtag) on 6 September 2026: the date, the results of 2021, 2016 and 2011, and — on election night — the live figures. Neutral, sourced, in German, Spanish and English.",
      ogTitle: "Saxony-Anhalt state election 2026 — date & results",
      ogDescription: "Date, history and results of the Saxony-Anhalt state election — neutral and sourced on wahlblick.de.",
      twDescription: "Date, history and results of the Saxony-Anhalt state election — neutral and sourced."
    }
  },
  {
    file: "mecklenburg-vorpommern.html", path: "mecklenburg-vorpommern.html",
    es: {
      title: "Elecciones estatales de Mecklemburgo-Pomerania Occidental 2026 — fecha, historial y resultados | Wahlblick",
      description: "Elección estatal (Landtag) de Mecklemburgo-Pomerania Occidental el 20 de septiembre de 2026: la fecha, los resultados de 2021, 2016 y 2011, y —la noche electoral— las cifras en vivo. Neutral, con fuentes, en tres idiomas.",
      ogTitle: "Elecciones estatales de Mecklemburgo-Pomerania Occidental 2026 — fecha y resultados",
      ogDescription: "Fecha, historial y resultados de la elección estatal de Mecklemburgo-Pomerania Occidental — neutral y con fuentes en wahlblick.de.",
      twDescription: "Fecha, historial y resultados de la elección estatal de Mecklemburgo-Pomerania Occidental."
    },
    en: {
      title: "Mecklenburg-Vorpommern state election 2026 — date, history & results | Wahlblick",
      description: "Mecklenburg-Vorpommern state election (Landtag) on 20 September 2026: the date, the results of 2021, 2016 and 2011, and — on election night — the live figures. Neutral, sourced, in three languages.",
      ogTitle: "Mecklenburg-Vorpommern state election 2026 — date & results",
      ogDescription: "Date, history and results of the Mecklenburg-Vorpommern state election — neutral and sourced on wahlblick.de.",
      twDescription: "Date, history and results of the Mecklenburg-Vorpommern state election."
    }
  },
  {
    file: "berlin.html", path: "berlin.html",
    es: {
      title: "Elecciones al Abgeordnetenhaus de Berlín 2026 — fecha, historial y resultados | Wahlblick",
      description: "Elección al Abgeordnetenhaus (parlamento) de Berlín el 20 de septiembre de 2026: la fecha, los resultados de 2023, 2021 y 2016, y —la noche electoral— las cifras en vivo. Neutral, con fuentes, en tres idiomas.",
      ogTitle: "Elecciones al Abgeordnetenhaus de Berlín 2026 — fecha y resultados",
      ogDescription: "Fecha, historial y resultados de la elección al Abgeordnetenhaus de Berlín — neutral y con fuentes en wahlblick.de.",
      twDescription: "Fecha, historial y resultados de la elección al Abgeordnetenhaus de Berlín."
    },
    en: {
      title: "Berlin Abgeordnetenhaus election 2026 — date, history & results | Wahlblick",
      description: "Election to the Berlin Abgeordnetenhaus (parliament) on 20 September 2026: the date, the results of 2023, 2021 and 2016, and — on election night — the live figures. Neutral, sourced, in three languages.",
      ogTitle: "Berlin Abgeordnetenhaus election 2026 — date & results",
      ogDescription: "Date, history and results of the Berlin Abgeordnetenhaus election — neutral and sourced on wahlblick.de.",
      twDescription: "Date, history and results of the Berlin Abgeordnetenhaus election."
    }
  },
  {
    file: "sitzverteilung.html", path: "sitzverteilung.html",
    es: {
      title: "Cómo se reparten los escaños del Bundestag — Wahlblick",
      description: "El segundo voto, la valla del 5 %, el método Sainte-Laguë y la reforma de 2023, explicados de forma simple — con los resultados reales de la elección federal de 2025.",
      ogTitle: "Cómo se reparten los escaños del Bundestag — Wahlblick",
      ogDescription: "El segundo voto, la valla del 5 %, el método Sainte-Laguë y la reforma de 2023, explicados con los resultados reales de 2025.",
      twDescription: "El segundo voto, la valla del 5 %, el método Sainte-Laguë y la reforma de 2023, explicados con datos reales de 2025."
    },
    en: {
      title: "How the Bundestag's seats are allocated — Wahlblick",
      description: "The second vote, the 5% threshold, the Sainte-Laguë method and the 2023 reform, explained simply — using the real results of the 2025 federal election.",
      ogTitle: "How the Bundestag's seats are allocated — Wahlblick",
      ogDescription: "The second vote, the 5% threshold, the Sainte-Laguë method and the 2023 reform, explained with the real 2025 results.",
      twDescription: "The second vote, the 5% threshold, Sainte-Laguë and the 2023 reform, explained with real 2025 data."
    }
  },
  {
    file: "parties.html", path: "parties.html",
    es: {
      title: "Partidos políticos en Alemania — Wahlblick",
      description: "Los partidos del Bundestag y de los parlamentos estatales (Landtage): año de fundación, historia y posiciones según su propio programa — neutral y sin valoración.",
      ogTitle: "Partidos políticos en Alemania — Wahlblick",
      ogDescription: "Los partidos del Bundestag y de los Landtage: fundación, historia y posiciones según su propio programa — neutral y sin valoración.",
      twDescription: "Los partidos del Bundestag y de los parlamentos estatales: fundación, historia y posiciones — neutral."
    },
    en: {
      title: "Political parties in Germany — Wahlblick",
      description: "The parties in the Bundestag and the state parliaments (Landtage): founding year, history and positions according to their own platform — neutral and without judgment.",
      ogTitle: "Political parties in Germany — Wahlblick",
      ogDescription: "The parties in the Bundestag and the Landtage: founding, history and positions from their own platform — neutral and without judgment.",
      twDescription: "The parties in the Bundestag and the state parliaments: founding, history and positions — neutral."
    }
  },
  {
    file: "grundgesetz.html", path: "grundgesetz.html",
    es: {
      title: "La Ley Fundamental (Grundgesetz) — Wahlblick",
      description: "La Ley Fundamental de Alemania explicada de forma simple: los derechos fundamentales (Art. 1–19) y la estructura del resto de los artículos — en alemán, español e inglés.",
      ogTitle: "La Ley Fundamental (Grundgesetz) — Wahlblick",
      ogDescription: "La Ley Fundamental de Alemania: los derechos fundamentales (Art. 1–19) y la estructura del resto de los artículos, explicados.",
      twDescription: "La Ley Fundamental de Alemania: los derechos fundamentales y la estructura de los artículos, explicados."
    },
    en: {
      title: "The Basic Law (Grundgesetz) — Wahlblick",
      description: "Germany's Basic Law explained simply: the fundamental rights (Art. 1–19) and the structure of the remaining articles — in German, Spanish and English.",
      ogTitle: "The Basic Law (Grundgesetz) — Wahlblick",
      ogDescription: "Germany's Basic Law: the fundamental rights (Art. 1–19) and the structure of the remaining articles, explained.",
      twDescription: "Germany's Basic Law: the fundamental rights and the structure of the articles, explained."
    }
  },
  {
    file: "government.html", path: "government.html",
    es: {
      title: "Formación de gobierno y coaliciones — Wahlblick",
      description: "Cómo se forma gobierno en Alemania: los tipos de coalición (semáforo, gran coalición, Jamaica, Kenia) explicados de forma simple.",
      ogTitle: "Formación de gobierno y coaliciones — Wahlblick",
      ogDescription: "Los tipos de coalición en Alemania (semáforo, gran coalición, Jamaica, Kenia) explicados de forma simple.",
      twDescription: "Cómo se forma gobierno en Alemania: los tipos de coalición explicados."
    },
    en: {
      title: "Government formation and coalitions — Wahlblick",
      description: "How governments form in Germany: the coalition types (traffic light, grand coalition, Jamaica, Kenya) explained simply.",
      ogTitle: "Government formation and coalitions — Wahlblick",
      ogDescription: "The coalition types in Germany (traffic light, grand coalition, Jamaica, Kenya) explained simply.",
      twDescription: "How governments form in Germany: the coalition types explained."
    }
  },
  {
    file: "directory.html", path: "directory.html",
    es: {
      title: "Directorio de direcciones útiles en Alemania — Wahlblick",
      description: "Directorio de puntos de contacto útiles en Alemania — desde organismos públicos hasta participación ciudadana. En alemán, español e inglés.",
      ogTitle: "Directorio de direcciones útiles en Alemania — Wahlblick",
      ogDescription: "Puntos de contacto útiles en Alemania: desde organismos públicos hasta participación ciudadana.",
      twDescription: "Directorio de puntos de contacto útiles en Alemania — organismos y participación ciudadana."
    },
    en: {
      title: "Directory of useful contacts in Germany — Wahlblick",
      description: "A directory of useful points of contact in Germany — from public authorities to citizen participation. In German, Spanish and English.",
      ogTitle: "Directory of useful contacts in Germany — Wahlblick",
      ogDescription: "Useful points of contact in Germany: from public authorities to citizen participation.",
      twDescription: "Directory of useful contacts in Germany — authorities and citizen participation."
    }
  },
  {
    file: "holidays.html", path: "holidays.html",
    es: {
      title: "Feriados en Alemania — Wahlblick",
      description: "Feriados legales en Alemania 2026 — a nivel nacional y por estado federado, con explicación de las diferencias regionales.",
      ogTitle: "Feriados en Alemania — Wahlblick",
      ogDescription: "Feriados legales en Alemania 2026: nacionales y por estado federado, con las diferencias regionales.",
      twDescription: "Feriados legales en Alemania 2026 — nacionales y por estado federado, con las diferencias regionales."
    },
    en: {
      title: "Public holidays in Germany — Wahlblick",
      description: "Statutory public holidays in Germany 2026 — nationwide and by federal state, with an explanation of the regional differences.",
      ogTitle: "Public holidays in Germany — Wahlblick",
      ogDescription: "Statutory public holidays in Germany 2026: nationwide and by state, with the regional differences.",
      twDescription: "Statutory public holidays in Germany 2026 — nationwide and by federal state."
    }
  },
  {
    file: "guide.html", path: "guide.html",
    es: {
      title: "Guía de uso — Wahlblick",
      description: "Guía de uso: cómo funciona el mapa electoral interactivo de Wahlblick — navegación del mapa y selección de idioma.",
      ogTitle: "Guía de uso — Wahlblick",
      ogDescription: "Cómo funciona el mapa electoral interactivo de Wahlblick: navegación y selección de idioma.",
      twDescription: "Guía de uso: cómo funciona el mapa electoral interactivo de Wahlblick."
    },
    en: {
      title: "User guide — Wahlblick",
      description: "User guide: how Wahlblick's interactive election map works — map navigation and language selection.",
      ogTitle: "User guide — Wahlblick",
      ogDescription: "How Wahlblick's interactive election map works: navigation and language selection.",
      twDescription: "User guide: how Wahlblick's interactive election map works."
    }
  },
  {
    file: "about.html", path: "about.html",
    es: {
      title: "Sobre Wahlblick — Wahlblick",
      description: "Sobre Wahlblick: objetivo, metodología y contexto del proyecto independiente de mapa electoral de Alemania.",
      ogTitle: "Sobre Wahlblick",
      ogDescription: "Objetivo, metodología y contexto del proyecto independiente de mapa electoral Wahlblick.",
      twDescription: "Sobre Wahlblick: objetivo, metodología y contexto del proyecto independiente de mapa electoral."
    },
    en: {
      title: "About Wahlblick — Wahlblick",
      description: "About Wahlblick: the goal, methodology and background of the independent election-map project for Germany.",
      ogTitle: "About Wahlblick",
      ogDescription: "The goal, methodology and background of the independent Wahlblick election-map project.",
      twDescription: "About Wahlblick: the goal, methodology and background of the independent election-map project."
    }
  }
];

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escRepl = (s) => String(s).replace(/\$/g, "$$$$"); // $ es especial en replace()

function generate(page, lang) {
  const src = path.join(ROOT, page.file);
  const meta = page[lang.code];
  let html = fs.readFileSync(src, "utf8");
  const deUrl = "https://wahlblick.de/" + page.path;
  const trUrl = "https://wahlblick.de/" + lang.dir + "/" + page.path;

  function req(re, value, label) {
    if (!re.test(html)) throw new Error("build-i18n [" + page.file + "/" + lang.code + "]: falta « " + label + " » — ¿cambió el head?");
    html = html.replace(re, escRepl(value));
  }
  function opt(re, value) { if (value !== undefined && re.test(html)) html = html.replace(re, escRepl(value)); }

  req(/<html lang="de">/, '<html lang="' + lang.code + '">', "html lang");
  req(/<title>[^<]*<\/title>/, "<title>" + meta.title + "</title>", "title");
  req(new RegExp('<link rel="canonical" href="' + escRe(deUrl) + '">'), '<link rel="canonical" href="' + trUrl + '">', "canonical");
  req(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + meta.description + '">', "meta description");

  opt(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + meta.ogTitle + '">');
  opt(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + meta.ogDescription + '">');
  opt(new RegExp('<meta property="og:url" content="' + escRe(deUrl) + '">'), '<meta property="og:url" content="' + trUrl + '">');
  opt(/<meta property="og:locale" content="de_DE">/, '<meta property="og:locale" content="' + lang.ogLocale + '">');
  opt(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + (meta.twTitle || meta.ogTitle) + '">');
  opt(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + meta.twDescription + '">');

  // forzar el idioma al cargar, antes de que el script de la página lea localStorage
  req(/<body>/, '<body>\n<script>try{localStorage.setItem("wahlblickLang","' + lang.storage + '")}catch(e){}</script>', "<body>");

  // horneado del cuerpo (solo la home): targets compartidos, valores por idioma
  (page.bakeTargets || []).forEach(function (re, i) {
    if (!re.test(html)) throw new Error("build-i18n [" + page.file + "]: falta el bake #" + (i + 1));
    html = html.replace(re, "$1" + escRepl(meta.bake[i]) + "$2");
  });

  // rutas absolutas para resolver desde /es/ /en/.  Solo links literales
  // X.html(?query|#ancla) y assets X.svg/png/… — nunca el href="' + var + '".
  html = html.replace(/href="([\w-]+\.html(?:[?#][^"]*)?)"/g, 'href="/$1"');
  html = html.replace(/(href|src)="([\w-]+\.(?:svg|png|ico|jpe?g|webp))"/g, '$1="/$2"');
  html = html.replace(/href=\\"([\w-]+\.html(?:#[\w-]+)?)\\"/g, 'href=\\"/$1\\"'); // i18n con comillas dobles escapadas
  html = html.replace(/href: "([\w-]+\.html(?:[?#][^"]*)?)"/g, 'href: "/$1"');     // links en datos JS (ELECTIONS…)

  const outDir = path.join(ROOT, lang.dir);
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, page.file);
  fs.writeFileSync(out, html, "utf8");
  return lang.dir + "/" + page.file + " (" + html.length + " bytes)";
}

LANGS.forEach(function (lang) {
  PAGES.forEach(function (p) { console.log("build-i18n: " + generate(p, lang)); });
});

/* ───────────────────────────────────────────────────────────────────────────
 * sitemap.xml — AUTOGENERADO desde PAGES (+ páginas solo-DE). Así ninguna URL
 * se olvida: sumar una página a PAGES la mete sola en el sitemap (en los 3
 * idiomas). `lastmod` = mtime del archivo FUENTE alemán (también para sus /es/
 * y /en/, que derivan de él) → solo cambia cuando la página se edita de verdad,
 * no en cada build. La DE puede ir un escalón de prioridad por encima de es/en
 * (loc); si a una página nueva le falta el ajuste, se usa SM_DEFAULT y aparece
 * igual. El orden de las URLs no afecta al SEO.
 * ────────────────────────────────────────────────────────────────────────── */
const SITE = "https://wahlblick.de";
const SM = {
  "index.html":                  { cf: "weekly",  de: "1.0", loc: "0.9" },
  "landtagswahlen-2026.html":    { cf: "weekly",  de: "0.8" },
  "sachsen-anhalt.html":         { cf: "weekly",  de: "0.8" },
  "mecklenburg-vorpommern.html": { cf: "weekly",  de: "0.8" },
  "berlin.html":                 { cf: "weekly",  de: "0.8" },
  "faq.html":                    { cf: "monthly", de: "0.7" },
  "glossar.html":                { cf: "monthly", de: "0.7" },
  "sitzverteilung.html":         { cf: "monthly", de: "0.7" },
  "parties.html":                { cf: "yearly",  de: "0.7" },
  "grundgesetz.html":            { cf: "yearly",  de: "0.7", loc: "0.6" },
  "government.html":             { cf: "yearly",  de: "0.6" },
  "directory.html":              { cf: "weekly",  de: "0.7", loc: "0.6" },
  "holidays.html":               { cf: "yearly",  de: "0.6", loc: "0.5" },
  "guide.html":                  { cf: "monthly", de: "0.5" },
  "about.html":                  { cf: "monthly", de: "0.6" }
};
const SM_DEFAULT = { cf: "monthly", de: "0.6" };
const DE_ONLY = [  // páginas legales, solo alemán (sin /es/ /en/)
  { file: "impressum.html",   cf: "yearly", pr: "0.3" },
  { file: "datenschutz.html", cf: "yearly", pr: "0.3" },
  { file: "disclaimer.html",  cf: "yearly", pr: "0.3" }
];

function lastmod(file) {
  return fs.statSync(path.join(ROOT, file)).mtime.toISOString().slice(0, 10);
}
function urlBlock(loc, mod, cf, pr) {
  return "  <url>\n    <loc>" + loc + "</loc>\n    <lastmod>" + mod +
    "</lastmod>\n    <changefreq>" + cf + "</changefreq>\n    <priority>" + pr + "</priority>\n  </url>";
}
function buildSitemap() {
  const blocks = [];
  PAGES.forEach(function (p) {                    // DE (raíz)
    const sm = SM[p.file] || SM_DEFAULT;
    blocks.push(urlBlock(SITE + "/" + p.path, lastmod(p.file), sm.cf, sm.de));
  });
  DE_ONLY.forEach(function (p) {                  // legales solo-DE
    blocks.push(urlBlock(SITE + "/" + p.file, lastmod(p.file), p.cf, p.pr));
  });
  LANGS.forEach(function (lang) {                 // /es/ y /en/ (lastmod = fuente DE)
    PAGES.forEach(function (p) {
      const sm = SM[p.file] || SM_DEFAULT;
      blocks.push(urlBlock(SITE + "/" + lang.dir + "/" + p.path, lastmod(p.file), sm.cf, sm.loc || sm.de));
    });
  });
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    blocks.join("\n") + "\n</urlset>\n";
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
  return blocks.length;
}
console.log("build-i18n: sitemap.xml (" + buildSitemap() + " URLs)");
