// Cloudflare Pages Function: injects the shared content navigation
// (Die Parteien / Deutschland / Wahlsystem dropdowns + the share button)
// into every HTML page from a single source, so the pages of the site
// never need to hand-copy this block again.
//
// How it works:
//  - Each page has an empty `<div id="contentNavMount"></div>` in its header.
//  - This Function intercepts the HTML response and replaces that div with
//    the nav markup + a small inline <script> (dropdown open/close, share
//    button, i18n).
//  - Runs at Cloudflare's edge before the response reaches the browser, so
//    the injected <script> executes normally (this is not client-side
//    innerHTML injection, which browsers would refuse to execute).

const NAV_STYLE = `<style>
.brand .brand-logo{display:block;height:38px;width:auto}
@media (max-width:720px){.brand .brand-logo{height:34px}}
@media (max-width:420px){.brand .brand-logo{height:30px}}
/* Interior "push-up": centralized typography lift for the standard mold
   pages (.page-hero / .panel — sitzverteilung, parties, government,
   grundgesetz, holidays, directory). Prefixed with 'body' so it out-
   specifies each page's own inline rules (injected after this shared
   style). Kicker markup + text stay per-page; this only styles it. */
body .page-kicker{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:0 0 10px}
body .page-hero h1{font-size:38px;letter-spacing:-0.022em;line-height:1.1}
body .page-hero .intro{font-size:17px;line-height:1.55;color:#3d4450;max-width:620px}
body .panel h2:not(.related-h){position:relative;padding-left:15px;font-size:20px;font-weight:800;letter-spacing:-0.01em}
body .panel h2:not(.related-h)::before{content:"";position:absolute;left:0;top:.12em;width:5px;height:.82em;background:var(--accent);border-radius:2px}
body .panel .panel-sub{font-size:13.5px}
body .panel p.plain{font-size:15px}
@media (max-width:720px){body .page-hero h1{font-size:27px}}
.content-nav{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.content-nav a{font-size:12.5px;font-weight:600;color:var(--text-muted);text-decoration:none;white-space:nowrap}
.content-nav a:hover{color:var(--accent)}
.nav-dropdown{position:relative}
.nav-dropdown-trigger{display:flex;align-items:center;gap:5px;border:none;background:none;padding:0;font-size:12.5px;font-weight:600;color:var(--text-muted);cursor:pointer;white-space:nowrap;font-family:inherit}
.nav-dropdown-trigger:hover{color:var(--accent)}
.nav-dropdown-trigger .chevron{transition:transform .15s ease}
.nav-dropdown-trigger[aria-expanded="true"] .chevron{transform:rotate(180deg)}
.nav-dropdown-trigger[aria-expanded="true"]{color:var(--accent)}
.nav-dropdown-panel{position:absolute;top:calc(100% + 10px);right:0;z-index:20;display:none;flex-direction:column;min-width:190px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);box-shadow:0 8px 24px rgba(0,0,0,.14);padding:6px}
.nav-dropdown-panel a{font-size:13px;font-weight:600;color:var(--text);text-decoration:none;white-space:nowrap;padding:8px 10px;border-radius:var(--radius);display:block}
.nav-dropdown-panel a:hover{background:var(--surface);color:var(--accent)}
.nav-dropdown-panel:not([hidden]){display:flex}
@media (max-width: 720px) {
  .nav-dropdown-panel{left:0;right:auto}
}
.content-nav-share{border:none;background:none;color:var(--text-muted);padding:6px;cursor:pointer;border-radius:var(--radius);display:flex;align-items:center;justify-content:center;flex:none}
.content-nav-share:hover{color:var(--accent);background:var(--surface)}
.content-nav-share svg{width:16px;height:16px}
.content-nav-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(8px);background:var(--text);color:var(--bg);font-size:13px;font-weight:600;padding:10px 18px;border-radius:var(--radius);box-shadow:0 4px 16px rgba(0,0,0,.18);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;z-index:500}
.content-nav-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.content-nav a.content-nav-featured{font-weight:700;color:var(--accent)}
.content-nav a.content-nav-featured:hover{color:var(--accent);text-decoration:underline}
/* Language switcher: a test user missed it because muted DE·ES·EN text did
   not read as a control. Give it a globe icon + a segmented-pill frame so it
   clearly looks tappable. Scoped as ".site-header .lang-switch" (specificity
   0,2,0) so it overrides each page's own inline ".lang-switch" rules, which
   are injected after this shared style. */
.site-header .lang-switch{gap:1px;border:1px solid var(--border);border-radius:999px;padding:2px 2px 2px 4px;background:var(--bg)}
.site-header .lang-switch::before{content:"";width:15px;height:15px;margin:0 3px 0 2px;flex:none;opacity:.8;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='2' y1='12' x2='22' y2='12'/%3E%3Cpath d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/%3E%3C/svg%3E") center/contain no-repeat}
.site-header .lang-switch .sep{display:none}
.site-header .lang-switch button{border-radius:999px}
.site-header .lang-switch button.active{color:#fff;background:var(--accent)}
@media (max-width:720px){.site-header .lang-switch{padding:1px 2px 1px 3px}.site-header .lang-switch::before{width:13px;margin:0 2px 0 1px}}
/* "Weiterlesen" related-page cards at the foot of content pages (parties,
   government, sitzverteilung, …). Shared here so the component stays
   consistent and phase-2 pages only need to add the markup + text. */
.related-h{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin:30px 0 12px}
.related-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
.related-card{display:flex;flex-direction:column;gap:5px;text-decoration:none;color:var(--text);border:1px solid var(--border);border-radius:10px;padding:14px 16px;transition:border-color .12s,background .12s}
.related-card:hover{border-color:var(--accent);background:var(--surface)}
.related-card-title{font-size:14.5px;font-weight:700}
.related-card-title::after{content:" →";color:var(--accent)}
.related-card-desc{font-size:12.5px;line-height:1.45;color:var(--text-muted)}
@media (max-width:720px){.related-grid{grid-template-columns:1fr}}
/* Unified mobile hamburger for the internal pages — same pattern as the
   home's bespoke menu, injected here so every page shares it. On mobile the
   inline content-nav is hidden and this toggle opens a full-width panel on a
   slightly off-white surface (so the reader sees they are in the access menu,
   not the page). The home keeps its own menu and hides this injected one. */
.content-nav-toggle{display:none;order:9;flex:none;width:32px;height:32px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);padding:0;cursor:pointer;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.content-nav-toggle span{width:16px;height:2px;background:var(--text);border-radius:1px}
.content-nav-toggle[aria-expanded="true"] span:nth-child(1){transform:translateY(6px) rotate(45deg)}
.content-nav-toggle[aria-expanded="true"] span:nth-child(2){opacity:0}
.content-nav-toggle[aria-expanded="true"] span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.content-nav-mobile{display:none;position:absolute;top:100%;left:0;right:0;z-index:90;flex-direction:column;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:#eaf0f8;padding:6px 16px 12px;box-shadow:0 10px 24px rgba(0,0,0,.10)}
.content-nav-mobile.open{display:flex}
.content-nav-mobile a{font-size:14px;font-weight:600;color:var(--text);text-decoration:none;padding:10px 0;border-bottom:1px solid var(--border)}
.content-nav-mobile a:last-child{border-bottom:none}
.content-nav-mobile a.cnav-m-back{color:var(--text-muted);font-weight:700}
.content-nav-mobile a.cnav-m-featured{color:var(--accent);font-weight:700}
.cnav-m-group{display:flex;flex-direction:column;padding-left:14px;margin-left:2px;border-left:2px solid var(--border)}
.cnav-m-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);padding:10px 0 2px}
.cnav-m-group a{font-size:13.5px}
.cnav-m-share{display:flex;align-items:center;gap:8px;width:100%;margin-top:8px;padding:12px 0 4px;border:none;border-top:1px solid var(--border);background:none;font-family:inherit;font-size:14px;font-weight:600;color:var(--accent);cursor:pointer;text-align:left}
.cnav-m-share svg{width:16px;height:16px;flex:none}
@media (max-width:720px){
  .content-nav{display:none}
  .content-nav-share{display:none}
  .content-nav-toggle{display:flex}
  .site-header .back-link{display:none}
}
</style>`;

