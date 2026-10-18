# Wahlblick — project conventions

Interactive German electoral map at wahlblick.de. Static site, no build step:
plain HTML/CSS/JS + one Cloudflare Pages Function. Deployed via Cloudflare Pages
from `github.com/pacarg/wahlblick-site` (public); push to `main` = instant prod.

## Commands
No build/lint/test — static site, none exist.
- Dev server (runs Functions): `npx wrangler pages dev . --port <N>`
  A plain static server does NOT execute Functions; nav/share will look broken.
- Mobile overflow (must be 0 at 375px, trust this over screenshots):
  `document.documentElement.scrollWidth - document.documentElement.clientWidth`
- Verify prod after push (`-L` required: 308 redirect `/page.html`→`/page`):
  `curl -sL https://wahlblick.de/<page> | grep '<marker-unique-to-this-change>'`

## Structure
- Content pages at repo root: `index.html` (main map) + `parties`, `government`,
  `sitzverteilung`, `grundgesetz`, `directory`, `holidays`, `about`, `guide`,
  `impressum`, `datenschutz`, `disclaimer`.
- No templating: header/footer HTML is duplicated per page. A global-element
  change must be applied to every page by hand — verify all before "done".
- Exception: top-nav dropdowns + share button are injected at the edge by
  `functions/_middleware.js` (HTMLRewriter) into `<div id="contentNavMount">`.
  Edit that one file for nav changes, not each page.
- Local-only / gitignored: `wahlblick-logo-concepts.html`, `SNAPSHOT-*.md`,
  `backup-wahlblick.ps1`, `Hacer backup ahora.bat`.

## Code Style
- Reuse CSS vars (`--bg`, `--surface`, `--border`, `--text`, `--text-muted`,
  `--accent`, `--radius`) and components (`.panel`, `.page-hero`, pill
  `<select>`, `.nav-dropdown`). Don't invent new visual language.
- i18n: DE (default) / ES / EN via `.lang-switch button[data-lang]`, persisted
  in `localStorage["wahlblickLang"]`. Per-page `CONTENT` object keyed by lang;
  `render(lang)` repaints every `[data-*]` element.
- Nav script uses event delegation on `document` (runs at parse time, before
  `.lang-switch` exists) — don't attach direct listeners.
- Locale-aware numbers: `toLocaleString("de-DE"|"es-ES"|"en-US")`.

## Testing before shipping
- `functions/_middleware.js` changes: test under wrangler; Function changes need
  a full wrangler restart (no hot reload). Static HTML/CSS/JS edits reload live.
- Check console for errors on every page touched, in all 3 languages.

## Escalation Rules (act autonomously unless listed here — then ask first)
- **Never `git add -A` / `git add .`** — `Fuentes varias/` is *not* in
  `.gitignore`, just never staged on purpose; `-A` would sweep it in. Stage
  files explicitly by name.
- **Confirm before `git push origin main`** — deploys live, no staging.
- **Never fabricate data.** Verify every stat/legal text against an official
  source (Bundeswahlleiterin, Bundestag, Landeswahlleitungen, BVerfG) first.
- Confirm before using a real person's name/story in new content.
- Ask before placing a new content group in a nav dropdown — categorize by what
  the content is about, not by convenience.
- Maintain strict political neutrality (non-partisan civic site).
- Prefer new commits over amends; explain *why* in the message.
