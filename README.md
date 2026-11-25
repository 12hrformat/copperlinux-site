# Copper Linux website

Static source for <https://12hrformat.github.io/copperlinux-site/>.

This is a plain HTML/CSS/JavaScript site. There is no build step, no package
manager and no server-side code. Everything runs from the files in this folder,
and all navigation uses hash routes so it works on any static host (including
GitHub Pages) without rewrite rules.

---

## Quick start

```powershell
# from this folder
python -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000/>.

Example routes:

- <http://127.0.0.1:8000/#/ingot>
- <http://127.0.0.1:8000/#/downloads>
- <http://127.0.0.1:8000/#/track>

Any static file server works (`python -m http.server`, `npx serve`, nginx,
GitHub Pages, etc.).

---

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | SEO shell, JSON-LD, crawler-readable copy, nav, footer, loading screen and the inline pre-paint theme script. |
| `app.js` | Hash router, page templates, GitHub feeds, ingot browser, theme toggle, loader-compatible fetch tracking, scroll reveals and counters. |
| `css/copper.css` | Full visual system: dark and light palettes, layout, animations, responsive rules and the polygon View Transition wipe. |
| `assets/liquid-logo.mp4` | Looping liquid logo beside the home-page title (500×500, ~10.7 s, muted inline video). |
| `sitemap.xml` | Route list for search engines. |
| `robots.txt` | Allows crawling and points to `sitemap.xml`. |
| `favicon.png`, `apple-touch-icon.png`, `og-image.png` | Browser and social-preview images. |
| `js/`, `font-awesome/`, `css/bootstrap.css` | Bundled vendor assets. |
| `tools.json` | Legacy empty file. **Not used** — ingot packages come from GitHub. |

---

## Routes

Routes are defined in `ROUTES`, `TITLES` and `DESCRIPTIONS` at the top of
`app.js`. `syncMeta()` updates `<title>` and `<meta name="description">` on every
navigation.

| Hash | Page | Notes |
| --- | --- | --- |
| `#/` | Home | Hero, video, ingot preview, releases, feature grid, FAQ. |
| `#/daily-driving` | Copper | Daily-driving edition. |
| `#/ingot` | ingot | Live package browser and repo card. |
| `#/tools` | ingot | Old link alias; renders the same page as `#/ingot`. |
| `#/downloads` | Downloads | Pre-release ISO links and boot instructions. |
| `#/contributions` | Contribute | Ways to help the distro and repo. |
| `#/contributors` | Team | Maintainer plus contributors. |
| `#/track` | Track | Recent commits from both GitHub repos. |
| anything else | 404 | Friendly not-found page. |

`index.html` contains a static copy of the home content inside `#app` so crawlers
and no-JS visitors still see real text. JavaScript replaces it on load.

---

## How it works

### Rendering

`getHash()` reads `location.hash`. `render()` looks up the route, injects the
matching page function's HTML into `#app`, updates metadata and active nav state,
then binds page-specific interactions (reveals, counters, video, filter handlers).

Transitions between routes are CSS-based (`is-leaving` / `is-entering`) and are
disabled for `prefers-reduced-motion`.

### Live GitHub data

- **Releases:** `GET /repos/12hrformat/copperlinux/releases?per_page=6`.
- **Commits:** the `#/track` page reads recent commits from `copperlinux` and
  `copper-ingot-repo`.
- **Repo stats:** `#/ingot` reads stars and forks for `copper-ingot-repo`.

Unauthenticated GitHub API limits are handled: a rate-limit response shows a
friendly message with a direct repository link instead of breaking the page.
If a page defines a global `GH_TOKEN` before `app.js` loads, it is used as a
bearer token. No token file is shipped — never commit a token.

### ingot package browser

`INGOT_RAW` points at
`https://raw.githubusercontent.com/12hrformat/copper-ingot-repo/main/`.

`loadIngotPackages()` fetches `README.md`, parses the package table
(name / category / version / depends) plus the "what you type" command tables,
then groups and filters the result in the page. Fallbacks, in order:

1. `iso/copper/pkg/index.json` on the GitHub Pages site
2. a small built-in package list in `app.js`

No build step or API key is required.

### Loading screen

The loader lives directly in `index.html` and is intentionally inline so it
appears before external CSS loads. It:

- wraps `window.fetch` to count in-flight requests,
- waits for `window.load` (with a 3 s fallback),
- watches for `.hero-video` and waits until it has buffered enough to play,
- advances the progress bar as each part completes,
- reveals the site once everything settles, with a 10 s safety cap.

A `<noscript>` rule hides the loader for visitors without JavaScript. If you
change the hero markup or add new critical assets, keep the video selector and
fetch wrapper in mind.

### Theme

