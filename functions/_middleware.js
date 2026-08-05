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
</style>`;

const CHEVRON = '<svg class="chevron" width="9" height="6" viewBox="0 0 9 6" aria-hidden="true"><path d="M1 1l3.5 3.5L8 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const NAV_HTML = `<nav class="content-nav" aria-label="Weitere Inhalte">
  <div class="nav-dropdown" id="partiesDropdown">
    <button type="button" class="nav-dropdown-trigger" id="partiesDropdownTrigger" aria-expanded="false" aria-controls="partiesDropdownPanel">
      <span id="navPartiesGroupLabel">Die Parteien</span>
      ${CHEVRON}
    </button>
    <div class="nav-dropdown-panel" id="partiesDropdownPanel" hidden>
      <a href="parties.html" id="navPartiesLink">Parteien</a>
    </div>
  </div>
  <div class="nav-dropdown" id="wahlsystemDropdown">
    <button type="button" class="nav-dropdown-trigger" id="wahlsystemDropdownTrigger" aria-expanded="false" aria-controls="wahlsystemDropdownPanel">
      <span id="navWahlsystemGroupLabel">Wahlsystem</span>
      ${CHEVRON}
    </button>
    <div class="nav-dropdown-panel" id="wahlsystemDropdownPanel" hidden>
      <a href="sitzverteilung.html" id="navSitzverteilungLink">Sitzverteilung erklärt</a>
      <a href="government.html" id="navGovernmentLink">Koalitionen</a>
    </div>
  </div>
  <div class="nav-dropdown" id="germanyDropdown">
    <button type="button" class="nav-dropdown-trigger" id="germanyDropdownTrigger" aria-expanded="false" aria-controls="germanyDropdownPanel">
      <span id="navGermanyLabel">Deutschland</span>
      ${CHEVRON}
    </button>
    <div class="nav-dropdown-panel" id="germanyDropdownPanel" hidden>
      <a href="grundgesetz.html" id="navGrundgesetzLink">Grundgesetz</a>
      <a href="directory.html" id="navDirectoryLink">Adressverzeichnis</a>
      <a href="holidays.html" id="navHolidaysLink">Feiertage</a>
    </div>
  </div>
</nav>
<button type="button" class="content-nav-share" id="shareBtn" aria-label="Teilen" title="Teilen">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
</button>
<div class="content-nav-toast" id="shareToast" role="status" aria-live="polite"></div>
<script>
(function () {
  var LABELS = {
    de: { partiesGroup: "Die Parteien", germany: "Deutschland", wahlsystem: "Wahlsystem", parties: "Parteien", government: "Koalitionen", grundgesetz: "Grundgesetz", directory: "Adressverzeichnis", holidays: "Feiertage", sitzverteilung: "Sitzverteilung erklärt", shareLabel: "Teilen", shareCopied: "Link kopiert" },
    es: { partiesGroup: "Los partidos", germany: "Alemania", wahlsystem: "Sistema electoral", parties: "Partidos", government: "Coaliciones", grundgesetz: "Ley Fundamental", directory: "Directorio", holidays: "Feriados", sitzverteilung: "Cómo se reparten las bancas", shareLabel: "Compartir", shareCopied: "Link copiado" },
    en: { partiesGroup: "Parties", germany: "Germany", wahlsystem: "Electoral system", parties: "Parties", government: "Coalitions", grundgesetz: "Basic Law", directory: "Directory", holidays: "Holidays", sitzverteilung: "How seats are allocated", shareLabel: "Share", shareCopied: "Link copied" }
  };
  function currentLang() { return localStorage.getItem("wahlblickLang") || "de"; }
  function applyLabels(lang) {
    var l = LABELS[lang] || LABELS.de;
    var map = {
      navPartiesGroupLabel: l.partiesGroup,
      navGermanyLabel: l.germany,
      navWahlsystemGroupLabel: l.wahlsystem,
      navPartiesLink: l.parties,
      navGovernmentLink: l.government,
      navGrundgesetzLink: l.grundgesetz,
      navDirectoryLink: l.directory,
      navHolidaysLink: l.holidays,
      navSitzverteilungLink: l.sitzverteilung
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
})();
</script>`;

class HeadStyleInjector {
  element(element) {
    // Prepend (not append) so each page's own <style> — which may contain
    // page-specific overrides, e.g. index.html hiding .content-nav on
    // mobile in favor of its hamburger menu — comes later and wins the
    // cascade, without needing !important.
    element.prepend(NAV_STYLE, { html: true });
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
