// Cloudflare Pages Function: injects the shared "Die Parteien" / "Deutschland"
// content navigation (dropdowns) into every HTML page from a single source,
// so the 11 pages of the site never need to hand-copy this block again.
//
// How it works:
//  - Each page has an empty `<div id="contentNavMount"></div>` in its header.
//  - This Function intercepts the HTML response and replaces that div with
//    the nav markup + a small inline <script> (dropdown open/close + i18n).
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
</style>`;

const NAV_HTML = `<nav class="content-nav" aria-label="Weitere Inhalte">
  <div class="nav-dropdown" id="partiesDropdown">
    <button type="button" class="nav-dropdown-trigger" id="partiesDropdownTrigger" aria-expanded="false" aria-controls="partiesDropdownPanel">
      <span id="navPartiesGroupLabel">Die Parteien</span>
      <svg class="chevron" width="9" height="6" viewBox="0 0 9 6" aria-hidden="true"><path d="M1 1l3.5 3.5L8 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="nav-dropdown-panel" id="partiesDropdownPanel" hidden>
      <a href="parties.html" id="navPartiesLink">Parteien</a>
      <a href="government.html" id="navGovernmentLink">Koalitionen</a>
    </div>
  </div>
  <div class="nav-dropdown" id="germanyDropdown">
    <button type="button" class="nav-dropdown-trigger" id="germanyDropdownTrigger" aria-expanded="false" aria-controls="germanyDropdownPanel">
      <span id="navGermanyLabel">Deutschland</span>
      <svg class="chevron" width="9" height="6" viewBox="0 0 9 6" aria-hidden="true"><path d="M1 1l3.5 3.5L8 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="nav-dropdown-panel" id="germanyDropdownPanel" hidden>
      <a href="grundgesetz.html" id="navGrundgesetzLink">Grundgesetz</a>
      <a href="directory.html" id="navDirectoryLink">Adressverzeichnis</a>
      <a href="holidays.html" id="navHolidaysLink">Feiertage</a>
    </div>
  </div>
</nav>
<script>
(function () {
  var LABELS = {
    de: { partiesGroup: "Die Parteien", germany: "Deutschland", parties: "Parteien", government: "Koalitionen", grundgesetz: "Grundgesetz", directory: "Adressverzeichnis", holidays: "Feiertage" },
    es: { partiesGroup: "Los partidos", germany: "Alemania", parties: "Partidos", government: "Coaliciones", grundgesetz: "Ley Fundamental", directory: "Directorio", holidays: "Feriados" },
    en: { partiesGroup: "Parties", germany: "Germany", parties: "Parties", government: "Coalitions", grundgesetz: "Basic Law", directory: "Directory", holidays: "Holidays" }
  };
  function applyLabels(lang) {
    var l = LABELS[lang] || LABELS.de;
    var map = {
      navPartiesGroupLabel: l.partiesGroup,
      navGermanyLabel: l.germany,
      navPartiesLink: l.parties,
      navGovernmentLink: l.government,
      navGrundgesetzLink: l.grundgesetz,
      navDirectoryLink: l.directory,
      navHolidaysLink: l.holidays
    };
    for (var id in map) {
      var el = document.getElementById(id);
      if (el) el.textContent = map[id];
    }
  }
  applyLabels(localStorage.getItem("wahlblickLang") || "de");
  // Event delegation on document, not per-button listeners: this inline
  // script runs at parse time, before .lang-switch (later in the DOM) has
  // been parsed, so binding directly to the buttons here would find none.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".lang-switch button[data-lang]");
    if (btn) applyLabels(btn.getAttribute("data-lang"));
  });

  function wireDropdown(triggerId, panelId, wrapId, getOtherClose) {
    var trigger = document.getElementById(triggerId);
    var panel = document.getElementById(panelId);
    var wrap = document.getElementById(wrapId);
    if (!trigger || !panel || !wrap) return null;
    function close() { panel.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
    trigger.addEventListener("click", function () {
      var willOpen = panel.hidden;
      var other = getOtherClose();
      if (other) other();
      if (willOpen) { panel.hidden = false; trigger.setAttribute("aria-expanded", "true"); }
      else close();
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) close();
    });
    return close;
  }
  var closeGermany = null, closeParties = null;
  closeParties = wireDropdown("partiesDropdownTrigger", "partiesDropdownPanel", "partiesDropdown", function () { return closeGermany; });
  closeGermany = wireDropdown("germanyDropdownTrigger", "germanyDropdownPanel", "germanyDropdown", function () { return closeParties; });
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