The navbar sun/moon button toggles the `dark` class on `<html>` and stores the
choice in `localStorage` as `copper-theme`. First visits follow
`prefers-color-scheme`. An inline `<head>` script applies the saved theme before
first paint, so there is no flash.

The flip happens inside `document.startViewTransition()`; `css/copper.css`
defines the 0.7 s `var(--expo-out)` polygon clip-path wipe. Browsers without View
Transitions get an instant switch. `prefers-reduced-motion` disables the wipe.

### Hero

The home hero keeps a deliberately dark showcase in both themes so the black
video panel blends in. The background fades from black into copper on the title
side, while a black backdrop sits behind the video. The terminal card is a small
overlay beside the video on desktop and a compact overlay on phones.

The video is `muted`, `autoplay`, `loop` and `playsinline` so it works with mobile
autoplay policies. It pauses for reduced-motion visitors, and a `Cu` fallback
shows if the file cannot load.

### SEO

- Visible, keyword-rich copy and FAQ answers ship in `index.html`.
- JSON-LD declares `WebSite`, `Organization`, `SoftwareApplication` and
  `FAQPage`.
- Open Graph and Twitter metadata use `og-image.png`.
- Canonical and hreflang tags point at the GitHub Pages URL.
- Per-route titles/descriptions are updated by `syncMeta()`.
- `sitemap.xml` and `robots.txt` support discovery.

On-page markup cannot guarantee a search position. Links from the main GitHub
repo README, social profiles and other sites, plus a verified Google Search
Console property, are the remaining levers for ranking.

### Mobile

Responsive rules live at the bottom of `css/copper.css` (`max-width: 991px`,
`767px`, `520px`). They cover:

- single-column hero with the video kept high,
- 44 px nav tap targets and GitHub in the collapsed menu,
- full-width 48 px hero buttons,
- swipeable ingot filters and a 16 px search input (prevents iOS zoom-on-focus),
- single-column cards on small phones,
- reduced section spacing and smaller loader mark.

At 390 px wide there is no horizontal overflow.

---

## Customizing

| Want to change… | Edit… |
| --- | --- |
| Colours / both themes | `:root` and `html:not(.dark)` in `css/copper.css`. |
| Fonts | `--font-*` variables in `css/copper.css`. |
| Nav links | `index.html` navbar block. |
| Page copy | Page functions in `app.js` **and** the static copy in `index.html` — keep them in sync. |
| Route titles/descriptions | `TITLES` / `DESCRIPTIONS` in `app.js`. |
| Team list | `TEAM` in `app.js`. |
| ingot sources | `INGOT_REPO_URL`, `INGOT_RAW`, `INGOT_CATS` in `app.js`. |
| Hero video | Replace `assets/liquid-logo.mp4` (keep it muted and square-ish). |
| Theme wipe timing | `::view-transition-*` rules and `--expo-out` in `css/copper.css`. |

After changing `app.js` or `css/copper.css`, bump the `?v=` query strings on the
`<link>` and `<script>` tags at the bottom of `index.html` so browsers fetch the
new files instead of a cached copy.

---

## Deployment

The site is published with GitHub Pages from the `main` branch root.

1. Push changes to `main`.
2. GitHub Pages rebuilds automatically.
3. Confirm the live URL and Search Console if metadata changed.

No server configuration is needed because routing uses hashes, not paths.
`robots.txt` already references `sitemap.xml`.

---

## Verification and troubleshooting

Quick local checks:

```powershell
node --check app.js
```

Then open the site at a few widths (desktop, ~768 px, ~390 px) and click every
nav item plus the theme toggle.

| Symptom | Likely cause / fix |
| --- | --- |
| CSS or JS changes do not appear | Cached file. Bump `?v=` in `index.html` or hard-refresh. |
| Hero video does not play | Check `assets/liquid-logo.mp4`, confirm `muted` is present, and remember some browsers block autoplay until interaction. |
| Theme wipe does not play | Use Chrome/Edge; check `prefers-reduced-motion`; the fallback is an instant switch. |
| "Could not reach the GitHub API" | Unauthenticated rate limit or offline. Wait, add a local `GH_TOKEN`, or rely on the fallback copy. |
| Loader stays too long | It has a 10 s cap. Check the console for a stalled request and confirm `.hero-video` still exists in the home template. |
| ingot list looks stale | The raw README is fetched live; check `copper-ingot-repo` and the fallback list in `app.js`. |
| Search ranking is low | On-page SEO is only part of it; add inbound links and verify the property in Google Search Console. |

---

## Contributing

1. Fork the repository and work on a branch.
2. Keep `index.html` static copy, JSON-LD and `app.js` page copy consistent.
3. Test desktop and mobile widths, and both light and dark themes.
4. Do not commit tokens or personal credentials.
5. Open a pull request with a short description of the change.
