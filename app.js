/* Copper Linux — site logic
   Hash routes, live GitHub data, the ingot package browser, and motion.
   Everything degrades to readable HTML if a request or animation fails. */

var ROUTES = {
    '/':              pageHome,
    '/daily-driving': pageDaily,
    '/ingot':         pageIngot,
    '/tools':         pageIngot,   /* old links keep working */
    '/downloads':     pageDownloads,
    '/contributions': pageContributions,
    '/contributors':  pageContributors,
    '/track':         pageTrack,
    '/docs':          pageDocs,
    '/docs/copper':   pageDocsCopper,
    '/docs/ingot':    pageDocsIngot,
    '/bugs':          pageBugs
};

var TITLES = {
    '/':              'Copper Linux — Download the Copper Linux distro',
    '/daily-driving': 'Copper — Daily driving with Copper Linux',
    '/ingot':         'ingot — Copper Linux package manager & repo',
    '/tools':         'ingot — Copper Linux package manager & repo',
    '/downloads':     'Download Copper Linux — pre-release ISOs',
    '/contributions': 'Contribute to Copper Linux',
    '/contributors':  'Copper Linux team — maintainer & contributors',
    '/track':         'Track Copper Linux development',
    '/docs':          'Copper Linux documentation — guides and reference',
    '/docs/copper':   'Copper Linux documentation — booting, desktop and daily use',
    '/docs/ingot':    'ingot documentation — commands, packages and the repository',
    '/bugs':          'Copper Linux bug tracker — report and browse issues'
};

var DESCRIPTIONS = {
    '/':              'Copper Linux is a small, fast, independent Linux distribution for daily use. Download Copper Linux pre-releases and explore ingot, its own package manager.',
    '/daily-driving': 'Copper is the daily driving edition of Copper Linux: a small, fast desktop distro for web, code, school and work, with ingot packages.',
    '/ingot':         'ingot is Copper Linux\'s own package manager. Browse 100+ packaged tools, apps, network utilities, libraries and fonts from copper-ingot-repo.',
    '/tools':         'ingot is Copper Linux\'s own package manager. Browse 100+ packaged tools, apps, network utilities, libraries and fonts from copper-ingot-repo.',
    '/downloads':     'Download Copper Linux pre-release ISOs from GitHub. Boot the latest Copper Linux live image in a VM or on real hardware.',
    '/contributions': 'Contribute to Copper Linux: report bugs, test pre-releases, write code or add packages to the ingot repository.',
    '/contributors':  'Copper Linux is built by one maintainer, 12hrformat, with a few contributors. Meet the team behind the distro.',
    '/track':         'Track recent commits from the copperlinux and copper-ingot-repo repositories on GitHub.',
    '/docs':          'Guides and reference for Copper Linux: getting started, the desktop, ingot packages and bug tracking.',
    '/docs/copper':   'Copper Linux documentation: boot the live ISO, first-boot setup, desktop sessions, networking and troubleshooting.',
    '/docs/ingot':    'ingot documentation: install and update packages, understand the repository and contribute new packages.',
    '/bugs':          'Browse open Copper Linux and ingot issues on GitHub, or report a bug with a clear reproducible description.'
};

function getHash() { return location.hash.slice(1) || '/'; }
function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/* ------------------------------------------------------------------
   light / dark theme. The class flip happens inside startViewTransition
   so the CSS polygon wipe plays; unsupported browsers swap instantly.
   ------------------------------------------------------------------ */
var THEME_KEY = 'copper-theme';

function currentTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function syncThemeUI() {
    var btn  = document.getElementById('theme-toggle');
    var icon = document.getElementById('theme-icon');
    var dark = currentTheme() === 'dark';
    var label = dark ? 'Switch to light theme' : 'Switch to dark theme';
    if (btn) {
        btn.setAttribute('title', label);
        btn.setAttribute('aria-label', label);
    }
    if (icon) icon.className = 'fas ' + (dark ? 'fa-sun' : 'fa-moon');

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b0b0c' : '#f7f3ec');
}

function applyTheme(theme, animate) {
    if (theme !== 'dark' && theme !== 'light') return;
    if (theme === currentTheme()) { syncThemeUI(); return; }

    var root = document.documentElement;
    function flip() {
        root.classList.toggle('dark', theme === 'dark');
        syncThemeUI();
    }

    if (animate && document.startViewTransition && !reduceMotion()) {
        document.startViewTransition(flip);
    } else {
        flip();
    }

    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage unavailable */ }
}

function initTheme() {
    syncThemeUI();

    var btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
        });
    }

    /* follow the OS only until the visitor picks a theme themselves */
    if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: light)');
        var onChange = function (e) {
            var saved = null;
            try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
            if (!saved) applyTheme(e.matches ? 'light' : 'dark', true);
        };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
    }
}

function navigate(instant) {
    stopTrackPolling();
    stopIssuePolling();
    if (termTimer) { clearInterval(termTimer); termTimer = null; }

    var hash = getHash();
    var app  = document.getElementById('app');
    var page = (ROUTES[hash] || page404);

    function render() {
        app.innerHTML = page();
        document.title = TITLES[hash] || (ROUTES[hash] ? TITLES['/'] : 'Page not found — Copper Linux');
        syncMeta(hash);
        setActiveNav(hash);
        closeMobileNav();
        bindPageInteractions(hash);
        initReveal();
        animateCounters();
        initTerminal();
        window.scrollTo(0, 0);

        app.classList.remove('is-leaving');
        if (!instant && !reduceMotion()) {
            app.classList.add('is-entering');
            requestAnimationFrame(function () {
                requestAnimationFrame(function () { app.classList.remove('is-entering'); });
            });
        }
    }

    if (!instant && !reduceMotion()) {
        app.classList.add('is-leaving');
        setTimeout(render, 130);
    } else {
        render();
    }
}

window.addEventListener('hashchange', function () { navigate(false); });
document.addEventListener('DOMContentLoaded', function () { initTheme(); navigate(true); });

/* highlight the right navbar item */
var NAV_IDS = {
    '/':              'nav-home',
    '/daily-driving': 'nav-daily',
    '/ingot':         'nav-ingot',
    '/tools':         'nav-ingot',
    '/downloads':     'nav-downloads',
    '/contributions': 'nav-contributions',
    '/contributors':  'nav-contributors',
    '/track':         'nav-track',
    '/docs':          'nav-docs-home',
    '/docs/copper':   'nav-docs-copper',
    '/docs/ingot':    'nav-docs-ingot',
    '/bugs':          'nav-bugs'
};

function setActiveNav(hash) {
    $('.navbar-nav li').removeClass('active');
    if (NAV_IDS[hash]) $('#' + NAV_IDS[hash]).addClass('active');
    if (hash === '/docs' || hash === '/docs/copper' || hash === '/docs/ingot' || hash === '/bugs') {
        $('#nav-docs').addClass('active');
    }
}

/* keep social/search metadata in step with the page the visitor is on */
function syncMeta(hash) {
    var desc = DESCRIPTIONS[hash] || DESCRIPTIONS['/'];
    var pairs = [
        ['meta[name="description"]', 'content', desc],
        ['meta[property="og:title"]', 'content', document.title],
        ['meta[property="og:description"]', 'content', desc],
        ['meta[name="twitter:title"]', 'content', document.title],
        ['meta[name="twitter:description"]', 'content', desc]
    ];
    pairs.forEach(function (pair) {
        var el = document.querySelector(pair[0]);
        if (el) el.setAttribute(pair[1], pair[2]);
    });
}

function closeMobileNav() {
    var el = document.getElementById('main-nav-collapse');
    if (el && el.classList.contains('in')) $(el).collapse('hide');
}

/* scroll progress + auto-hiding navbar, one passive listener */
(function () {
    var navbar   = document.querySelector('.navbar-copper');
    var progress = document.getElementById('scroll-progress');
    var lastY    = window.pageYOffset;

    window.addEventListener('scroll', function () {
        var y = window.pageYOffset;
        var max = document.documentElement.scrollHeight - window.innerHeight;

        if (progress) progress.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';

        var delta = y - lastY;
        if (navbar && Math.abs(delta) >= 12) {
            var menuOpen = document.querySelector('.navbar-collapse.in');
            if (!menuOpen && y > 140 && delta > 0) navbar.classList.add('navbar-hidden');
            else if (delta < 0 || y < 140) navbar.classList.remove('navbar-hidden');
            lastY = y;
        }
    }, { passive: true });
})();

/* page specific setup, run after each render */
function bindPageInteractions(hash) {
    if (hash === '/') { loadReleases(); loadIngotPreview(); initHeroVideo(); }
    if (hash === '/ingot' || hash === '/tools') loadIngotPackages();
    if (hash === '/contributors') renderTeam();
    if (hash === '/bugs') {
        loadIssues();
        $('#bugs-refresh').off('click').on('click', loadIssues);
    }
    if (hash === '/track') {
        renderTrack();
        $('#track-refresh').off('click').on('click', renderTrack);
    }
}

/* ------------------------------------------------------------------
   scroll reveal + number counters
   ------------------------------------------------------------------ */
var revealObserver = null;

function initReveal() {
    var targets = document.querySelectorAll(
        '#app .hero-copy > *,' +
        '#app .hero-art, #app .stat-strip, #app .section-head, #app .feature-card,' +
        '#app .release-card, #app .panel, #app .page-intro > *,' +
        '#app .breadcrumb, #app .contribute-band, #app .faq-item,' +
        '#app .repo-card, #app .step, #app .team-card,' +
        '#app .doc-section, #app .docs-sidebar, #app .doc-note, #app .issue-card'
    );
    var pending = [];
    for (var i = 0; i < targets.length; i++) {
        if (!targets[i].classList.contains('reveal')) pending.push(targets[i]);
    }

    if (reduceMotion() || !('IntersectionObserver' in window)) {
        pending.forEach(function (el) { el.classList.add('reveal', 'is-visible'); });
        return;
    }

    if (!revealObserver) {
        revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    }

    pending.forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.transitionDelay = ((i % 4) * 55) + 'ms';
        revealObserver.observe(el);
    });
}

function animateCounter(el) {
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduceMotion()) {
        el.textContent = (el.getAttribute('data-count') || '0') + suffix;
        return;
    }

    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;

    /* a stale animation from an earlier render must not overwrite this one */
    var token = String(Date.now()) + Math.random();
    el._counterToken = token;
    var start = null;
    el.textContent = '0' + suffix;

    function step(ts) {
        if (el._counterToken !== token) return;
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / 900);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function animateCounters() {
    var nums = document.querySelectorAll('#app .stat-num[data-count]');
    for (var i = 0; i < nums.length; i++) animateCounter(nums[i]);
}

/* ------------------------------------------------------------------
   hero terminal — a tiny, on-brand typewriter
   ------------------------------------------------------------------ */
var termTimer = null;

