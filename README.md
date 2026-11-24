# Copper Linux website

Source for https://12hrformat.github.io/copperlinux-site/

## What's here

- `index.html` — nav, crawler-readable copy, Open Graph/Twitter metadata and JSON-LD
  (WebSite, Organization, SoftwareApplication, FAQPage).
- `app.js` — hash routing, page templates, GitHub release/commit feeds, the ingot
  package browser, light/dark theme toggle, scroll reveals, counters and the hero
  terminal.
- `css/copper.css` — the whole visual system, including both palettes and the
  polygon View Transition wipe.
- `assets/liquid-logo.mp4` — the looping liquid logo beside the home-page title.
  It plays muted/inline on a black panel; the hero fades from black into copper.
- `sitemap.xml`, `robots.txt` — search engine discovery.
- `tools.json` — legacy, no longer used by the site. ingot packages come live from
  `12hrformat/copper-ingot-repo`.

## ingot package browser

The browser on `#/ingot` fetches `README.md` from the raw `copper-ingot-repo` on
GitHub, parses the package table (name / category / version / depends) and the
"what you type" tables, then groups and filters the result in the page. It falls
back to the repository `index.json`, then to a small built-in list if the
network is unavailable. No build step, no API key.

## Light / dark theme

The navbar moon/sun button stores the choice in `localStorage` under
`copper-theme`. On a first visit it follows `prefers-color-scheme`. An inline
script in `<head>` applies the class before first paint to avoid a flash, and the
switch itself runs inside `document.startViewTransition()` so the CSS polygon
clip-path wipe plays (0.7s expo-out). Browsers without the API get an instant
switch, and `prefers-reduced-motion` disables the wipe.

## SEO notes

- The root `index.html` contains visible, keyword-rich copy and the FAQ answers
  that are also declared in JSON-LD. This is what crawlers see before JS runs.
- Per-route titles and descriptions are updated in `app.js` on navigation.
- To rank for "Copper Linux", the biggest remaining levers are off-site: links
  from the main GitHub repo README, social profiles and other sites pointing at
  this URL, plus a verified Google Search Console property. On-page markup alone
  cannot guarantee a number-one position.