const CHEVRON = '<svg class="chevron" width="9" height="6" viewBox="0 0 9 6" aria-hidden="true"><path d="M1 1l3.5 3.5L8 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const NAV_HTML = `<nav class="content-nav" aria-label="Weitere Inhalte">
  <a href="/landtagswahlen-2026.html" class="content-nav-featured" id="navElections2026">Landtagswahlen 2026</a>
  <div class="nav-dropdown" id="partiesDropdown">
    <button type="button" class="nav-dropdown-trigger" id="partiesDropdownTrigger" aria-expanded="false" aria-controls="partiesDropdownPanel">
      <span id="navPartiesGroupLabel">Die Parteien</span>
      ${CHEVRON}
    </button>
    <div class="nav-dropdown-panel" id="partiesDropdownPanel" hidden>
      <a href="/parties.html" id="navPartiesLink">Parteien</a>
    </div>
  </div>
  <div class="nav-dropdown" id="wahlsystemDropdown">
    <button type="button" class="nav-dropdown-trigger" id="wahlsystemDropdownTrigger" aria-expanded="false" aria-controls="wahlsystemDropdownPanel">
      <span id="navWahlsystemGroupLabel">Wahlsystem</span>
      ${CHEVRON}
    </button>
    <div class="nav-dropdown-panel" id="wahlsystemDropdownPanel" hidden>
      <a href="/sitzverteilung.html" id="navSitzverteilungLink">Sitzverteilung erklärt</a>
      <a href="/glossar.html" id="navGlossarLink">Wahllexikon</a>
      <a href="/government.html" id="navGovernmentLink">Koalitionen</a>
    </div>
  </div>
  <div class="nav-dropdown" id="germanyDropdown">
    <button type="button" class="nav-dropdown-trigger" id="germanyDropdownTrigger" aria-expanded="false" aria-controls="germanyDropdownPanel">
      <span id="navGermanyLabel">Deutschland</span>
      ${CHEVRON}
    </button>
    <div class="nav-dropdown-panel" id="germanyDropdownPanel" hidden>
      <a href="/grundgesetz.html" id="navGrundgesetzLink">Grundgesetz</a>
      <a href="/directory.html" id="navDirectoryLink">Adressverzeichnis</a>
      <a href="/holidays.html" id="navHolidaysLink">Feiertage</a>
      <a href="/faq.html" id="navFaqLink">Häufige Fragen</a>
      <a href="/guide.html" id="navGuideLink">Nutzungshinweise</a>
    </div>
  </div>