var TERMINAL_SCRIPT = [
    { cmd: 'ingot install firefox', out: 'ingot: installed firefox\n57 packages ready to use' },
    { cmd: 'ingot update',          out: 'ingot: 3 packages updated' },
    { cmd: 'ingot install nmap',    out: 'ingot: installed libpcap\ningot: installed nmap' },
    { cmd: 'fastfetch',             out: 'OS: Copper Linux x86_64\nShell: bash\nWM: niri / xfce' }
];

/* keep the hero loop calm for people who asked for less motion */
function initHeroVideo() {
    var video = document.querySelector('.hero-video');
    if (!video) return;

    if (reduceMotion()) {
        video.removeAttribute('autoplay');
        try { video.pause(); } catch (e) { /* not loaded yet */ }
        return;
    }

    var playing = video.play();
    if (playing && playing.catch) playing.catch(function () { /* autoplay blocked */ });
}

function initTerminal() {
    var out = document.getElementById('terminal-output');
    if (!out) return;

    var line = 0, chars = 0, hold = 0, phase = 'typing';
    var current = TERMINAL_SCRIPT[0];

    if (reduceMotion()) {
        out.textContent = '$ ' + current.cmd + '\n' + current.out;
        return;
    }

    function tick() {
        if (phase === 'typing') {
            chars++;
            out.textContent = '$ ' + current.cmd.slice(0, chars);
            if (chars >= current.cmd.length) { phase = 'result'; hold = 0; }
        } else {
            out.textContent = '$ ' + current.cmd + '\n' + current.out;
            hold++;
            if (hold > 30) {
                line = (line + 1) % TERMINAL_SCRIPT.length;
                current = TERMINAL_SCRIPT[line];
                chars = 0; phase = 'typing';
                out.textContent = '';
            }
        }
    }
    termTimer = setInterval(tick, 55);
}

/* ------------------------------------------------------------------
   ingot package browser — live data from copper-ingot-repo
   ------------------------------------------------------------------ */
var INGOT_REPO_URL = 'https://github.com/12hrformat/copper-ingot-repo';
var INGOT_RAW      = 'https://raw.githubusercontent.com/12hrformat/copper-ingot-repo/main/';
var INGOT_CATS     = ['tools', 'network', 'libs', 'fonts', 'hacking', 'desktop'];
var INGOT_NAMES    = {
    tools: 'Tools & apps', network: 'Network', libs: 'Libraries',
    fonts: 'Fonts', hacking: 'Hacking', desktop: 'Desktop'
};
var ingotCache = null;
var ingotFilter = { q: '', cat: 'all' };

function syncPackageStat(list) {
    var el = document.getElementById('stat-packages');
    if (!el || !list || !list.length) return;
    el.setAttribute('data-count', list.length);
    el.removeAttribute('data-suffix');
    animateCounter(el);
}

/* last-resort data so the browser still says something useful offline */
var INGOT_FALLBACK = [
    { name: 'bash', category: 'tools', version: '5.2.21-2ubuntu4', depends: 'ncurses-base', command: 'bash' },
    { name: 'btop', category: 'tools', version: '1.3.0-1', depends: '', command: 'btop' },
    { name: 'code', category: 'tools', version: '1.145.2', depends: '', command: 'code, code-tunnel' },
    { name: 'curl', category: 'tools', version: '8.5.0-2ubuntu10.15', depends: '', command: 'curl' },
    { name: 'eza', category: 'tools', version: '0.18.2-1', depends: '', command: 'eza, exa' },
    { name: 'fastfetch', category: 'tools', version: '2.69.0', depends: '', command: 'fastfetch' },
    { name: 'firefox', category: 'tools', version: '157.0.1-1', depends: '', command: 'firefox' },
    { name: 'fzf', category: 'tools', version: '0.44.1-1ubuntu0.3', depends: '', command: 'fzf' },
    { name: 'git', category: 'tools', version: '1:2.43.0-1ubuntu7.3', depends: '', command: 'git' },
    { name: 'htop', category: 'tools', version: '3.3.0-4build1', depends: 'ncurses-base', command: 'htop' },
    { name: 'neovim', category: 'tools', version: '0.9.5-6ubuntu2', depends: 'ncurses-base', command: 'nvim' },
    { name: 'python3', category: 'tools', version: '3.12.3-0ubuntu2.1', depends: 'ncurses-base', command: 'python3, pip' },
    { name: 'ripgrep', category: 'tools', version: '14.1.0-1', depends: '', command: 'rg' },
    { name: 'tmux', category: 'tools', version: '3.4-1ubuntu0.1', depends: 'ncurses-base', command: 'tmux' },
    { name: 'wine', category: 'tools', version: '9.0~repack-4build3-copper1', depends: '', command: 'wine, winecfg' },
    { name: 'john', category: 'hacking', version: '1.9.0-2build1', depends: '', command: 'john' },
    { name: 'nmap', category: 'hacking', version: '7.95-1', depends: 'libpcap', command: 'nmap' },
    { name: 'bind9-dnsutils', category: 'network', version: '1:9.18.39', depends: '', command: 'dig, nslookup' },
    { name: 'iproute2', category: 'network', version: '6.1.0-1ubuntu6.4', depends: '', command: 'ip, ss, tc' },
    { name: 'openssh-client', category: 'network', version: '1:9.6p1-3ubuntu13.20', depends: '', command: 'ssh, scp, sftp' },
    { name: 'tcpdump', category: 'network', version: '4.99.7-1', depends: 'libpcap', command: 'tcpdump' },
    { name: 'wireguard-tools', category: 'network', version: '1.0.20210914-1ubuntu4', depends: 'bash, iproute2, procps', command: 'wg, wg-quick' },
    { name: 'libpcap', category: 'libs', version: '1.11.0-1', depends: '', command: '' },
    { name: 'fonts-noto-extra', category: 'fonts', version: '20201225-2', depends: '', command: '' },
    { name: 'nerd-fonts-symbols', category: 'fonts', version: '3.5.1', depends: '', command: '' },
    { name: 'niri-configs', category: 'desktop', version: 'fdab48c', depends: '', command: '' }
];

function parseIngotReadme(md) {
    var lines = md.split(/\r?\n/);
    var packages = [], commands = {}, seen = {};

    lines.forEach(function (line) {
        var t = line.trim();
        if (!t || t.charAt(0) !== '|') return;
        var cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });

        /* the package table: name | category | version | depends */
        if (cells.length === 4 && INGOT_CATS.indexOf(cells[1]) > -1 &&
            cells[0].toLowerCase() !== 'package' && cells[2].toLowerCase() !== 'version') {
            if (!seen[cells[0]]) {
                seen[cells[0]] = true;
                packages.push({
                    name: cells[0], category: cells[1], version: cells[2],
                    depends: cells[3] && cells[3] !== '—' ? cells[3] : '', command: ''
                });
            }
        }
        /* the "what you type" tables scattered through the README */
        else if (cells.length === 3 && INGOT_CATS.indexOf(cells[1]) > -1 &&
                 cells[2].toLowerCase() !== 'what you type') {
            commands[cells[0]] = cells[2];
        }
    });

    packages.forEach(function (p) { p.command = commands[p.name] || ''; });
    return packages;
}

function fetchText(url) {
    return fetch(url).then(function (res) {
        if (!res.ok) throw new Error('http ' + res.status);
        return res.text();
    });
}

function loadIngotPackages() {
    var grid = document.getElementById('ingot-packages');
    if (!grid) return;

    function done(list) {
        ingotCache = list;
        syncPackageStat(list);
        renderIngotPackages();
        loadRepoStats();
    }

    if (ingotCache) { renderIngotPackages(); loadRepoStats(); return; }

    fetchText(INGOT_RAW + 'README.md')
        .then(function (md) {
            var list = parseIngotReadme(md);
            if (list.length < 10) throw new Error('unexpected package table');
            done(list);
        })
        .catch(function () {
            fetchText(INGOT_RAW + 'iso/copper/pkg/index.json')
                .then(function (txt) {
                    var idx = JSON.parse(txt);
                    var list = Object.keys(idx).map(function (name) {
                        return { name: name, category: idx[name], version: '', depends: '', command: '' };
                    });
                    done(list);
                })
                .catch(function () { done(INGOT_FALLBACK.slice()); });
        });
}

function loadIngotPreview() {
    var box = document.getElementById('ingot-preview');
    if (!box) return;

    function draw(list) {
        var picks = ['nmap', 'git', 'firefox', 'neovim', 'tcpdump', 'btop', 'python3', 'wine'];
        var shown = picks.map(function (n) {
            for (var i = 0; i < list.length; i++) if (list[i].name === n) return list[i];
            return null;
        }).filter(Boolean).slice(0, 8);
        if (!shown.length) shown = list.slice(0, 8);
        syncPackageStat(list);
        box.innerHTML = shown.map(function (p) {
            return '<a class="preview-chip" href="#/ingot"><span class="preview-chip-dot"></span>'
                + escHtml(p.name) + '<span class="preview-chip-cat">' + escHtml(p.category) + '</span></a>';
        }).join('');
    }

    if (ingotCache) { draw(ingotCache); return; }
    fetchText(INGOT_RAW + 'README.md')
        .then(function (md) { ingotCache = parseIngotReadme(md); draw(ingotCache); })
        .catch(function () { draw(INGOT_FALLBACK); });
}

function pkgCard(p) {
    var dep = p.depends ? '<span class="pkg-dep">needs ' + escHtml(p.depends) + '</span>' : '';
    var cmd = p.command || 'Copper package';
    return '<a class="pkg-card" href="' + INGOT_REPO_URL + '/blob/main/iso/copper/pkg/'
        + encodeURIComponent(p.category) + '/' + encodeURIComponent(p.name)
        + '" target="_blank" rel="noopener">'
        + '<span class="pkg-card-top"><span class="pkg-name">' + escHtml(p.name) + '</span>'
        + '<span class="pkg-version">' + escHtml(p.version || '—') + '</span></span>'
        + '<span class="pkg-cmd">' + escHtml(cmd) + '</span>'
        + '<span class="pkg-card-foot"><span class="pkg-cat">' + escHtml(p.category) + '</span>'
        + dep + '<i class="fas fa-external-link-alt" aria-hidden="true"></i></span>'
        + '</a>';
}

function renderIngotPackages() {
    var grid = document.getElementById('ingot-packages');
    if (!grid || !ingotCache) return;

    var q = ingotFilter.q.toUpperCase();
    var list = ingotCache.filter(function (p) {
        var matchesCat = ingotFilter.cat === 'all' || p.category === ingotFilter.cat;
        var haystack = (p.name + ' ' + p.category + ' ' + p.command + ' ' + p.depends).toUpperCase();
        return matchesCat && (!q || haystack.indexOf(q) > -1);
    });

    var count = document.getElementById('pkg-count');
    if (count) count.textContent = list.length + ' / ' + ingotCache.length + ' packages';

    if (!list.length) {
        grid.innerHTML = '<div class="pkg-empty"><i class="fas fa-search"></i> No packages match that search.</div>';
        return;
    }

    grid.innerHTML = INGOT_CATS.map(function (cat) {
        var items = list.filter(function (p) { return p.category === cat; });
        if (!items.length) return '';
        return '<section class="pkg-group">'
            + '<div class="pkg-group-head"><h3><span class="pkg-group-mark"></span>' + INGOT_NAMES[cat] + '</h3>'
            + '<span class="pkg-group-count">' + String(items.length).padStart(2, '0') + '</span></div>'
            + '<div class="pkg-cards">' + items.map(pkgCard).join('') + '</div></section>';
    }).join('');

    initReveal();
}

