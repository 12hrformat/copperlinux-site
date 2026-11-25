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
    '/track':         pageTrack
};

var TITLES = {
    '/':              'Copper Linux — Download the Copper Linux distro',
    '/daily-driving': 'Copper — Daily driving with Copper Linux',
    '/ingot':         'ingot — Copper Linux package manager & repo',
    '/tools':         'ingot — Copper Linux package manager & repo',
    '/downloads':     'Download Copper Linux — pre-release ISOs',
    '/contributions': 'Contribute to Copper Linux',
    '/contributors':  'Copper Linux team — maintainer & contributors',
    '/track':         'Track Copper Linux development'
};

var DESCRIPTIONS = {
    '/':              'Copper Linux is a small, fast, independent Linux distribution for daily use. Download Copper Linux pre-releases and explore ingot, its own package manager.',
    '/daily-driving': 'Copper is the daily driving edition of Copper Linux: a small, fast desktop distro for web, code, school and work, with ingot packages.',
    '/ingot':         'ingot is Copper Linux\'s own package manager. Browse 100+ packaged tools, apps, network utilities, libraries and fonts from copper-ingot-repo.',
    '/tools':         'ingot is Copper Linux\'s own package manager. Browse 100+ packaged tools, apps, network utilities, libraries and fonts from copper-ingot-repo.',
    '/downloads':     'Download Copper Linux pre-release ISOs from GitHub. Boot the latest Copper Linux live image in a VM or on real hardware.',
    '/contributions': 'Contribute to Copper Linux: report bugs, test pre-releases, write code or add packages to the ingot repository.',
    '/contributors':  'Copper Linux is built by one maintainer, 12hrformat, with a few contributors. Meet the team behind the distro.',
    '/track':         'Track recent commits from the copperlinux and copper-ingot-repo repositories on GitHub.'
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
    '/track':         'nav-track'
};

function setActiveNav(hash) {
    $('.navbar-nav > li').removeClass('active');
    if (NAV_IDS[hash]) $('#' + NAV_IDS[hash]).addClass('active');
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
        '#app .repo-card, #app .step, #app .team-card'
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
    var banner = document.getElementById('track-banner');
    if (!banner || banner.firstChild) return;
    banner.innerHTML = '<div class="alert-rate"><i class="fas fa-exclamation-triangle"></i> GitHub API rate limit reached — you can still check the commits on GitHub.</div>';
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

function page404() {
    return '<div class="container site-content">'
        + crumbs('404')
        + pageIntro('Nothing here', '404', 'That page does not exist. Maybe a typo, maybe an old link.')
        + '<div class="download-strip"><div><h3>Head back home</h3><p>Everything is one click away from the start.</p></div><a class="btn btn-primary-cl" href="#/">Return home</a></div>'
        + '</div>';
}
