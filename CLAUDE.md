# Wahlblick — project conventions

Interactive German electoral map at wahlblick.de. Static site, no build step —
plain HTML/CSS/JS plus one Cloudflare Pages Function. Deployed via Cloudflare
Pages from `github.com/pacarg/wahlblick-site` (private repo); pushing to
`main` deploys to production immediately.

## Structure

- Content pages live at the repo root (`index.html` is the main map; the rest
  — `parties.html`, `government.html`, `sitzverteilung.html`, `grundgesetz.html`,
  `directory.html`, `holidays.html`, `about.html`, `guide.html`, `impressum.html`,
  `datenschutz.html`, `disclaimer.html` — are content pages).
- No template/include system — each page's header/footer HTML is duplicated.
  A change to a genuinely global element (e.g. the footer link list) has to be
  applied to every page by hand; check all of them before calling it done.
- Exception: the top-nav dropdowns and the share button are injected at the
  edge by `functions/_middleware.js` via `HTMLRewriter`, replacing an empty
  `<div id="contentNavMount"></div>` present in every page's header. Edit that
  one file for nav changes, not each page individually.
- `wahlblick-logo-concepts.html`, `SNAPSHOT-*.md`, `backup-wahlblick.ps1` and
  `Hacer backup ahora.bat` are local-only (gitignored) — not part of the
  deployed site.

## Git discipline

- **Never `git add -A` or `git add .`.** There's an intentionally-untracked
  `Fuentes varias/` folder. Always stage files explicitly by name.
- Always confirm with the user before `git push origin main` — it deploys to
  the live site immediately, there is no staging environment.
- Prefer new commits over amends; explain *why* in the message, not just what.

## Testing before shipping

- Any change to `functions/_middleware.js` must be tested with
  `npx wrangler pages dev . --port <N>` — a plain static file server does
  **not** execute Cloudflare Pages Functions, so nav/share-button changes will
  look broken there for the wrong reason.
- Function code changes need a full wrangler restart (no hot reload). Static
  HTML/CSS/JS edits are picked up live by an already-running dev server.
- Check mobile with a real measurement, not a screenshot: 0px horizontal
  overflow at 375px width via
  `document.documentElement.scrollWidth - document.documentElement.clientWidth`.
  The screenshot tool has known scaling artifacts — trust DOM measurements.
- Check the console for errors on every page touched, in all 3 languages.
- After pushing, verify on production with `curl -sL` — Cloudflare Pages
  308-redirects `/page.html` → `/page`, so `-L` is required or the grep will
  silently match nothing — against a marker string that's actually unique to
  the change just shipped (a too-generic marker gives false positives).

## Content discipline

- Never fabricate data. Every statistic (election results, historical data,
  legal text) must be verified against an official source (Bundeswahlleiterin,
  Bundestag, Landeswahlleitungen, Bundesverfassungsgericht, etc.) before it
  ships.
- Real named public figures may be used in examples, but only when they are
  genuinely public-domain political figures — confirm with the user before
  using a real person's name/story in new content.
- Maintain strict political neutrality and objectivity — this is a
  non-partisan civic information site.

## i18n

- Three languages: DE (default) / ES / EN via `.lang-switch button[data-lang]`,
  persisted in `localStorage.getItem("wahlblickLang")`.
- Per-page content lives in a `CONTENT` object keyed by language; a
  `render(lang)` function repaints every `[data-*]`-tagged element.
- The Function-injected nav script listens for language-switch clicks via
  **event delegation on `document`**, not direct listeners — it runs at parse
  time, before later DOM elements like `.lang-switch` exist yet.
- Number formatting must be locale-aware
  (`toLocaleString("de-DE"|"es-ES"|"en-US")`) — German/Spanish use comma
  decimals and period thousands separators, English is the other way round.

## Design consistency

- Reuse the established CSS variables (`--bg`, `--surface`, `--border`,
  `--text`, `--text-muted`, `--accent`, `--radius`, …) and existing component
  patterns (`.panel`, `.page-hero`, pill `<select>`, `.nav-dropdown`) instead
  of inventing new visual language for new sections.
- When a new content group doesn't obviously belong in an existing nav
  dropdown, ask before assuming — categorize by what the content is actually
  about, not by where it's convenient to put it.