window.searchIngot = function () {
    var input = document.getElementById('pkg-search');
    ingotFilter.q = input ? input.value.trim() : '';
    renderIngotPackages();
};

window.filterIngot = function (cat, el) {
    ingotFilter.cat = cat;
    var buttons = document.querySelectorAll('.filter-btn');
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('is-active');
    if (el) el.classList.add('is-active');
    renderIngotPackages();
};

/* ------------------------------------------------------------------
   GitHub API helpers
   ------------------------------------------------------------------ */
var GH_REPOS = [
    { owner: '12hrformat', repo: 'copperlinux', label: 'copperlinux', url: 'https://github.com/12hrformat/copperlinux', branch: 'main' },
    { owner: '12hrformat', repo: 'copper-ingot-repo', label: 'copper-ingot-repo', url: 'https://github.com/12hrformat/copper-ingot-repo', branch: 'main' }
];

var GH_RATE_LIMITED = false;

function markRateLimited() {
    GH_RATE_LIMITED = true;
    showRateBanner();
}

function showRateBanner() {
    var banners = ['track-banner', 'bugs-banner'];
    banners.forEach(function (id) {
        var banner = document.getElementById(id);
        if (!banner || banner.firstChild) return;
        banner.innerHTML = '<div class="alert-rate"><i class="fas fa-exclamation-triangle"></i> '
            + 'GitHub API rate limit reached — you can still check everything on GitHub.</div>';
    });
}

function ghToken() {
    var t = '';
    try { t = localStorage.getItem('gh_token') || ''; } catch (e) { t = ''; }
    if (!t && typeof GH_TOKEN !== 'undefined' && GH_TOKEN) t = GH_TOKEN;
    return t;
}

function ghHeaders() {
    var token = ghToken();
    return token ? { headers: { Authorization: 'token ' + token } } : {};
}

async function ghGet(path) {
    var res = await fetch('https://api.github.com' + path, ghHeaders());
    if (!res.ok) {
        if (res.status === 404) throw new Error('not found');
        if (res.status === 403) throw new Error('rate limited');
        throw new Error('http ' + res.status);
    }
    return res.json();
}

/* ingot repo card stats on the ingot page */
function loadRepoStats() {
    ghGet('/repos/12hrformat/copper-ingot-repo').then(function (r) {
        var stars = document.getElementById('ingot-stars');
        var forks = document.getElementById('ingot-forks');
        if (stars) stars.textContent = r.stargazers_count;
        if (forks) forks.textContent = r.forks_count;
    }).catch(function () { /* static numbers stay put */ });
}

/* releases, straight from the copperlinux repo */
async function loadReleases() {
    var list = document.getElementById('release-list');
    if (!list) return;

    try {
        var releases = await ghGet('/repos/12hrformat/copperlinux/releases?per_page=6');
        if (!Array.isArray(releases) || !releases.length) {
            list.innerHTML = '<p class="dim-text">No releases published yet — watch the <a href="https://github.com/12hrformat/copperlinux/releases" target="_blank" rel="noopener">repository</a>.</p>';
            return;
        }

        var stat = document.getElementById('stat-releases');
        if (stat) {
            stat.setAttribute('data-count', releases.length);
            stat.removeAttribute('data-suffix');
            animateCounter(stat);
        }

        var hero = document.getElementById('hero-release');
        if (hero) {
            hero.textContent = releases[0].tag_name + (releases[0].prerelease ? ' (pre-release)' : '');
            hero.href = releases[0].html_url;
        }

        list.innerHTML = releases.map(releaseCard).join('');
        initReveal();
    } catch (e) {
        if (e && e.message === 'rate limited') markRateLimited();
        list.innerHTML = '<p class="dim-text">Could not reach the GitHub API right now — '
            + 'the releases live on <a href="https://github.com/12hrformat/copperlinux/releases" target="_blank" rel="noopener">github.com/12hrformat/copperlinux</a>.</p>';
    }
}

function releaseCard(r) {
    var tag = String(r.tag_name || '');
    var badge = r.prerelease
        ? '<span class="release-badge">Pre-release</span>'
        : '<span class="release-badge release-badge-stable">Release</span>';

    var date = '';
    if (r.published_at) {
        var d = new Date(r.published_at);
        if (!isNaN(d)) date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    var lines = String(r.body || '').replace(/\r/g, '').split('\n');
    var first = '';
    for (var i = 0; i < lines.length; i++) {
        var l = lines[i].trim();
        if (l) { first = l.replace(/^#+\s*/, '').replace(/^[-*+]\s*/, ''); break; }
    }
    if (first.length > 160) first = first.slice(0, 157).trim() + '…';

    return '<article class="release-card">'
        + '<div class="release-version">' + escHtml(tag) + '</div>'
        + '<div class="release-body">'
        +   '<div class="release-head"><h3>' + escHtml(String(r.name || r.tag_name || '')) + '</h3>' + badge + '</div>'
        +   (date ? '<p class="release-date">' + escHtml(date) + '</p>' : '')
        +   (first ? '<p class="release-excerpt">' + escHtml(first) + '</p>' : '')
        +   '<a class="release-link" href="' + escHtml(String(r.html_url || '')) + '" target="_blank" rel="noopener">Release notes &rarr;</a>'
        + '</div>'
        + '</article>';
}

/* one maintainer, a few contributors — avatars come from GitHub */
var TEAM = [
    { login: '12hrformat', role: 'Creator & maintainer', lead: true },
    { login: 'farcrowx', role: 'Contributor', lead: false },
    { login: 'Copper-linux', role: 'Contributor', lead: false },
    { login: 'dragondragoneyesec-hash', role: 'Contributor', lead: false }
];

var AVATAR_CACHE = {};

async function avatarFor(login) {
    if (AVATAR_CACHE[login] !== undefined) return AVATAR_CACHE[login];
    AVATAR_CACHE[login] = '';
    try {
        var u = await ghGet('/users/' + encodeURIComponent(login));
        AVATAR_CACHE[login] = (u && u.avatar_url) || '';
    } catch (e) {
        if (e && e.message === 'rate limited') markRateLimited();
        AVATAR_CACHE[login] = '';
    }
    return AVATAR_CACHE[login];
}

function renderTeam() {
    var grid = document.getElementById('team-grid');
    if (!grid) return;

    grid.innerHTML = TEAM.map(function (m) {
        var initial = (m.login || '?').charAt(0).toUpperCase();
        return '<article class="team-card' + (m.lead ? ' team-card-lead' : '') + '">'
            + '<span class="team-avatar-wrap"><img class="team-avatar" data-login="' + escHtml(m.login)
            + '" alt="' + escHtml(m.login) + '" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />'
            + '<span class="team-initial">' + escHtml(initial) + '</span></span>'
            + '<p class="team-role">' + escHtml(m.role) + '</p>'
            + '<h3>' + escHtml(m.login) + '</h3>'
            + '<a href="https://github.com/' + escHtml(m.login) + '" target="_blank" rel="noopener">github.com/' + escHtml(m.login) + ' <i class="fas fa-external-link-alt"></i></a>'
            + '</article>';
    }).join('');

    TEAM.forEach(function (m) {
        avatarFor(m.login).then(function (url) {
            var img = grid.querySelector('img[data-login="' + m.login + '"]');
            if (!img) return;
            if (url) {
                img.src = url;
                img.classList.add('is-loaded');
            } else {
                img.parentNode.classList.add('no-avatar');
            }
        });
    });
}

/* live commit feed */
var commitTimer = null;

function startTrackPolling() {
    stopTrackPolling();
    commitTimer = setInterval(renderTrack, 60000);
}

function stopTrackPolling() {
    if (commitTimer) { clearInterval(commitTimer); commitTimer = null; }
}

function renderTrack() {
    var feed   = document.getElementById('track-feeds');
    var status = document.getElementById('track-status');
    var banner = document.getElementById('track-banner');
    if (!feed) return;
    startTrackPolling();

    GH_RATE_LIMITED = false;
    if (banner) banner.innerHTML = '';
    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching latest commits&hellip;';

    feed.innerHTML = '<div class="row track-row">'
        + GH_REPOS.map(function (r) {
            return '<div class="col-md-6 track-col">'
                + '<div class="panel panel-default text-left track-repo">'
                + '<div class="panel-heading"><b>' + escHtml(r.label) + '</b>'
                + ' <a class="branch-chip" href="' + escHtml(r.url + '/tree/' + r.branch) + '" target="_blank" rel="noopener">' + escHtml(r.branch) + '</a>'
                + ' <a class="repo-link" href="' + escHtml(r.url) + '" target="_blank" rel="noopener">GitHub &rarr;</a></div>'
                + '<div class="list-group-item"><div class="commit-list" data-repo="' + escHtml(r.owner + '/' + r.repo) + '">'
                + '<p class="dim-text">Loading commits&hellip;</p></div></div>'
                + '</div></div>';
        }).join('')
        + '</div>';

    var remaining = GH_REPOS.length;
    GH_REPOS.forEach(function (r) {
        loadRepoCommits(r).then(function () {
            remaining--;
            if (remaining <= 0) status.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        });
    });
}

async function loadRepoCommits(r) {
    var box = document.querySelector('.commit-list[data-repo="' + r.owner + '/' + r.repo + '"]');
    if (!box) return;
    var cacheKey = 'track:' + r.owner + '/' + r.repo;
    try {
        var path = '/repos/' + r.owner + '/' + r.repo + '/commits?per_page=6';
        if (r.branch) path += '&sha=' + encodeURIComponent(r.branch);
        var commits = await ghGet(path);
        if (!Array.isArray(commits) || !commits.length) {
            box.innerHTML = '<p class="dim-text">No commits pushed yet.</p>';
            return;
        }
        box.innerHTML = commits.map(function (c) {
            var author = (c.commit && c.commit.author) || {};
            var login  = (c.author && c.author.login) || author.name || 'unknown';
            var avatar = (c.author && c.author.avatar_url) || '';
            var msg    = String((c.commit && c.commit.message) || '').split('\n')[0] || '(no message)';
            var sha    = String(c.sha || '').slice(0, 7);
            var when   = author.date ? timeAgo(author.date) : '';
            var link   = c.html_url || r.url;
            return '<div class="commit-item">'
                + '<img class="commit-avatar" alt="' + escHtml(login) + '" src="' + escHtml(avatar)
                + '" onerror="this.style.visibility=\'hidden\'" />'
                + '<div class="commit-main">'
                +   '<a class="commit-msg" href="' + escHtml(link) + '" target="_blank" rel="noopener" title="' + escHtml(msg) + '">' + escHtml(msg) + '</a>'
                +   '<div class="commit-meta">' + escHtml(login) + ' committed ' + escHtml(when) + ' &middot; <code>' + escHtml(sha) + '</code></div>'
                + '</div></div>';
        }).join('');
        try { localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), html: box.innerHTML })); } catch (e) { /* storage unavailable */ }
    } catch (e) {
        if (e && e.message === 'rate limited') markRateLimited();
        var why = (e && e.message === 'not found')
            ? 'That repository does not exist yet.'
            : 'Could not reach the GitHub API (rate limit or network).';
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (e2) { cached = null; }
        if (cached && cached.html && cached.html.indexOf('commit-item') > -1) {
            box.innerHTML = '<p class="dim-text track-warn"><i class="fas fa-exclamation-triangle"></i> GitHub rate limit hit — showing last known commits.</p>' + cached.html;
        } else {
            box.innerHTML = '<p class="dim-text">' + why + '</p>';
        }
    }
}