</nav>
<button type="button" class="content-nav-share" id="shareBtn" aria-label="Teilen" title="Teilen">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
</button>
<div class="content-nav-toast" id="shareToast" role="status" aria-live="polite"></div>
<button type="button" class="content-nav-toggle" id="cnavToggle" aria-expanded="false" aria-controls="cnavMobile" aria-label="Menü"><span></span><span></span><span></span></button>
<div class="content-nav-mobile" id="cnavMobile">
  <a href="/index.html" class="cnav-m-back" id="cnavBack">← Zur Wahlkarte</a>
  <a href="/landtagswahlen-2026.html" class="cnav-m-featured" id="cnavMElections">Landtagswahlen 2026</a>
  <span class="cnav-m-label" id="cnavMPartiesLabel">Die Parteien</span>
  <div class="cnav-m-group"><a href="/parties.html" id="cnavMParties">Parteien</a></div>
  <span class="cnav-m-label" id="cnavMWahlsystemLabel">Wahlsystem</span>
  <div class="cnav-m-group"><a href="/sitzverteilung.html" id="cnavMSitz">Sitzverteilung erklärt</a><a href="/glossar.html" id="cnavMGlossar">Wahllexikon</a><a href="/government.html" id="cnavMGov">Koalitionen</a></div>
  <span class="cnav-m-label" id="cnavMGermanyLabel">Deutschland</span>
  <div class="cnav-m-group"><a href="/grundgesetz.html" id="cnavMGrund">Grundgesetz</a><a href="/directory.html" id="cnavMDir">Adressverzeichnis</a><a href="/holidays.html" id="cnavMHol">Feiertage</a><a href="/faq.html" id="cnavMFaq">Häufige Fragen</a><a href="/guide.html" id="cnavMGuide">Nutzungshinweise</a></div>
  <button type="button" class="cnav-m-share" id="cnavMShare"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg><span id="cnavMShareLabel">Teilen</span></button>