function timeAgo(iso) {
    var then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    var s = Math.floor((Date.now() - then) / 1000);
    if (s < 60) return s + 's ago';
    var m = Math.floor(s / 60);  if (m < 60)  return m + 'm ago';
    var h = Math.floor(m / 60);  if (h < 24)  return h + 'h ago';
    var d = Math.floor(h / 24);  if (d < 30)  return d + 'd ago';
    return new Date(iso).toISOString().slice(0, 10);
}

function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function sectionHead(kicker, title, sub) {
    return '<div class="section-head"><p class="section-kicker">' + kicker + '</p>'
        + '<h2>' + title + '</h2>'
        + (sub ? '<p class="section-sub">' + sub + '</p>' : '') + '</div>';
}

function pageIntro(kicker, title, lead) {
    return '<header class="page-intro">'
        + '<p class="eyebrow">' + kicker + '</p>'
        + '<h1>' + title + '</h1>'
        + (lead ? '<p class="page-lead">' + lead + '</p>' : '')
        + '</header>';
}

function crumbs(current) {
    return '<ol class="breadcrumb"><li><a href="#/">Home</a></li><li class="active">' + current + '</li></ol>';
}

/* looping liquid logo beside the title; Cu shows through if the video cannot load */
function heroVideo() {
    return '<div class="hero-art hero-art-video" aria-hidden="true">'
        + '<div class="ingot-halo"></div>'
        + '<div class="hero-video-frame">'
        +   '<span class="video-fallback">Cu</span>'
        +   '<video class="hero-video" autoplay muted loop playsinline preload="metadata" disablepictureinpicture>'
        +     '<source src="assets/liquid-logo.mp4" type="video/mp4">'
        +   '</video>'
        + '</div>'
        + '<div class="terminal-card">'
        + '<div class="terminal-bar"><span class="term-dots"><i></i><i></i><i></i></span>'
        + '<span>copper@laptop: ~</span><span class="term-tag">ingot</span></div>'
        + '<pre id="terminal-output" class="terminal-output">$ ingot install firefox</pre>'
        + '</div></div>';
}

/* ------------------------------------------------------------------
   pages
   ------------------------------------------------------------------ */
function pageHome() {
    return [
        '<header class="hero">',
        '  <div class="hero-grid" aria-hidden="true"></div>',
        '  <div class="container hero-inner">',
        '    <div class="hero-copy">',
        '      <p class="eyebrow"><span class="pulse"></span> Independent Linux distribution &middot; x86_64 &middot; Open source</p>',
        '      <h1 class="hero-title"><span class="hero-title-solid">Copper</span><span class="hero-title-outline">Linux<i>.</i></span></h1>',
        '      <p class="hero-lead">A small, fast desktop distribution built by one person and a few contributors. Ethernet works, the desktop boots clean, and <a href="#/ingot">ingot</a> installs the tools you need.</p>',
        '      <div class="hero-actions">',
        '        <a class="btn btn-primary-cl" href="https://github.com/12hrformat/copperlinux/releases/latest" target="_blank" rel="noopener"><i class="fas fa-download"></i> Download Copper Linux</a>',
        '        <a class="btn btn-ghost-cl" href="#/ingot">Explore ingot <i class="fas fa-arrow-right"></i></a>',
        '      </div>',
        '      <div class="hero-meta">',
        '        <span class="hero-chip">Latest: <a id="hero-release" href="https://github.com/12hrformat/copperlinux/releases" target="_blank" rel="noopener">checking&hellip;</a></span>',
        '        <span class="hero-chip hero-chip-quiet">Free &amp; open source</span>',
        '      </div>',
        '    </div>',
        '    ', heroVideo(),
        '  </div>',
        '</header>',
        '<div class="ticker" aria-hidden="true"><div class="ticker-track">',
        '  <span>NO TELEMETRY</span><b>&#9670;</b><span>BUILT FROM SCRATCH</span><b>&#9670;</b><span>INGOT PACKAGE MANAGER</span><b>&#9670;</b><span>X86_64</span><b>&#9670;</b><span>OPEN SOURCE</span><b>&#9670;</b>',
        '  <span>NO TELEMETRY</span><b>&#9670;</b><span>BUILT FROM SCRATCH</span><b>&#9670;</b><span>INGOT PACKAGE MANAGER</span><b>&#9670;</b><span>X86_64</span><b>&#9670;</b><span>OPEN SOURCE</span><b>&#9670;</b>',
        '</div></div>',
        '<div class="container site-content">',
        '  <div class="stat-strip">',
        '    <div class="stat"><span class="stat-num" id="stat-releases" data-count="6">&mdash;</span><span class="stat-label">GitHub releases</span></div>',
        '    <div class="stat"><span class="stat-num" id="stat-packages" data-count="100" data-suffix="+">0</span><span class="stat-label">ingot packages</span></div>',
        '    <div class="stat"><span class="stat-num">1</span><span class="stat-label">Maintainer</span></div>',
        '    <div class="stat"><span class="stat-num">x86_64</span><span class="stat-label">Architecture</span></div>',
        '  </div>',
        '  ', sectionHead('01 / The idea', 'Why Copper', 'A distro that stays out of the way and gives you a machine you actually own.'),
        '  <div class="feature-grid">',
        '    <article class="feature-card"><span class="feature-num">01</span><i class="fas fa-bolt feature-icon"></i><h3>Fast by default</h3><p>BusyBox roots and a lean live image. Boot to a usable desktop without waiting on a bunch of services you never asked for.</p></article>',
        '    <article class="feature-card"><span class="feature-num">02</span><i class="fas fa-cube feature-icon"></i><h3>ingot packages</h3><p>Copper has its own package manager and its own repository: tools, desktop apps, network utilities, libs and fonts. One command, verified payloads.</p></article>',
        '    <article class="feature-card"><span class="feature-num">03</span><i class="fas fa-desktop feature-icon"></i><h3>A real desktop</h3><p>Browser, terminal, editor, file manager. Pick XFCE or the niri Wayland session at first boot and get straight to work.</p></article>',
        '    <article class="feature-card"><span class="feature-num">04</span><i class="fas fa-code-branch feature-icon"></i><h3>Built in public</h3><p>One maintainer, a few contributors, all development on GitHub. Read the code, open an issue, or send the fix yourself.</p></article>',
        '  </div>',
        '  <div class="section-head"><p class="section-kicker">02 / The package manager</p><h2>Meet ingot</h2><p class="section-sub">Copper Linux ships with its own package manager. The <a href="https://github.com/12hrformat/copper-ingot-repo" target="_blank" rel="noopener">copper-ingot-repo</a> holds every packaged tool, and you can browse all of them right here.</p></div>',
        '  <div class="ingot-feature">',
        '    <div class="ingot-feature-copy">',
        '      <p class="ingot-callout">Packages built for Copper, not borrowed from someone else&rsquo;s distro.</p>',
        '      <p>ingot reads a small JSON index, fetches a signed-off payload, checks its SHA-256 and unpacks it. No hidden state, no surprise upgrades, no package manager fighting the image.</p>',
        '      <div class="code-block"><span class="code-label">terminal</span><code><span class="prompt">$</span> ingot install firefox<br><span class="prompt">$</span> ingot update<br><span class="prompt">$</span> ingot install nmap</code></div>',
        '      <div class="ingot-feature-actions"><a class="btn btn-primary-cl" href="#/ingot">Browse all packages <i class="fas fa-arrow-right"></i></a><a class="btn btn-link-cl" href="' + INGOT_REPO_URL + '" target="_blank" rel="noopener">View the repo <i class="fas fa-external-link-alt"></i></a></div>',
        '    </div>',
        '    <div class="ingot-feature-side">',
        '      <div class="preview-head"><span>Common installs</span><span id="ingot-preview-count">live</span></div>',
        '      <div id="ingot-preview" class="preview-list"><span class="dim-text">Loading packages&hellip;</span></div>',
        '      <a class="preview-foot" href="#/ingot">Open the package browser &rarr;</a>',
        '    </div>',
        '  </div>',
        '  ', sectionHead('03 / Releases', 'Download Copper Linux', 'Pre-releases are published on GitHub. Grab the newest ISO and boot it in a VM.'),
        '  <div id="release-list" class="release-list"><p class="dim-text">Loading releases&hellip;</p></div>',
        '  <div class="download-strip"><div><p class="section-kicker">Ready to try it?</p><h3>Get the latest Copper Linux ISO</h3></div><a class="btn btn-primary-cl" href="https://github.com/12hrformat/copperlinux/releases/latest" target="_blank" rel="noopener"><i class="fas fa-download"></i> Download now</a></div>',
        '  ', sectionHead('04 / Questions', 'Good to know', 'The short answers, before you go digging through the repo.'),
        '  <div class="faq-list">',
        '    <details class="faq-item" open><summary>What is Copper Linux?<i class="fas fa-plus"></i></summary><p>Copper Linux is a small, fast, independent Linux distribution for daily use. It is built by one maintainer with a few contributors and ships with ingot, Copper&rsquo;s own package manager.</p></details>',
        '    <details class="faq-item"><summary>Where can I download Copper Linux?<i class="fas fa-plus"></i></summary><p>Copper Linux pre-releases are published on GitHub. Use the latest release link on this site to download the newest Copper Linux ISO.</p></details>',
        '    <details class="faq-item"><summary>What is ingot?<i class="fas fa-plus"></i></summary><p>ingot is Copper Linux&rsquo;s own package manager. Its repository holds packaged tools, desktop apps, network utilities, libraries and fonts that can be installed on Copper Linux.</p></details>',
        '    <details class="faq-item"><summary>Is Copper Linux free?<i class="fas fa-plus"></i></summary><p>Yes. Copper Linux is open source and free to download, use, modify and contribute to.</p></details>',
        '    <details class="faq-item"><summary>Who makes Copper Linux?<i class="fas fa-plus"></i></summary><p>Copper Linux is built by one maintainer, 12hrformat, with help from a few contributors.</p></details>',
        '  </div>',
        '  <section class="contribute-band">',
        '    <p class="band-kicker">Contribute</p>',
        '    <h2>Help build it</h2>',
        '    <p class="band-sub">Download a pre-release, boot it, break it, then tell us what happened. Or fix it yourself and get listed as a contributor.</p>',
        '    <div class="contribute-steps">',
        '      <div class="step"><span class="step-num">1</span><h3>Download a pre-release</h3><p>The newest ISO is always on the releases page.</p></div>',
        '      <div class="step"><span class="step-num">2</span><h3>Boot it and break it</h3><p>Run it on real hardware and write down everything that misbehaves.</p></div>',
        '      <div class="step"><span class="step-num">3</span><h3>Report it or fix it</h3><p>Open an issue, send a pull request, or package a tool for ingot.</p></div>',
        '    </div>',
        '    <div class="band-actions"><a class="btn btn-band" href="https://github.com/12hrformat/copperlinux/releases" target="_blank" rel="noopener">Download a pre-release</a><a class="btn btn-band-ghost" href="#/contributions">How to contribute</a></div>',
        '  </section>',
        '</div>'
    ].join('');
}

function pageDaily() {
    return '<div class="container site-content">'
        + crumbs('Copper')
        + pageIntro('Daily driving mode', 'Copper', 'A desktop distro for web, code, school and work. Small enough to understand, complete enough to use every day.')
        + '<div class="content-grid">'
        + '<div class="panel panel-default text-left"><div class="panel-heading"><b>What is in it now</b></div><div class="list-group-item"><ul class="check-list">'
        + '<li><i class="fas fa-check"></i>A desktop that boots without drama — XFCE or niri</li>'
        + '<li><i class="fas fa-check"></i>Ethernet and basic networking working out of the box</li>'
        + '<li><i class="fas fa-check"></i>Browser, terminal and editor, ready on first boot</li>'
        + '<li><i class="fas fa-check"></i>ingot, Copper&rsquo;s own package manager</li>'
        + '</ul></div></div>'
        + '<div class="panel panel-default text-left"><div class="panel-heading"><b>Still in progress</b></div><div class="list-group-item"><ul class="check-list check-list-wait">'
        + '<li><i class="fas fa-hourglass-half"></i>A settings app you can actually find</li>'
        + '<li><i class="fas fa-hourglass-half"></i>Updates that never touch your config</li>'
        + '<li><i class="fas fa-hourglass-half"></i>Less fiddling to get toolchains running</li>'
        + '</ul></div></div>'
        + '</div>'
        + sectionHead('Packages', 'Everything Copper can install', 'The ingot repository is the source of truth — browse it live.')
        + '<div class="download-strip"><div><p class="section-kicker">Get Copper Linux</p><h3>Pre-releases are on GitHub</h3><p>There is no stable ISO yet, and we are not going to pretend otherwise. Boot a pre-release in a VM and tell us what breaks.</p></div><div class="strip-actions"><a class="btn btn-primary-cl" href="https://github.com/12hrformat/copperlinux/releases" target="_blank" rel="noopener">Pre-releases</a><a class="btn btn-ghost-cl" href="#/ingot">Browse ingot packages</a></div></div>'
        + '<p class="social-note">News and screenshots: <a href="https://instagram.com/copperlinux" target="_blank" rel="noopener">@copperlinux</a>.</p>'
        + '</div>';
}

function pageIngot() {
    return '<div class="container site-content">'
        + crumbs('ingot')
        + pageIntro('Copper Linux package manager', 'ingot<span class="intro-dot">.</span>', 'A package manager built for Copper, backed by a public repository of packaged tools, desktop apps, network utilities, libraries and fonts.')
        + '<div class="ingot-repo-panel">'
        + '  <div class="repo-title"><span class="repo-symbol">Cu</span><div><p class="repo-owner">12hrformat /</p><h2>copper-ingot-repo</h2></div></div>'
        + '  <p class="repo-desc">The package repository for <strong>ingot</strong>, Copper Linux&rsquo;s own package manager. Every payload is built for x86_64, checksummed and published in the open.</p>'
        + '  <div class="repo-facts"><a href="https://github.com/12hrformat/copper-ingot-repo" target="_blank" rel="noopener"><span id="ingot-stars">2</span><small>stars</small></a><a href="https://github.com/12hrformat/copper-ingot-repo/network/members" target="_blank" rel="noopener"><span id="ingot-forks">2</span><small>forks</small></a><a href="#/track"><span id="ingot-pkg-count">&hellip;</span><small>packages</small></a></div>'
        + '  <div class="repo-actions"><a class="btn btn-primary-cl" href="https://github.com/12hrformat/copper-ingot-repo" target="_blank" rel="noopener"><i class="fab fa-github"></i> Open the repository</a><a class="btn btn-ghost-cl" href="https://12hrformat.github.io/copper-ingot-repo/" target="_blank" rel="noopener">Repository site <i class="fas fa-external-link-alt"></i></a></div>'
        + '</div>'
        + sectionHead('How it works', 'Packages, not guesswork', 'ingot reads a small index, checks the payload hash, and unpacks it into place.')
        + '<div class="content-grid three-col">'
        + '  <article class="mini-card"><span class="feature-num">01</span><h3>Read the index</h3><p>One JSON file maps a package name to its category. The package page carries version, URL, size, SHA-256 and dependencies.</p></article>'
        + '  <article class="mini-card"><span class="feature-num">02</span><h3>Verify the payload</h3><p>Every tarball is checked against its published SHA-256 before a single file is unpacked. Paths are scanned for anything unsafe.</p></article>'
        + '  <article class="mini-card"><span class="feature-num">03</span><h3>Install and update</h3><p>ingot keeps an installed manifest, so <code>ingot update</code> knows exactly what changed on the repository side.</p></article>'
        + '</div>'
        + sectionHead('Package browser', 'The tools in ingot', 'Live from copper-ingot-repo. Search by name, command or dependency, then open any package page.')
        + '<div class="explorer">'
        + '  <div class="explorer-toolbar">'
        + '    <label class="search-field"><i class="fas fa-search"></i><input type="text" id="pkg-search" placeholder="Search packages, commands, dependencies&hellip;" oninput="searchIngot()" autocomplete="off"></label>'
        + '    <span class="pkg-count" id="pkg-count">loading&hellip;</span>'
        + '  </div>'
        + '  <div class="filter-row">'
        + '    <button type="button" class="filter-btn is-active" onclick="filterIngot(\'all\', this)">All</button>'
        + '    <button type="button" class="filter-btn" onclick="filterIngot(\'tools\', this)">Tools</button>'
        + '    <button type="button" class="filter-btn" onclick="filterIngot(\'network\', this)">Network</button>'
        + '    <button type="button" class="filter-btn" onclick="filterIngot(\'hacking\', this)">Hacking</button>'
        + '    <button type="button" class="filter-btn" onclick="filterIngot(\'desktop\', this)">Desktop</button>'
        + '    <button type="button" class="filter-btn" onclick="filterIngot(\'libs\', this)">Libs</button>'
        + '    <button type="button" class="filter-btn" onclick="filterIngot(\'fonts\', this)">Fonts</button>'
        + '  </div>'
        + '  <div id="ingot-packages" class="pkg-groups"><p class="dim-text">Loading packages from the repository&hellip;</p></div>'
        + '  <p class="pkg-source">Package data is read live from <a href="' + INGOT_REPO_URL + '" target="_blank" rel="noopener">copper-ingot-repo</a>. Want a tool added? <a href="' + INGOT_REPO_URL + '/pulls" target="_blank" rel="noopener">Open a pull request</a>.</p>'
        + '</div>'
        + '</div>';
}

function pageDownloads() {
    return '<div class="container site-content">'
        + crumbs('Download')
        + pageIntro('Get Copper Linux', 'Download', 'Copper Linux pre-releases are published on GitHub. The latest link always points at the newest build.')
        + '<div class="download-hero"><div><p class="section-kicker">Latest build</p><h2>Copper Linux pre-release</h2><p>Every build we cut is public. No sign-up, no mirror maze — just the ISO and the source.</p><a class="btn btn-primary-cl" href="https://github.com/12hrformat/copperlinux/releases/latest" target="_blank" rel="noopener"><i class="fas fa-download"></i> Download the latest ISO</a></div><div class="download-side"><i class="fas fa-compact-disc"></i><span>x86_64</span><span>live ISO</span><span>open source</span></div></div>'
        + sectionHead('Before you boot', 'How to run it', 'A few things worth knowing before you write an image to a USB stick.')
        + '<div class="content-grid three-col">'
        + '  <article class="mini-card"><span class="feature-num">01</span><h3>Grab the ISO</h3><p>Download the newest pre-release from the <a href="https://github.com/12hrformat/copperlinux/releases" target="_blank" rel="noopener">releases page</a>, or build from the <a href="https://github.com/12hrformat/copperlinux/archive/refs/heads/main.zip" target="_blank" rel="noopener">main branch</a>.</p></article>'
        + '  <article class="mini-card"><span class="feature-num">02</span><h3>Attach it to a VM</h3><p>VMware, VirtualBox or QEMU with at least 2&nbsp;GB of RAM. Boot from the CD and follow the first-boot wizard for your user and desktop.</p></article>'
        + '  <article class="mini-card"><span class="feature-num">03</span><h3>Try it, then install</h3><p>Everything runs from the live image. Nothing touches your disk unless you decide to install it.</p></article>'
        + '</div>'
        + '<div class="download-strip"><div><p class="section-kicker">After install</p><h3>Need more tools?</h3><p>Use ingot to add packages from the Copper repository.</p></div><a class="btn btn-ghost-cl" href="#/ingot">Browse ingot packages <i class="fas fa-arrow-right"></i></a></div>'
        + '</div>';
}

function pageContributions() {
    return '<div class="container site-content">'
        + crumbs('Contribute')
        + pageIntro('Open source, all of it', 'Contribute', 'One maintainer and a few contributors build Copper Linux in public. There is plenty of room to help.')
        + sectionHead('Where help lands', 'What we need', 'Pick whatever you are good at. All of it moves the distro forward.')
        + '<div class="content-grid">'
        + '  <article class="mini-card"><i class="fas fa-code feature-icon"></i><h3>Code</h3><p>Find a bug and fix it. Core utilities and the image build are always worth a look.</p></article>'
        + '  <article class="mini-card"><i class="fas fa-bug feature-icon"></i><h3>Bug reports</h3><p>Something broke? Tell us exactly what you did and what happened next.</p></article>'
        + '  <article class="mini-card"><i class="fas fa-flask feature-icon"></i><h3>Testing</h3><p>Boot a pre-release on weird hardware and report what explodes.</p></article>'
        + '  <article class="mini-card"><i class="fas fa-box feature-icon"></i><h3>ingot packages</h3><p>Add a package page and payload to <a href="https://github.com/12hrformat/copper-ingot-repo" target="_blank" rel="noopener">copper-ingot-repo</a>, then regenerate the index.</p></article>'
        + '</div>'
        + sectionHead('The flow', 'How it works', 'The usual GitHub loop. No ceremony.')
        + '<ol class="step-list">'
        + '<li><span>01</span><div><h3>Fork the repository</h3><p>Copper Linux or copper-ingot-repo, depending on what you are changing.</p></div></li>'
        + '<li><span>02</span><div><h3>Make a branch and do the thing</h3><p>Keep the change small enough to review.</p></div></li>'
        + '<li><span>03</span><div><h3>Test it</h3><p>Boot it, install it, or run the repo&rsquo;s own checks.</p></div></li>'
        + '<li><span>04</span><div><h3>Open a pull request</h3><p>Say what changed and why. We&rsquo;ll take it from there.</p></div></li>'
        + '</ol>'
        + '<div class="download-strip"><div><p class="section-kicker">Start here</p><h3>Pick a repo and jump in</h3></div><div class="strip-actions"><a class="btn btn-primary-cl" href="https://github.com/12hrformat/copperlinux" target="_blank" rel="noopener">Copper Linux</a><a class="btn btn-ghost-cl" href="https://github.com/12hrformat/copper-ingot-repo" target="_blank" rel="noopener">copper-ingot-repo</a><a class="btn btn-link-cl" href="#/track">Track development</a></div></div>'
        + '</div>';
}