</div>
<script>
(function () {
  var LABELS = {
    de: { elections2026: "Landtagswahlen 2026", partiesGroup: "Die Parteien", germany: "Deutschland", wahlsystem: "Wahlsystem", parties: "Parteien", government: "Koalitionen", grundgesetz: "Grundgesetz", directory: "Adressverzeichnis", holidays: "Feiertage", faq: "Häufige Fragen", guide: "Nutzungshinweise", sitzverteilung: "Sitzverteilung erklärt", glossar: "Wahllexikon", shareLabel: "Teilen", shareCopied: "Link kopiert", backToMap: "← Zur Wahlkarte" },
    es: { elections2026: "Elecciones estatales 2026", partiesGroup: "Los partidos", germany: "Alemania", wahlsystem: "Sistema electoral", parties: "Partidos", government: "Coaliciones", grundgesetz: "Ley Fundamental", directory: "Directorio", holidays: "Feriados", faq: "Preguntas frecuentes", guide: "Guía de uso", sitzverteilung: "Cómo se reparten las bancas", glossar: "Glosario", shareLabel: "Compartir", shareCopied: "Link copiado", backToMap: "← Volver al mapa" },
    en: { elections2026: "State elections 2026", partiesGroup: "Parties", germany: "Germany", wahlsystem: "Electoral system", parties: "Parties", government: "Coalitions", grundgesetz: "Basic Law", directory: "Directory", holidays: "Holidays", faq: "FAQ", guide: "User Guide", sitzverteilung: "How seats are allocated", glossar: "Glossary", shareLabel: "Share", shareCopied: "Link copied", backToMap: "← Back to the map" }
  };
  function currentLang() { return localStorage.getItem("wahlblickLang") || "de"; }
  function applyLabels(lang) {
    var l = LABELS[lang] || LABELS.de;
    var map = {
      navElections2026: l.elections2026,
      navPartiesGroupLabel: l.partiesGroup,
      navGermanyLabel: l.germany,
      navWahlsystemGroupLabel: l.wahlsystem,
      navPartiesLink: l.parties,
      navGovernmentLink: l.government,
      navGrundgesetzLink: l.grundgesetz,
      navDirectoryLink: l.directory,
      navHolidaysLink: l.holidays,
      navFaqLink: l.faq,
      navGuideLink: l.guide,
      navSitzverteilungLink: l.sitzverteilung,
      navGlossarLink: l.glossar,
      cnavBack: l.backToMap,
      cnavMElections: l.elections2026,
      cnavMPartiesLabel: l.partiesGroup,
      cnavMParties: l.parties,
      cnavMWahlsystemLabel: l.wahlsystem,
      cnavMSitz: l.sitzverteilung,
      cnavMGlossar: l.glossar,
      cnavMGov: l.government,
      cnavMGermanyLabel: l.germany,
      cnavMGrund: l.grundgesetz,
      cnavMDir: l.directory,
      cnavMHol: l.holidays,
      cnavMFaq: l.faq,
      cnavMGuide: l.guide,
      cnavMShareLabel: l.shareLabel
    };
    for (var id in map) {
      var el = document.getElementById(id);
      if (el) el.textContent = map[id];
    }
    var shareBtnEl = document.getElementById("shareBtn");
    if (shareBtnEl) {
      shareBtnEl.setAttribute("aria-label", l.shareLabel);
      shareBtnEl.setAttribute("title", l.shareLabel);
    }
  }
  applyLabels(currentLang());
  // Event delegation on document, not per-button listeners: this inline
  // script runs at parse time, before .lang-switch (later in the DOM) has
  // been parsed, so binding directly to the buttons here would find none.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".lang-switch button[data-lang]");
    if (btn) applyLabels(btn.getAttribute("data-lang"));
  });

  var closers = {};
  function wireDropdown(key, triggerId, panelId, wrapId) {
    var trigger = document.getElementById(triggerId);
    var panel = document.getElementById(panelId);
    var wrap = document.getElementById(wrapId);
    if (!trigger || !panel || !wrap) return;
    function close() { panel.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
    closers[key] = close;
    trigger.addEventListener("click", function () {
      var willOpen = panel.hidden;
      for (var k in closers) { if (k !== key) closers[k](); }
      if (willOpen) { panel.hidden = false; trigger.setAttribute("aria-expanded", "true"); }
      else close();
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) close();
    });
  }
  wireDropdown("parties", "partiesDropdownTrigger", "partiesDropdownPanel", "partiesDropdown");
  wireDropdown("germany", "germanyDropdownTrigger", "germanyDropdownPanel", "germanyDropdown");
  wireDropdown("wahlsystem", "wahlsystemDropdownTrigger", "wahlsystemDropdownPanel", "wahlsystemDropdown");

  var shareBtn = document.getElementById("shareBtn");
  var shareToast = document.getElementById("shareToast");
  var shareToastTimer = null;
  function showShareToast(text) {
    shareToast.textContent = text;
    shareToast.classList.add("show");
    clearTimeout(shareToastTimer);
    shareToastTimer = setTimeout(function () { shareToast.classList.remove("show"); }, 2200);
  }
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      var shareData = { title: document.title, url: location.href };
      if (navigator.share) {
        navigator.share(shareData).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () {
          showShareToast((LABELS[currentLang()] || LABELS.de).shareCopied);
        }).catch(function () {});
      }
    });
  }

  var cnavToggle = document.getElementById("cnavToggle");
  var cnavMobile = document.getElementById("cnavMobile");
  if (cnavToggle && cnavMobile) {
    function closeCnav() { cnavMobile.classList.remove("open"); cnavToggle.setAttribute("aria-expanded", "false"); }
    cnavToggle.addEventListener("click", function () {
      var open = cnavMobile.classList.toggle("open");
      cnavToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!cnavMobile.classList.contains("open")) return;
      if (cnavToggle.contains(e.target) || cnavMobile.contains(e.target)) return;
      closeCnav();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeCnav();
    });
  }
  var cnavMShare = document.getElementById("cnavMShare");
  if (cnavMShare) {
    cnavMShare.addEventListener("click", function () {
      var shareData = { title: document.title, url: location.href };
      if (navigator.share) { navigator.share(shareData).catch(function () {}); }
      else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () {
          showShareToast((LABELS[currentLang()] || LABELS.de).shareCopied);
        }).catch(function () {});
      }
    });
  }
})();
</script>`;

// Google Analytics 4 tag (gtag.js), property G-ZBGVVJF0TD. Injected once here
// so it lands in the <head> of all 48 pages (root + /en/ + /es/) from a single
// source. NOTE: keep this string free of backticks and ${...} — it lives inside
// this module and a stray backtick would close the file's template literals and
// silently break every Cloudflare deploy. DSGVO: this loads Google cookies with
// no consent gate yet — a consent banner (Consent Mode v2) is the pending step.
const GA_TAG = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZBGVVJF0TD"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-ZBGVVJF0TD');
</script>`;

class HeadStyleInjector {
  element(element) {
    // Prepend (not append) so each page's own <style> — which may contain
    // page-specific overrides, e.g. index.html hiding .content-nav on
    // mobile in favor of its hamburger menu — comes later and wins the
    // cascade, without needing !important.
    element.prepend(NAV_STYLE, { html: true });
    // Prepended after NAV_STYLE, so gtag ends up first — right after <head>,
    // as Google recommends (highest position in the head).
    element.prepend(GA_TAG, { html: true });
  }
}

class ContentNavInjector {
  element(element) {
    element.replace(NAV_HTML, { html: true });
  }
}

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("head", new HeadStyleInjector())
    .on("#contentNavMount", new ContentNavInjector())
    .transform(response);
}