function pageContributors() {
    return '<div class="container site-content">'
        + crumbs('Team')
        + pageIntro('The people behind it', 'Team', 'Copper Linux is built by one maintainer, with a few contributors who keep finding things to fix.')
        + '<div class="team-intro"><span class="team-intro-num">1</span><div><h2>One maintainer, a few contributors</h2><p>12hrformat started Copper Linux and still leads development. Everyone below has pushed code, packaged a tool or helped work out what the distro should be.</p></div></div>'
        + '<div id="team-grid" class="team-grid"><p class="dim-text">Loading the team&hellip;</p></div>'
        + sectionHead('Social', 'Keep up', 'Development updates and screenshots land on Instagram.')
        + '<div class="download-strip"><div><p class="section-kicker">Follow along</p><h3><a href="https://instagram.com/copperlinux" target="_blank" rel="noopener">@copperlinux</a></h3><p>Or watch the commits come in on the <a href="#/track">track page</a>.</p></div><a class="btn btn-ghost-cl" href="#/contributions">Contribute <i class="fas fa-arrow-right"></i></a></div>'
        + '</div>';
}

function pageTrack() {
    return '<div class="container site-content">'
        + crumbs('Track')
        + pageIntro('Live from GitHub', 'Track', 'Recent commits from copperlinux and copper-ingot-repo. Refreshes every minute.')
        + '<div class="panel panel-default text-left track-panel">'
        + '<div class="panel-heading"><b>Live development feed</b><button type="button" id="track-refresh" class="btn btn-xs btn-xs-cl">Refresh now</button></div>'
        + '<div class="list-group-item">'
        + '<div class="info"><p><i class="fas fa-sync-alt"></i> Tracking the <b>main</b> branch of both repositories.</p></div>'
        + '<div id="track-banner"></div><div id="track-status" class="track-status"></div><div id="track-feeds"></div>'
        + '</div></div>'
        + '</div>';
}

/* ------------------------------------------------------------------
   Documentation — in-site guides and a live GitHub issue tracker.
   ------------------------------------------------------------------ */
function docsLink(href, label, icon, active) {
    return '<a class="docs-side-link' + (active ? ' is-active' : '') + '" href="' + href + '">'
        + '<i class="' + icon + '" aria-hidden="true"></i>' + label + '</a>';
}

function docShell(kicker, title, lead, body, current) {
    var nav = '<p class="docs-sidebar-title">Guides</p>'
        + docsLink('#/docs', 'Overview', 'fas fa-book', current === 'Overview')
        + docsLink('#/docs/copper', 'Copper Linux', 'fas fa-desktop', current === 'Copper Linux')
        + docsLink('#/docs/ingot', 'ingot', 'fas fa-box', current === 'ingot')
        + docsLink('#/bugs', 'Bug tracker', 'fas fa-bug', current === 'Bug tracker')
        + '<p class="docs-sidebar-title">Source</p>'
        + '<a class="docs-side-link" href="https://github.com/12hrformat/copperlinux" target="_blank" rel="noopener"><i class="fab fa-github" aria-hidden="true"></i>copperlinux</a>'
        + '<a class="docs-side-link" href="https://github.com/12hrformat/copper-ingot-repo" target="_blank" rel="noopener"><i class="fab fa-github" aria-hidden="true"></i>copper-ingot-repo</a>'
        + '<a class="docs-side-link" href="https://github.com/12hrformat/copperlinux-site" target="_blank" rel="noopener"><i class="fab fa-github" aria-hidden="true"></i>copperlinux-site</a>';

    return '<div class="container site-content docs-page">'
        + crumbs('Docs / ' + current)
        + pageIntro(kicker, title, lead)
        + '<div class="docs-layout">'
        + '  <aside class="docs-sidebar" aria-label="Documentation navigation">' + nav + '</aside>'
        + '  <div class="docs-main">' + body + '</div>'
        + '</div>'
        + '</div>';
}

function docSection(num, title, intro, content) {
    return '<section class="doc-section">'
        + '<div class="doc-section-head"><span class="doc-section-num">' + num + '</span><div>'
        + '<h2>' + title + '</h2>' + (intro ? '<p>' + intro + '</p>' : '')
        + '</div></div>'
        + '<div class="doc-section-body">' + content + '</div>'
        + '</section>';
}

function docCode(lines) {
    var text = Array.isArray(lines) ? lines.join('\n') : String(lines);
    return '<pre class="doc-code"><code>' + escHtml(text) + '</code></pre>';
}

function docTable(cols, rows) {
    return '<div class="doc-table-wrap"><table class="doc-table"><thead><tr>'
        + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('')
        + '</tr></thead><tbody>'
        + rows.map(function (row) {
            return '<tr>' + row.map(function (cell) { return '<td>' + cell + '</td>'; }).join('') + '</tr>';
        }).join('')
        + '</tbody></table></div>';
}

function docNote(title, text, kind) {
    var icon = kind === 'warn' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    return '<aside class="doc-note' + (kind ? ' doc-note-' + kind : '') + '">'
        + '<i class="fas ' + icon + '" aria-hidden="true"></i>'
        + '<div><b>' + title + '</b><p>' + text + '</p></div></aside>';
}

function pageDocs() {
    var body = docSection('01', 'Pick a guide', 'Three short guides cover the things people actually ask about.',
        '<div class="doc-card-grid">'
        + '<a class="mini-card doc-card" href="#/docs/copper"><span class="feature-num">01</span><h3>Copper Linux</h3><p>Boot the live ISO, first-boot questions, XFCE / niri / Hyprland, audio and boot entries.</p><span class="doc-card-more">Read the guide <i class="fas fa-arrow-right"></i></span></a>'
        + '<a class="mini-card doc-card" href="#/docs/ingot"><span class="feature-num">02</span><h3>ingot</h3><p>Every command, the package repository layout, mirrors, and how to add a package.</p><span class="doc-card-more">Read the guide <i class="fas fa-arrow-right"></i></span></a>'
        + '<a class="mini-card doc-card" href="#/bugs"><span class="feature-num">03</span><h3>Bug tracker</h3><p>Where to report a bad boot, a broken payload or a site bug — and what to include.</p><span class="doc-card-more">Open tracker <i class="fas fa-arrow-right"></i></span></a>'
        + '</div>'
        + docNote('Pre-release, not a promise', 'Copper Linux is still a work in progress. The ISO is for testing in a VM or on hardware you can afford to play with. Clear bug reports are more useful than polite silence.')
        + '<p>Read the Copper guide first if you are new to the ISO. The ingot guide assumes you already have a running Copper prompt. The bug tracker is the last stop when something does not match what these pages describe.</p>')
        + docSection('02', 'Where the source lives', 'These pages are a readable layer over the real repositories.',
        docTable(['Repository', 'What it holds', 'Link'], [
            ['<code>12hrformat/copperlinux</code>', 'ISO build, first boot, desktop launchers, init and core utilities', '<a href="https://github.com/12hrformat/copperlinux" target="_blank" rel="noopener">Open <i class="fas fa-external-link-alt"></i></a>'],
            ['<code>12hrformat/copper-ingot-repo</code>', 'Package pages, indexes, payload tarballs and repo tooling', '<a href="https://github.com/12hrformat/copper-ingot-repo" target="_blank" rel="noopener">Open <i class="fas fa-external-link-alt"></i></a>'],
            ['<code>12hrformat/copperlinux-site</code>', 'This website and its documentation', '<a href="https://github.com/12hrformat/copperlinux-site" target="_blank" rel="noopener">Open <i class="fas fa-external-link-alt"></i></a>']
        ])
        + '<p>Each guide is written from the files that build the ISO and the repository that feeds ingot, so a command you read here matches the code you can inspect. If a detail drifts, the GitHub links above are the authority.</p>')
        + docSection('03', 'Still need a hand?', 'Contribution and development pages sit next to the docs.',
        '<div class="doc-actions">'
        + '<a class="btn btn-primary-cl" href="#/downloads"><i class="fas fa-download"></i> Get the ISO</a>'
        + '<a class="btn btn-ghost-cl" href="#/contributions">Contribute</a>'
        + '<a class="btn btn-link-cl" href="#/track">Track development <i class="fas fa-arrow-right"></i></a>'
        + '</div>');

    return docShell('Documentation hub', 'Documentation<span class="intro-dot">.</span>',
        'Practical guides for booting Copper Linux, using ingot and reporting what breaks.',
        body, 'Overview');
}

function pageDocsCopper() {
    var body = docSection('01', 'Before you boot', 'The image is a live ISO. It does not touch your disk until you decide to install it.',
        '<p>Download the newest <a href="https://github.com/12hrformat/copperlinux/releases" target="_blank" rel="noopener">pre-release ISO</a> and attach it to VMware, VirtualBox or QEMU with at least 2&nbsp;GB of RAM. Boot from the virtual CD. If you write it to a USB stick, double-check the target device first.</p>'
        + docTable(['Boot entry', 'What you get'], [
            ['Copper Linux', 'First-boot wizard if needed, then a shell. This is the default.'],
            ['Copper Linux (systemd init)', 'The same image with the systemd payload selected via <code>copper.init=systemd</code>.'],
            ['Copper Linux (verbose)', 'The default path with kernel messages visible.'],
            ['Copper Linux (debug)', 'Everything logged, with panic-on-hang so a wedge reboots and shows the failure.'],
            ['Copper Linux (initramfs shell)', 'A shell inside the initramfs, skipping the overlay — useful for splitting kernel/initrd failures from <code>/init</code> failures.']
        ])
        + docNote('Known rough edge', 'The X stack is proven under QEMU, but not every machine. That is why the default boot lands at a prompt instead of a desktop. <code>nogui</code> on the kernel command line is the escape hatch if a graphics session gets in the way.', 'warn')
        + '<p>The image boots to a shell on purpose. A desktop is something you start once the machine has been checked, not a thing forced on every driver. That keeps a bad graphics stack from turning a usable recovery tool into a black screen.</p>')
        + docSection('02', 'First boot', 'The wizard asks about you, not about implementation details.',
        '<p>It asks for your name, login, machine name, passwords and timezone. It does not ask you to choose a desktop, shell, audio server or init — the image is built around XFCE, bash, PulseAudio and copper-init. First-boot answers apply to the live session; a reboot asks again.</p>'
        + docTable(['Keys', 'Where you land'], [
            ['Default image, <code>Ctrl+Alt+F3</code>', 'Password-protected login prompt on tty3. Use the account created in the wizard.'],
            ['<code>Ctrl+Alt+F1</code>', 'Back to the main session.'],
            ['systemd image, <code>Ctrl+Alt+F2</code>–<code>F6</code>', 'Login prompts on those TTYs.']
        ])
        + '<p>Answers are kept in a lightweight first-boot database so the shell can greet you by name. Nothing about that choice is written to disk until you install the distribution.</p>')
        + docSection('03', 'Start a desktop', 'XFCE is the default. niri and Hyprland are optional and never start at the same time.',
        docTable(['Command', 'What it does'], [
            ['<code>startxfce</code>', 'Starts an X server if needed, then XFCE.'],
            ['<code>startxfce --check</code>', 'Reports what is installed and exits without starting anything.'],
            ['<code>startniri</code>', 'Starts the optional niri Wayland desktop on the TTY.'],
            ['<code>startniri --check</code>', 'Checks niri and exits without starting the session.'],
            ['<code>sudo ingot install hyprland</code>', 'Installs the Hyprland payload before the first launch.'],
            ['<code>starthyprland</code>', 'Seeds the Hyprland config and starts the compositor.'],
            ['<code>starthyprland --check</code>', 'Checks the install without starting the compositor.'],
            ['<code>starthyprland --yes</code> / <code>--no</code>', 'Accept or decline installing the components the payload lists.']
        ])
        + docNote('Scriptable exit codes', '<code>startxfce</code> exits <code>20</code> for no X server, <code>21</code> for no XFCE, <code>22</code> if the server never opened a display, <code>23</code> if it exited while starting, and <code>24</code> on a usage error. A script can branch on those numbers without parsing a message.')
        + '<p>All three launchers share the same pattern: they check prerequisites, print the missing piece if something is absent, and only then hand over to the display server. That is why <code>--check</code> is the first thing to run when a session will not start.</p>')
        + docSection('04', 'Sound', 'Both audio servers ship in the image; /etc/copper.conf chooses one.',
        docCode([
            '# /etc/copper.conf',
            'audio=pulseaudio      # the default',
            'audio=pipewire        # pipewire + wireplumber + pipewire-pulse'
        ])
        + '<p>Switching is a one-line edit and a new session, not a reinstall. Both serve the PulseAudio protocol used by Firefox, mpv and cava. The launchers call <code>copper-audio init</code>, which unmutes and raises the controls on every card the kernel reports.</p>'
        + docTable(['Command', 'What it does'], [
            ['<code>copper-audio</code> / <code>copper-audio status</code>', 'Selected server, running state, cards, sinks, sources and levels.'],
            ['<code>copper-audio init</code>', 'Unmute and raise playback to 80% and capture to 100% on every card.'],
            ['<code>copper-audio test</code>', 'One second of 440&nbsp;Hz on the default device.'],
            ['<code>copper-audio server</code>', 'Which server is currently up.']
        ])
        + docNote('No sound at all?', 'Check <code>/proc/asound/cards</code>. If it is empty, the hardware is not HDA and the driver really is missing — the image only ships the HDA driver set. <code>copper-audio status</code> shows whether everything landed on the null sink.', 'warn')
        + '<p>If a USB microphone or dock shows up as a second card, <code>copper-audio init</code> raises all of them rather than guessing which one you meant. Use <code>copper-audio status</code> to see the sink names before you pick a default.</p>')
        + docSection('05', 'Troubleshooting', 'Common failures and what they actually mean.',
        '<ul class="check-list check-list-wait">'
        + '<li><i class="fas fa-hourglass-half"></i><code>starthyprland: no seatd socket at /run/seatd.sock</code> — add the user to the <code>_seatd</code> group, then reboot or log out and back in.</li>'
        + '<li><i class="fas fa-hourglass-half"></i><code>starthyprland: no writable runtime directory</code> — <code>/run/user/&lt;uid&gt;</code> was not created; boot with the default init.</li>'
        + '<li><i class="fas fa-hourglass-half"></i><code>starthyprland: forcing software rendering</code> — no DRM render node, common in a VM without 3D acceleration. Leave VMware 3D acceleration on for niri.</li>'
        + '<li><i class="fas fa-hourglass-half"></i><code>Error opening terminal: linux.</code> — install <code>ncurses-base</code>; full-screen programs need terminfo at runtime.</li>'
        + '<li><i class="fas fa-hourglass-half"></i>A compositor dies with a shared-library error — the image is older than the payload; rebuild the ISO so the stage library precedence applies.</li>'
        + '</ul>'
        + '<p>When you report one of these, copy the exact launcher and the full line it printed. The wording is deliberately specific because it tells you which layer failed.</p>'
        + '<p>Hyprland starts from a TTY only: no display manager or graphical login is configured, and the launcher is the single entry point. Anything still broken belongs on the <a href="#/bugs">bug tracker</a>.</p>');

    return docShell('Copper Linux guide', 'Copper Linux<span class="intro-dot">.</span>',
        'Boot the pre-release, answer first boot, start a desktop, get sound working, and read the failure messages.',
        body, 'Copper Linux');
}

function pageDocsIngot() {
    var body = docSection('01', 'The command line', 'ingot is a POSIX-shell package manager. One verb, one or more package names.',
        docCode(['ingot <install|remove|update|reinstall|inspect|info|search|list> <name>...'])
        + docTable(['Command', 'What it does'], [
            ['<code>sudo ingot install &lt;name&gt;...</code>', 'Fetch each package page, verify the payload, unpack into <code>/</code>. Dependencies install first.'],
            ['<code>sudo ingot remove &lt;name&gt;...</code>', 'Delete the files recorded in that package&rsquo;s installed manifest.'],
            ['<code>sudo ingot update [name]...</code>', 'Reinstall packages whose repository SHA-256 changed; all installed packages if no name is given.'],
            ['<code>sudo ingot reinstall &lt;name&gt;...</code>', 'Install again in place, replacing the existing tree.'],
            ['<code>ingot inspect &lt;name&gt;</code>', 'Show the installed record: version, URL, SHA-256 and files.'],
            ['<code>ingot info &lt;name&gt;</code>', 'Print the package page from the repository.'],
            ['<code>ingot search &lt;term&gt;</code>', 'Search the package index.'],
            ['<code>ingot list</code>', 'List installed packages and versions.']
        ])
        + docNote('Root is only needed for writes', 'Install, remove, update and reinstall write into <code>/</code>, so run them with <code>sudo</code>. <code>list</code>, <code>info</code>, <code>search</code> and <code>inspect</code> only read.')
        + '<p>The verb list is short on purpose. There is no daemon, no background index and no repository clone on your machine: ingot reads flat pages over HTTPS and records what it installed locally.</p>')
        + docSection('02', 'A normal session', 'Install a browser, add a network tool, then update what changed.',
        docCode([
            'sudo ingot install firefox',
            'sudo ingot install tcpdump nmap',
            'ingot list',
            'sudo ingot update',
            'ingot inspect tcpdump'
        ])
        + '<p>Before unpacking anything, ingot checks the payload&rsquo;s SHA-256 against the package page and refuses archives containing absolute paths or <code>..</code> segments. It writes an installed manifest under <code>/var/lib/ingot/</code> so updates and removals know exactly which files belong to a package. Payloads are x86_64 Linux (glibc).</p>'
        + '<p>A failed download or a hash mismatch leaves the system untouched. ingot verifies before it unpacks, so a bad mirror cannot quietly replace a payload with something else.</p>')
        + docSection('03', 'Repository layout', 'The default repository is public and flat: one index plus one page per package.',
        docCode([
            'https://12hrformat.github.io/copper-ingot-repo/iso/copper/pkg/index.json',
            'https://12hrformat.github.io/copper-ingot-repo/iso/copper/pkg/<category>/<name>'
        ])
        + '<p><code>index.json</code> maps a name to its category; the category is also the directory the page lives in. The repository URL can be overridden in <code>/etc/ingot.conf</code> or with the <code>INGOT_REPO</code> environment variable.</p>'
        + docCode([
            '{',
            '  "name": "tcpdump",',
            '  "version": "4.99.7-1",',
            '  "category": "network",',
            '  "url": "https://github.com/12hrformat/copper-ingot-repo/releases/download/payloads-v1/tcpdump-4.99.7-1.tar.gz",',
            '  "size": 533377,',
            '  "sha256": "6ae1d621c17e1931747ad6fdb31e67e8f7299437b589ed66ec580cc2d2b0e8a2",',
            '  "depends": ["libpcap"]',
            '}'
        ])
        + docNote('Format matters', 'ingot reads one key per line with a line matcher, not a JSON parser. Keep every field on its own line, put <code>depends</code> on one line, and leave <code>size</code> unquoted. A missing <code>url</code> or <code>sha256</code> means ingot refuses to install.', 'warn')
        + '<p>Categories are plain directory names, not namespaces with special rules. A package called <code>tcpdump</code> lives at <code>iso/copper/pkg/network/tcpdump</code> because <code>index.json</code> says its category is <code>network</code>.</p>'
        + docTable(['Field', 'Required', 'Shape'], [
            ['<code>name</code>', 'yes', 'String; matches the index entry and file name.'],
            ['<code>version</code>', 'yes', 'String.'],
            ['<code>category</code>', 'yes', 'String; matches <code>index.json</code> and the directory.'],
            ['<code>url</code>', 'yes', 'Direct GitHub Release asset URL; no authentication.'],
            ['<code>sha256</code>', 'yes', '64-character hex hash of that exact tarball.'],
            ['<code>size</code>', 'no', 'Unquoted byte count; enables the live download bar.'],
            ['<code>depends</code>', 'no', 'Single-line array such as <code>["libpcap"]</code>, or omit it.']
        ]))
        + docSection('04', 'Slow downloads and mirrors', 'Release CDNs can throttle large assets, so ingot tries public mirrors first.',
        '<p>Every source is checked against the page&rsquo;s SHA-256. A mirror that serves the wrong bytes is discarded, and the canonical URL is what gets recorded in the manifest. Choose your own prefixes or talk directly to GitHub:</p>'
        + docCode([
            'sudo env INGOT_MIRRORS=https://ghfast.top ingot install firefox',
            'sudo env INGOT_MIRRORS=none ingot install firefox'
        ]))
        + docSection('05', 'Add a package', 'The page files are the source of truth; the index is generated from them.',
        '<ol class="step-list">'
        + '<li><span>01</span><div><h3>Stage the tarball</h3><p>Use <code>usr/...</code> paths relative to <code>/</code>. No leading <code>/</code>, no <code>..</code>. Add command-name symlinks yourself — nothing runs a <code>postinst</code>.</p></div></li>'
        + '<li><span>02</span><div><h3>Upload to a Release</h3><p>Pages holds metadata, never binaries. A <code>+</code> in an asset name must be sent as <code>%2B</code>.</p></div></li>'
        + '<li><span>03</span><div><h3>Hash the exact bytes</h3><p>Run <code>sha256sum</code> on the uploaded tarball. If you rebuild it, hash it again.</p></div></li>'
        + '<li><span>04</span><div><h3>Write the package page</h3><p>One key per line at <code>iso/copper/pkg/&lt;category&gt;/&lt;name&gt;</code>, pretty-printed.</p></div></li>'
        + '<li><span>05</span><div><h3>Regenerate the index</h3><p>Run <code>python3 tools/index.py</code>, then <code>python3 tools/index.py --check</code> and <code>python3 tools/audit.py</code>.</p></div></li>'
        + '<li><span>06</span><div><h3>Open a pull request</h3><p>Pages republishes from <code>main</code> within about a minute.</p></div></li>'
        + '</ol>'
        + '<p>After a pull request lands, Pages republishes from <code>main</code>. The package browser on this site reads the repository README, so newly listed tools show up here once that file is updated.</p>')
        + docSection('06', 'Test without touching your system', 'Point ingot at a scratch root and it runs unprivileged.',
        docCode([
            'INGOT_REPO="https://12hrformat.github.io/copper-ingot-repo" \\',
            'INGOT_ROOT="$PWD/scratch" \\',
            'sh ingot install tcpdump'
        ])
        + '<p>Expected output ends with <code>ingot: installed libpcap</code> and <code>ingot: installed tcpdump</code>. The files appear under <code>scratch/</code> instead of <code>/</code>. Browse the same repository on the <a href="#/ingot">ingot page</a>, and report payload problems on the <a href="#/bugs">bug tracker</a>.</p>');

    return docShell('ingot guide', 'ingot<span class="intro-dot">.</span>',
        'Commands, package pages, mirrors, adding a package, and a safe scratch-root test.',
        body, 'ingot');
}

var BUG_REPOS = [
    { owner: '12hrformat', repo: 'copperlinux', label: 'copperlinux', url: 'https://github.com/12hrformat/copperlinux', scope: 'ISO, boot, first boot, desktops and core utilities' },
    { owner: '12hrformat', repo: 'copper-ingot-repo', label: 'copper-ingot-repo', url: 'https://github.com/12hrformat/copper-ingot-repo', scope: 'Packages, payloads, the index and mirrors' }
];

var NO_BUGS_TEXT = 'no bugs!!! (yet)';

var BUG_REPORT_TEMPLATE = [
    '**What happened**',
    '',
    '**What you expected**',
    '',
    '**Build / commit**',
    '',
    '**Hardware or VM**',
    '',
    '**Exact steps or commands**',
    '',
    '**Logs / screenshots**',
    ''
].join('\n');

function reportBugUrl(repo) {
    return repo.url + '/issues/new?body=' + encodeURIComponent(BUG_REPORT_TEMPLATE);
}

function pageBugs() {
    var reportCards = BUG_REPOS.map(function (r) {
        return '<article class="mini-card doc-card bug-report-card">'
            + '<h3>' + escHtml(r.label) + '</h3>'
            + '<p>' + escHtml(r.scope) + '</p>'
            + '<div class="doc-card-more"><a href="' + reportBugUrl(r) + '" target="_blank" rel="noopener">Report here <i class="fas fa-external-link-alt"></i></a>'
            + ' <a href="' + r.url + '/issues" target="_blank" rel="noopener">All issues</a></div>'
            + '</article>';
    }).join('');

    var body = docSection('01', 'Report it in the right place', 'Pick the repository that owns the thing that broke.',
        '<div class="doc-card-grid two">' + reportCards + '</div>'
        + docNote('GitHub login needed', 'The report buttons open a pre-filled GitHub issue form. You need a GitHub account to submit it. If you are unsure which repo to use, the Copper Linux repo is the safe default.'))
        + docSection('02', 'What to include', 'A bug report is a small experiment someone else can repeat.',
        '<ol class="step-list">'
        + '<li><span>01</span><div><h3>Expected and actual</h3><p>One sentence for each. Do not stop at &ldquo;it doesn&rsquo;t work&rdquo;.</p></div></li>'
        + '<li><span>02</span><div><h3>The exact build</h3><p>ISO tag or commit, and whether you booted the default or systemd entry.</p></div></li>'
        + '<li><span>03</span><div><h3>The machine</h3><p>Real hardware or a VM, plus the VM&rsquo;s graphics and audio settings when relevant.</p></div></li>'
        + '<li><span>04</span><div><h3>The commands</h3><p>Copy and paste what you typed and what came back. Include the full error line.</p></div></li>'
        + '<li><span>05</span><div><h3>One bug per issue</h3><p>Three small reports are easier to fix than one long list.</p></div></li>'
        + '</ol>'
        + docNote('The title is part of the report', 'Use &ldquo;starthyprland fails on QEMU without 3D acceleration&rdquo; instead of &ldquo;help&rdquo;. That title is what appears in the tracker below and what someone will search for later.'))
        + docSection('03', 'Live issue tracker', 'Pulled from copperlinux and copper-ingot-repo every minute. Pull requests are skipped; only real issues are listed.',
        '<div class="panel panel-default text-left issue-panel">'
        + '<div class="panel-heading"><b>Open issues</b><button type="button" id="bugs-refresh" class="btn btn-xs btn-xs-cl">Refresh now</button></div>'
        + '<div class="list-group-item">'
        + '<div id="bugs-banner"></div><div id="bugs-status" class="track-status"></div>'
        + '<div id="bugs-feeds" class="row bug-feed"></div>'
        + '</div></div>');

    return docShell('Bug tracking', 'Bug tracker<span class="intro-dot">.</span>',
        'Report a reproducible problem and watch open issues from copperlinux and copper-ingot-repo. When there are none, the tracker says so.',
        body, 'Bug tracker');
}

function issueRepoPanel(r) {
    return '<div class="col-md-6 bug-col">'
        + '<div class="panel panel-default text-left issue-panel">'
        + '<div class="panel-heading"><b>' + escHtml(r.label) + '</b>'
        + '<a class="repo-link" href="' + r.url + '/issues" target="_blank" rel="noopener">All &rarr;</a></div>'
        + '<div class="list-group-item">'
        + '<p class="issue-repo-desc">' + escHtml(r.scope) + '</p>'
        + '<div class="issue-list" data-repo="' + escHtml(r.owner + '/' + r.repo) + '"><p class="dim-text">Loading issues&hellip;</p></div>'
        + '</div></div></div>';
}

function issueCard(i) {
    var open = i.state === 'open';
    var state = '<span class="issue-state issue-state-' + (open ? 'open' : 'closed') + '">' + (open ? 'Open' : 'Closed') + '</span>';
    var labels = (i.labels || []).slice(0, 3).map(function (l) {
        return '<span class="issue-label">' + escHtml(l.name || '') + '</span>';
    }).join('');
    var meta = ['#' + escHtml(i.number || '')];
    if (i.updated_at) meta.push(escHtml(timeAgo(i.updated_at)));
    if (i.comments) meta.push('<i class="fas fa-comment" aria-hidden="true"></i> ' + escHtml(i.comments));

    return '<article class="issue-card">'
        + '<div class="issue-top">' + state + '<span class="issue-number">' + meta.join(' &middot; ') + '</span></div>'
        + '<a class="issue-title" href="' + escHtml(i.html_url || '') + '" target="_blank" rel="noopener">' + escHtml(i.title || '(no title)') + '</a>'
        + (labels ? '<div class="issue-labels">' + labels + '</div>' : '')
        + '</article>';
}

/* live issue feed — refreshes once a minute while #/bugs is open */
var issueTimer = null;

function startIssuePolling() {
    stopIssuePolling();
    issueTimer = setInterval(loadIssues, 60000);
}

function stopIssuePolling() {
    if (issueTimer) { clearInterval(issueTimer); issueTimer = null; }
}

function loadIssues() {
    var feed = document.getElementById('bugs-feeds');
    var status = document.getElementById('bugs-status');
    var banner = document.getElementById('bugs-banner');
    if (!feed) return;

    startIssuePolling();
    if (banner) banner.innerHTML = '';
    if (status) {
        status.classList.remove('no-bugs-status');
        status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching open issues&hellip;';
    }
    feed.innerHTML = BUG_REPOS.map(issueRepoPanel).join('');

    var remaining = BUG_REPOS.length;
    var found = 0;
    var failed = 0;
    BUG_REPOS.forEach(function (r) {
        loadRepoIssues(r).then(function (count) {
            if (count < 0) failed++;
            else found += count;
            remaining--;
            if (remaining > 0 || !status) return;

            if (failed) {
                status.textContent = 'GitHub unreachable — use the links above.';
            } else if (found) {
                status.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
            } else {
                status.classList.add('no-bugs-status');
                status.textContent = NO_BUGS_TEXT;
            }
        });
    });
}

async function loadRepoIssues(r) {
    var box = document.querySelector('.issue-list[data-repo="' + r.owner + '/' + r.repo + '"]');
    if (!box) return 0;

    var cacheKey = 'issues:' + r.owner + '/' + r.repo;
    try {
        var path = '/repos/' + r.owner + '/' + r.repo + '/issues?state=open&sort=updated&per_page=12';
        var issues = await ghGet(path);
        var reports = (Array.isArray(issues) ? issues : []).filter(function (i) { return !i.pull_request; }).slice(0, 6);
        if (!reports.length) {
            box.innerHTML = '<p class="dim-text no-bugs">' + NO_BUGS_TEXT + '</p>';
            return 0;
        }
        box.innerHTML = reports.map(issueCard).join('');
        try { localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), html: box.innerHTML })); } catch (e) { /* storage unavailable */ }
        return reports.length;
    } catch (e) {
        if (e && e.message === 'rate limited') markRateLimited();
        var why = (e && e.message === 'not found')
            ? 'That repository does not exist yet.'
            : 'Could not reach the GitHub API (rate limit or network).';
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (e2) { cached = null; }
        if (cached && cached.html && cached.html.indexOf('issue-card') > -1) {
            box.innerHTML = '<p class="dim-text track-warn"><i class="fas fa-exclamation-triangle"></i> GitHub rate limit hit — showing last known issues.</p>' + cached.html;
        } else {
            box.innerHTML = '<p class="dim-text">' + why + ' <a href="' + r.url + '/issues" target="_blank" rel="noopener">Check GitHub directly</a>.</p>';
        }
        return -1;
    }
}

function page404() {
    return '<div class="container site-content">'
        + crumbs('404')
        + pageIntro('Nothing here', '404', 'That page does not exist. Maybe a typo, maybe an old link.')
        + '<div class="download-strip"><div><h3>Head back home</h3><p>Everything is one click away from the start.</p></div><a class="btn btn-primary-cl" href="#/">Return home</a></div>'
        + '</div>';
}
