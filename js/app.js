/**
 * NextGenAI — Static Portfolio Controller (Vanilla ES6, Zero Frameworks)
 * - Strictly XSS-safe rendering (createElement + textContent + URL sanitization)
 * - No inline event handlers (compatible with strict CSP)
 * - Optional Firestore REST read when NEXTGENAI_FIREBASE.enabled === true,
 *   always falling back cleanly to window.SITE_DATA (js/site-data.js)
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var THEME_KEY = 'nextgenai_theme';

  var state = {
    data: null,
    activeCategory: 'All',
    searchQuery: '',
    modalProject: null,
    lastFocusedEl: null,
    toastTimer: null,
  };

  /* ------------------------------------------------------------------------
   * Security & Formatting Utilities
   * ---------------------------------------------------------------------- */
  function isPlaceholder(value) {
    if (typeof value !== 'string') return true;
    var trimmed = value.trim();
    if (!trimmed) return true;
    return /^YOUR_[A-Z0-9_]+$/i.test(trimmed);
  }

  function hasVisibleValue(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function sanitizeUrl(url, allowRelative) {
    if (typeof url !== 'string') return '';
    var trimmed = url.trim();
    if (!trimmed || isPlaceholder(trimmed)) return '';
    if (allowRelative && (trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('/'))) {
      return trimmed;
    }
    try {
      var parsed = new URL(trimmed, window.location.origin);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.href;
      }
    } catch (err) {
      return '';
    }
    return '';
  }

  function digitsOnly(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[^0-9]/g, '');
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  /* ------------------------------------------------------------------------
   * Inline SVG Icon Factory (Zero External Icon Library Needed)
   * ---------------------------------------------------------------------- */
  function createSvg(paths, viewBox) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', viewBox || '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    paths.forEach(function (spec) {
      var shape = document.createElementNS(SVG_NS, spec.tag || 'path');
      Object.keys(spec).forEach(function (k) {
        if (k !== 'tag') shape.setAttribute(k, spec[k]);
      });
      svg.appendChild(shape);
    });
    return svg;
  }

  var ICONS = {
    sun: function () {
      return createSvg([
        { tag: 'circle', cx: '12', cy: '12', r: '4' },
        { d: 'M12 2v2' },
        { d: 'M12 20v2' },
        { d: 'm4.93 4.93 1.41 1.41' },
        { d: 'm17.66 17.66 1.41 1.41' },
        { d: 'M2 12h2' },
        { d: 'M20 12h2' },
        { d: 'm6.34 17.66-1.41 1.41' },
        { d: 'm19.07 4.93-1.41 1.41' },
      ]);
    },
    moon: function () {
      return createSvg([{ d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]);
    },
    external: function () {
      return createSvg([
        { d: 'M15 3h6v6' },
        { d: 'M10 14 21 3' },
        { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' },
      ]);
    },
    info: function () {
      return createSvg([
        { tag: 'circle', cx: '12', cy: '12', r: '10' },
        { d: 'M12 16v-4' },
        { d: 'M12 8h.01' },
      ]);
    },
    code: function () {
      return createSvg([
        { d: 'm18 16 4-4-4-4' },
        { d: 'm6 8-4 4 4 4' },
        { d: 'm14.5 4-5 16' },
      ]);
    },
    web: function () {
      return createSvg([
        { tag: 'rect', x: '3', y: '4', width: '18', height: '16', rx: '2' },
        { d: 'M3 10h18' },
        { d: 'M8 7h.01' },
        { d: 'M11 7h.01' },
      ]);
    },
    systems: function () {
      return createSvg([
        { tag: 'rect', x: '3', y: '3', width: '7', height: '7', rx: '1.5' },
        { tag: 'rect', x: '14', y: '3', width: '7', height: '7', rx: '1.5' },
        { tag: 'rect', x: '14', y: '14', width: '7', height: '7', rx: '1.5' },
        { tag: 'rect', x: '3', y: '14', width: '7', height: '7', rx: '1.5' },
      ]);
    },
    pwa: function () {
      return createSvg([
        { tag: 'rect', x: '5', y: '2', width: '14', height: '20', rx: '2' },
        { d: 'M12 18h.01' },
      ]);
    },
    ai: function () {
      return createSvg([
        { d: 'M12 3v3' },
        { d: 'M12 18v3' },
        { d: 'M3 12h3' },
        { d: 'M18 12h3' },
        { d: 'm5.6 5.6 2.1 2.1' },
        { d: 'm16.3 16.3 2.1 2.1' },
        { d: 'm18.4 5.6-2.1 2.1' },
        { d: 'm7.7 16.3-2.1 2.1' },
        { tag: 'circle', cx: '12', cy: '12', r: '3' },
      ]);
    },
    mail: function () {
      return createSvg([
        { tag: 'rect', x: '2', y: '4', width: '20', height: '16', rx: '2' },
        { d: 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' },
      ]);
    },
    phone: function () {
      return createSvg([
        {
          d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
        },
      ]);
    },
    whatsapp: function () {
      return createSvg([
        {
          d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
        },
      ]);
    },
    copy: function () {
      return createSvg([
        { tag: 'rect', x: '9', y: '9', width: '13', height: '13', rx: '2' },
        { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' },
      ]);
    },
    github: function () {
      return createSvg([
        {
          d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4',
        },
        { d: 'M9 18c-4.51 2-5-2-7-2' },
      ]);
    },
    linkedin: function () {
      return createSvg([
        {
          d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z',
        },
        { tag: 'rect', x: '2', y: '9', width: '4', height: '12' },
        { tag: 'circle', cx: '4', cy: '4', r: '2' },
      ]);
    },
    facebook: function () {
      return createSvg([
        { d: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
      ]);
    },
    youtube: function () {
      return createSvg([
        {
          d: 'M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17',
        },
        { tag: 'polygon', points: '10 15 15 12 10 9 10 15' },
      ]);
    },
    x: function () {
      return createSvg([
        { d: 'M4 4l16 16' },
        { d: 'M20 4 4 20' },
      ]);
    },
    layers: function () {
      return createSvg([
        { d: 'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z' },
        { d: 'm22 12.5-8.97 4.08a2 2 0 0 1-1.66 0L2 12.5' },
        { d: 'm22 17.5-8.97 4.08a2 2 0 0 1-1.66 0L2 17.5' },
      ]);
    },
  };

  /* ------------------------------------------------------------------------
   * Toast Notification
   * ---------------------------------------------------------------------- */
  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    if (state.toastTimer) window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  /* ------------------------------------------------------------------------
   * Brand Logo Renderer with Safe Fallback Chain (WebP -> JPG -> DataURI -> Text)
   * ---------------------------------------------------------------------- */
  function renderLogoInto(container, sizeKey, brand) {
    if (!container || !brand || !brand.logos) return;
    container.textContent = '';

    var variant = brand.logos[sizeKey] || brand.logos[256] || brand.logos[128];
    var fallbackUri = brand.logos.fallbackDataUri || '';
    var picture = document.createElement('picture');

    if (variant && variant.webp) {
      var srcWebp = document.createElement('source');
      srcWebp.setAttribute('srcset', variant.webp);
      srcWebp.setAttribute('type', 'image/webp');
      picture.appendChild(srcWebp);
    }

    var img = document.createElement('img');
    img.src = (variant && variant.jpg) || fallbackUri;
    img.alt = (brand.name || 'NextGenAI') + ' logo';
    img.width = Number(sizeKey) || 128;
    img.height = Number(sizeKey) || 128;
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';

    var fallbackStage = 0;
    img.addEventListener('error', function () {
      if (fallbackStage === 0 && fallbackUri && img.src !== fallbackUri) {
        fallbackStage = 1;
        var sourceEl = picture.querySelector('source');
        if (sourceEl) sourceEl.remove();
        img.src = fallbackUri;
      } else {
        container.textContent = '';
        container.appendChild(el('span', 'logo-text-fallback', brand.name || 'NextGenAI'));
      }
    });

    picture.appendChild(img);
    container.appendChild(picture);
  }

  /* ------------------------------------------------------------------------
   * Theme Switcher
   * ---------------------------------------------------------------------- */
  function updateThemeToggleUI() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var isDark = current === 'dark';
    btn.textContent = '';
    btn.appendChild(isDark ? ICONS.sun() : ICONS.moon());
    btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.setAttribute('aria-pressed', String(!isDark));
    btn.setAttribute('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');

    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0B1020' : '#F8FAFC');
    }
  }

  function initThemeToggle() {
    updateThemeToggleUI();
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch (err) {
        // Ignore private browsing or storage errors
      }
      updateThemeToggleUI();
    });
  }

  /* ------------------------------------------------------------------------
   * Mobile Navigation & Active Section Scroll Spy
   * ---------------------------------------------------------------------- */
  function initNavigation() {
    var toggleBtn = document.getElementById('menu-toggle');
    var mobileNav = document.getElementById('mobile-nav');
    if (!toggleBtn || !mobileNav) return;

    function closeMenu() {
      mobileNav.classList.remove('is-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }

    toggleBtn.addEventListener('click', function () {
      var isOpen = mobileNav.classList.toggle('is-open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
    });

    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) {
        closeMenu();
        toggleBtn.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (
        mobileNav.classList.contains('is-open') &&
        !mobileNav.contains(e.target) &&
        !toggleBtn.contains(e.target)
      ) {
        closeMenu();
      }
    });

    // Active nav highlight via IntersectionObserver
    var sections = document.querySelectorAll('main section[id]');
    var allNavLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

    if ('IntersectionObserver' in window && sections.length > 0) {
      var spy = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var id = entry.target.getAttribute('id');
              allNavLinks.forEach(function (link) {
                var active = link.getAttribute('href') === '#' + id;
                link.classList.toggle('is-active', active);
              });
            }
          });
        },
        { rootMargin: '-35% 0px -55% 0px', threshold: 0.01 }
      );

      sections.forEach(function (sec) {
        spy.observe(sec);
      });
    }
  }

  /* ------------------------------------------------------------------------
   * Render Hero, About, Stats & Skills
   * ---------------------------------------------------------------------- */
  function renderBrandAndHero(data) {
    var brand = data.brand || {};
    var brandName = brand.name || 'NextGenAI';

    document.querySelectorAll('[data-brand-name]').forEach(function (node) {
      node.textContent = brandName;
    });

    renderLogoInto(document.getElementById('nav-logo'), 128, brand);
    renderLogoInto(document.getElementById('hero-logo'), 256, brand);
    renderLogoInto(document.getElementById('footer-logo'), 128, brand);

    var taglineEl = document.getElementById('hero-tagline');
    if (taglineEl && brand.tagline) taglineEl.textContent = brand.tagline;

    var markCaptionEl = document.getElementById('hero-mark-caption');
    if (markCaptionEl && brand.tagline) markCaptionEl.textContent = brand.tagline;

    var headlineEl = document.getElementById('hero-headline');
    if (headlineEl && brand.heroHeadline) {
      headlineEl.textContent = '';
      var phrase = brand.heroHeadline;
      var splitIdx = phrase.indexOf('what’s next');
      if (splitIdx !== -1) {
        headlineEl.appendChild(document.createTextNode(phrase.slice(0, splitIdx)));
        headlineEl.appendChild(el('span', 'hero-headline-accent', phrase.slice(splitIdx)));
      } else {
        headlineEl.textContent = phrase;
      }
    }

    var subtitleEl = document.getElementById('hero-subtitle');
    if (subtitleEl && brand.heroSubtitle) subtitleEl.textContent = brand.heroSubtitle;

    var trustRow = document.getElementById('hero-trust-row');
    if (trustRow && Array.isArray(brand.trustChips)) {
      trustRow.textContent = '';
      brand.trustChips.forEach(function (chip, idx) {
        if (!hasVisibleValue(chip)) return;
        var span = el('span', 'hero-trust-item');
        span.appendChild(document.createTextNode(chip));
        if (idx < brand.trustChips.length - 1) {
          var sep = el('span', 'hero-trust-sep', '·');
          sep.setAttribute('aria-hidden', 'true');
          span.appendChild(sep);
        }
        trustRow.appendChild(span);
      });
    }

    var footerBlurb = document.getElementById('footer-blurb');
    if (footerBlurb && brand.footerBlurb) footerBlurb.textContent = brand.footerBlurb;

    var footerNote = document.getElementById('footer-note');
    if (footerNote && brand.footerNote) footerNote.textContent = brand.footerNote;

    var yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  function renderAbout(data) {
    var about = data.about || {};
    var eyebrow = document.getElementById('about-eyebrow');
    var heading = document.getElementById('about-heading');
    var copyContainer = document.getElementById('about-copy');

    if (eyebrow && about.eyebrow) eyebrow.textContent = about.eyebrow;
    if (heading && about.heading) heading.textContent = about.heading;

    if (copyContainer) {
      copyContainer.textContent = '';
      (about.paragraphs || []).forEach(function (para) {
        if (hasVisibleValue(para)) {
          copyContainer.appendChild(el('p', '', para));
        }
      });
      if (hasVisibleValue(about.founderBio)) {
        copyContainer.appendChild(el('div', 'about-founder-note', about.founderBio));
      }
    }

    // Stats counters
    var statsGrid = document.getElementById('stats-grid');
    if (statsGrid && Array.isArray(data.stats)) {
      statsGrid.textContent = '';
      data.stats.forEach(function (stat) {
        var card = el('div', 'glass-card stat-card');
        var val = el('span', 'stat-value', String(stat.value) + (stat.suffix || ''));
        val.setAttribute('data-count-target', String(Number(stat.value) || 0));
        val.setAttribute('data-count-suffix', stat.suffix || '');
        var lbl = el('span', 'stat-label', stat.label || '');
        card.appendChild(val);
        card.appendChild(lbl);
        statsGrid.appendChild(card);
      });
    }

    // Skills stack
    var skillsList = document.getElementById('skills-list');
    if (skillsList && Array.isArray(data.skills)) {
      skillsList.textContent = '';
      var validSkills = data.skills.filter(hasVisibleValue);
      validSkills.forEach(function (skill, idx) {
        var li = el('li', 'skill-item');
        li.appendChild(document.createTextNode(skill));
        if (idx < validSkills.length - 1) {
          var sep = el('span', 'skill-sep', '/');
          sep.setAttribute('aria-hidden', 'true');
          li.appendChild(sep);
        }
        skillsList.appendChild(li);
      });
    }
  }

  /* ------------------------------------------------------------------------
   * Count-up Animation & Scroll Reveal
   * ---------------------------------------------------------------------- */
  function animateCounter(node) {
    var target = Number(node.getAttribute('data-count-target')) || 0;
    var suffix = node.getAttribute('data-count-suffix') || '';
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || target <= 0) {
      node.textContent = String(target) + suffix;
      return;
    }

    var duration = 900;
    var start = null;
    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(eased * target);
      node.textContent = String(current) + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }
    window.requestAnimationFrame(step);
  }

  function initRevealAndCounters() {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var revealEls = document.querySelectorAll('[data-reveal]');

    if (reduced || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (node) {
        node.classList.add('is-revealed');
      });
      return;
    }

    var revealObs = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    revealEls.forEach(function (node) {
      revealObs.observe(node);
    });

    var statsSection = document.getElementById('stats-grid');
    if (statsSection) {
      var statsAnimated = false;
      var statsObs = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !statsAnimated) {
              statsAnimated = true;
              statsSection.querySelectorAll('[data-count-target]').forEach(animateCounter);
              observer.disconnect();
            }
          });
        },
        { threshold: 0.25 }
      );
      statsObs.observe(statsSection);
    }
  }

  /* ------------------------------------------------------------------------
   * Projects Grid, Filter, Search & Details Modal
   * ---------------------------------------------------------------------- */
  function buildProjectPlaceholder(title) {
    var box = el('div', 'project-placeholder');
    box.appendChild(ICONS.layers());
    box.appendChild(el('span', 'project-placeholder-title', title || 'NextGenAI Project'));
    return box;
  }

  function buildProjectMedia(project) {
    var wrap = el('div', 'project-media');
    var imgSrc = sanitizeUrl(project.image || '', true);
    var fallbackSrc = sanitizeUrl(project.imageFallback || '', true);

    if (!imgSrc && !fallbackSrc) {
      wrap.appendChild(buildProjectPlaceholder(project.title));
      return wrap;
    }

    var picture = document.createElement('picture');
    if (imgSrc && imgSrc.toLowerCase().endsWith('.webp')) {
      var srcEl = document.createElement('source');
      srcEl.setAttribute('srcset', imgSrc);
      srcEl.setAttribute('type', 'image/webp');
      picture.appendChild(srcEl);
    }

    var img = document.createElement('img');
    img.src = fallbackSrc || imgSrc;
    img.alt = (project.title || 'Project') + ' interface preview';
    img.width = 960;
    img.height = 540;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';

    img.addEventListener('error', function () {
      wrap.textContent = '';
      wrap.appendChild(buildProjectPlaceholder(project.title));
    });

    picture.appendChild(img);
    wrap.appendChild(picture);
    return wrap;
  }

  function getStatusClass(status) {
    var normalized = String(status || '').toLowerCase();
    if (normalized === 'live') return 'project-status project-status--live';
    if (normalized === 'beta') return 'project-status project-status--beta';
    return 'project-status project-status--soon';
  }

  function matchesCategory(project, category) {
    if (category === 'All') return true;
    var catLower = category.toLowerCase();
    if (String(project.category || '').toLowerCase() === catLower) return true;
    var tags = Array.isArray(project.tags) ? project.tags : [];
    return tags.some(function (t) {
      var tl = String(t).toLowerCase();
      if (catLower === 'pwas') return tl === 'pwa' || tl === 'pwas';
      return tl === catLower;
    });
  }

  function renderProjects() {
    var grid = document.getElementById('projects-grid');
    var countEl = document.getElementById('projects-count');
    if (!grid || !state.data) return;

    var allProjects = Array.isArray(state.data.projects) ? state.data.projects : [];
    var query = state.searchQuery.trim().toLowerCase();

    var filtered = allProjects.filter(function (project) {
      if (!matchesCategory(project, state.activeCategory)) return false;
      if (!query) return true;
      var haystack = [
        project.title,
        project.shortDescription,
        project.longDescription,
        project.category,
        project.status,
        Array.isArray(project.tags) ? project.tags.join(' ') : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(query) !== -1;
    });

    if (countEl) {
      countEl.textContent =
        'Showing ' +
        filtered.length +
        ' of ' +
        allProjects.length +
        (allProjects.length === 1 ? ' project' : ' projects');
    }

    grid.textContent = '';

    if (filtered.length === 0) {
      var empty = el(
        'div',
        'projects-empty',
        'No projects match your current filter or search. Try clearing the search box or switching to “All”.'
      );
      grid.appendChild(empty);
      return;
    }

    filtered.forEach(function (project) {
      var card = el('article', 'glass-card glass-card--interactive project-card');
      card.appendChild(buildProjectMedia(project));

      var body = el('div', 'project-body');

      // Quiet unboxed metadata kicker (Featured · Status · Category)
      var kicker = el('div', 'project-kicker');
      var kickerParts = [];
      if (project.featured) {
        kickerParts.push(el('span', 'project-featured-label', 'Featured'));
      }
      if (hasVisibleValue(project.status)) {
        kickerParts.push(el('span', getStatusClass(project.status), project.status));
      }
      if (hasVisibleValue(project.category)) {
        kickerParts.push(el('span', '', project.category));
      }
      kickerParts.forEach(function (node, idx) {
        kicker.appendChild(node);
        if (idx < kickerParts.length - 1) {
          var sep = el('span', '', '·');
          sep.setAttribute('aria-hidden', 'true');
          kicker.appendChild(sep);
        }
      });
      body.appendChild(kicker);

      body.appendChild(el('h3', 'project-title', project.title || 'Untitled Project'));
      body.appendChild(el('p', 'project-desc', project.shortDescription || ''));

      // Tags rendered as clean typographic metadata
      if (Array.isArray(project.tags) && project.tags.length > 0) {
        var tagsWrap = el('div', 'project-tags');
        var cleanTags = project.tags.filter(hasVisibleValue);
        cleanTags.forEach(function (tag, idx) {
          tagsWrap.appendChild(el('span', '', tag));
          if (idx < cleanTags.length - 1) {
            var sep = el('span', '', '·');
            sep.setAttribute('aria-hidden', 'true');
            tagsWrap.appendChild(sep);
          }
        });
        body.appendChild(tagsWrap);
      }

      // Action buttons (automatically hide missing liveUrl / githubUrl)
      var actions = el('div', 'project-actions');
      var safeLive = sanitizeUrl(project.liveUrl || '', true);
      var hasLivePlaceholder = isPlaceholder(project.liveUrl || '') && hasVisibleValue(project.liveUrl || '');

      if (safeLive) {
        var openLink = el('a', 'btn btn--primary btn--sm');
        openLink.href = safeLive;
        openLink.target = '_blank';
        openLink.rel = 'noopener noreferrer';
        openLink.appendChild(document.createTextNode('Open App'));
        openLink.appendChild(ICONS.external());
        actions.appendChild(openLink);
      } else if (hasLivePlaceholder) {
        var placeholderBtn = el('button', 'btn btn--primary btn--sm');
        placeholderBtn.type = 'button';
        placeholderBtn.appendChild(document.createTextNode('Open App'));
        placeholderBtn.appendChild(ICONS.external());
        placeholderBtn.addEventListener('click', function () {
          showToast('Set liveUrl in js/site-data.js to link “' + project.title + '”.');
        });
        actions.appendChild(placeholderBtn);
      }

      var detailsBtn = el('button', 'btn btn--secondary btn--sm');
      detailsBtn.type = 'button';
      detailsBtn.appendChild(ICONS.info());
      detailsBtn.appendChild(document.createTextNode('Details'));
      detailsBtn.addEventListener('click', function () {
        openProjectModal(project);
      });
      actions.appendChild(detailsBtn);

      body.appendChild(actions);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function initProjectControls() {
    var filterGroup = document.getElementById('project-filters');
    if (filterGroup) {
      filterGroup.querySelectorAll('.filter-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cat = btn.getAttribute('data-category') || 'All';
          state.activeCategory = cat;
          filterGroup.querySelectorAll('.filter-btn').forEach(function (b) {
            var active = b === btn;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-pressed', String(active));
          });
          renderProjects();
        });
      });
    }

    var searchInput = document.getElementById('project-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.searchQuery = searchInput.value;
        renderProjects();
      });
    }
  }

  /* ------------------------------------------------------------------------
   * Accessible Project Details Modal
   * ---------------------------------------------------------------------- */
  function openProjectModal(project) {
    var backdrop = document.getElementById('project-modal');
    var titleEl = document.getElementById('modal-title');
    var metaEl = document.getElementById('modal-meta');
    var bodyEl = document.getElementById('modal-body');
    if (!backdrop || !titleEl || !bodyEl) return;

    state.modalProject = project;
    state.lastFocusedEl = document.activeElement;

    titleEl.textContent = project.title || 'Project Details';
    if (metaEl) {
      var parts = [];
      if (project.featured) parts.push('Featured');
      if (hasVisibleValue(project.status)) parts.push(project.status);
      if (hasVisibleValue(project.category)) parts.push(project.category);
      metaEl.textContent = parts.join(' · ');
    }

    bodyEl.textContent = '';

    // Gallery / preview stage
    var galleryItems = [];
    if (Array.isArray(project.gallery) && project.gallery.length > 0) {
      project.gallery.forEach(function (item) {
        var s = sanitizeUrl(item.src || '', true);
        var f = sanitizeUrl(item.fallback || '', true);
        if (s || f) galleryItems.push({ src: s || f, fallback: f || s, caption: item.caption || '' });
      });
    } else {
      var primaryImg = sanitizeUrl(project.image || '', true);
      var primaryFallback = sanitizeUrl(project.imageFallback || '', true);
      if (primaryImg || primaryFallback) {
        galleryItems.push({
          src: primaryImg || primaryFallback,
          fallback: primaryFallback || primaryImg,
          caption: project.shortDescription || '',
        });
      }
    }

    var galleryContainer = el('div');
    var stage = el('div', 'modal-gallery-stage');
    var captionEl = el('p', 'modal-gallery-caption');

    function renderStage(idx) {
      stage.textContent = '';
      if (galleryItems.length === 0) {
        stage.appendChild(buildProjectPlaceholder(project.title));
        captionEl.textContent = '';
        return;
      }
      var item = galleryItems[idx] || galleryItems[0];
      var img = document.createElement('img');
      img.src = item.src;
      img.alt = (project.title || 'Project') + ' screenshot ' + (idx + 1);
      img.width = 960;
      img.height = 540;
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', function () {
        if (item.fallback && img.src !== item.fallback) {
          img.src = item.fallback;
        } else {
          stage.textContent = '';
          stage.appendChild(buildProjectPlaceholder(project.title));
        }
      });
      stage.appendChild(img);
      captionEl.textContent = item.caption || '';
    }

    renderStage(0);
    galleryContainer.appendChild(stage);
    if (galleryItems.length > 0) galleryContainer.appendChild(captionEl);

    if (galleryItems.length > 1) {
      var thumbs = el('div', 'modal-gallery-thumbs');
      galleryItems.forEach(function (item, idx) {
        var tBtn = el('button', idx === 0 ? 'gallery-thumb-btn is-active' : 'gallery-thumb-btn');
        tBtn.type = 'button';
        tBtn.setAttribute('aria-label', 'Show screenshot ' + (idx + 1));
        var tImg = document.createElement('img');
        tImg.src = item.src;
        tImg.alt = '';
        tImg.width = 72;
        tImg.height = 44;
        tBtn.appendChild(tImg);
        tBtn.addEventListener('click', function () {
          thumbs.querySelectorAll('.gallery-thumb-btn').forEach(function (b) {
            b.classList.remove('is-active');
          });
          tBtn.classList.add('is-active');
          renderStage(idx);
        });
        thumbs.appendChild(tBtn);
      });
      galleryContainer.appendChild(thumbs);
    }

    bodyEl.appendChild(galleryContainer);

    // Long description
    var descText = hasVisibleValue(project.longDescription)
      ? project.longDescription
      : project.shortDescription || '';
    if (descText) {
      bodyEl.appendChild(el('p', 'modal-description', descText));
    }

    // Key highlights
    if (Array.isArray(project.highlights) && project.highlights.length > 0) {
      var list = el('ul', 'modal-highlights');
      project.highlights.filter(hasVisibleValue).forEach(function (pt) {
        list.appendChild(el('li', '', pt));
      });
      bodyEl.appendChild(list);
    }

    // Tags
    if (Array.isArray(project.tags) && project.tags.length > 0) {
      var tagsRow = el('div', 'project-tags');
      var validTags = project.tags.filter(hasVisibleValue);
      validTags.forEach(function (tag, idx) {
        tagsRow.appendChild(el('span', '', tag));
        if (idx < validTags.length - 1) {
          var sep = el('span', '', '·');
          sep.setAttribute('aria-hidden', 'true');
          tagsRow.appendChild(sep);
        }
      });
      bodyEl.appendChild(tagsRow);
    }

    // Modal Footer Links
    var footer = el('div', 'modal-footer');
    var safeLive = sanitizeUrl(project.liveUrl || '', true);
    var safeGithub = sanitizeUrl(project.githubUrl || '', false);

    if (safeLive) {
      var liveA = el('a', 'btn btn--primary btn--sm');
      liveA.href = safeLive;
      liveA.target = '_blank';
      liveA.rel = 'noopener noreferrer';
      liveA.appendChild(document.createTextNode('Open App'));
      liveA.appendChild(ICONS.external());
      footer.appendChild(liveA);
    }

    if (safeGithub) {
      var ghA = el('a', 'btn btn--secondary btn--sm');
      ghA.href = safeGithub;
      ghA.target = '_blank';
      ghA.rel = 'noopener noreferrer';
      ghA.appendChild(ICONS.github());
      ghA.appendChild(document.createTextNode('Source Code'));
      footer.appendChild(ghA);
    }

    var closeAction = el('button', 'btn btn--ghost btn--sm', 'Close');
    closeAction.type = 'button';
    closeAction.addEventListener('click', closeProjectModal);
    footer.appendChild(closeAction);

    bodyEl.appendChild(footer);

    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    var closeBtn = document.getElementById('modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeProjectModal() {
    var backdrop = document.getElementById('project-modal');
    if (!backdrop) return;
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (state.lastFocusedEl && typeof state.lastFocusedEl.focus === 'function') {
      state.lastFocusedEl.focus();
    }
  }

  function initModalEvents() {
    var backdrop = document.getElementById('project-modal');
    var closeBtn = document.getElementById('modal-close');
    if (!backdrop) return;

    if (closeBtn) closeBtn.addEventListener('click', closeProjectModal);

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeProjectModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && backdrop.classList.contains('is-open')) {
        closeProjectModal();
      }
    });
  }

  /* ------------------------------------------------------------------------
   * Services Section
   * ---------------------------------------------------------------------- */
  function renderServices(data) {
    var grid = document.getElementById('services-grid');
    if (!grid || !Array.isArray(data.services)) return;
    grid.textContent = '';

    data.services.forEach(function (service, idx) {
      var card = el('article', 'glass-card glass-card--interactive service-card');
      var top = el('div', 'service-top');

      var iconBox = el('div', 'service-icon');
      var iconFactory = ICONS[service.icon] || ICONS.code;
      iconBox.appendChild(iconFactory());

      var numText = service.number || String(idx + 1).padStart(2, '0');
      var num = el('span', 'service-num', numText);

      top.appendChild(iconBox);
      top.appendChild(num);

      card.appendChild(top);
      card.appendChild(el('h3', 'service-title', service.title || ''));
      card.appendChild(el('p', 'service-desc', service.description || ''));

      grid.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------------
   * Contact Section, Copy-to-Clipboard, Social Links & Mailto Form
   * ---------------------------------------------------------------------- */
  function copyText(text, label) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          showToast(label + ' copied to clipboard.');
        })
        .catch(function () {
          fallbackCopy(text, label);
        });
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    var temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    try {
      document.execCommand('copy');
      showToast(label + ' copied to clipboard.');
    } catch (err) {
      showToast('Unable to copy automatically — please select and copy manually.');
    }
    document.body.removeChild(temp);
  }

  function buildSocialButtons(socials, container) {
    if (!container) return 0;
    container.textContent = '';
    if (!socials || typeof socials !== 'object') return 0;

    var defs = [
      { key: 'github', label: 'GitHub', icon: ICONS.github },
      { key: 'linkedin', label: 'LinkedIn', icon: ICONS.linkedin },
      { key: 'facebook', label: 'Facebook', icon: ICONS.facebook },
      { key: 'youtube', label: 'YouTube', icon: ICONS.youtube },
      { key: 'x', label: 'X', icon: ICONS.x },
    ];

    var count = 0;
    defs.forEach(function (def) {
      var raw = socials[def.key];
      if (!hasVisibleValue(raw)) return;

      var safe = sanitizeUrl(raw, false);
      if (safe) {
        var link = el('a', 'social-btn');
        link.href = safe;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', def.label);
        link.appendChild(def.icon());
        link.appendChild(document.createTextNode(def.label));
        container.appendChild(link);
        count++;
      } else if (isPlaceholder(raw)) {
        var btn = el('button', 'social-btn');
        btn.type = 'button';
        btn.setAttribute('aria-label', def.label + ' (configure link in site-data.js)');
        btn.appendChild(def.icon());
        btn.appendChild(document.createTextNode(def.label));
        btn.addEventListener('click', function () {
          showToast('Replace ' + def.label + ' URL inside js/site-data.js.');
        });
        container.appendChild(btn);
        count++;
      }
    });
    return count;
  }

  function renderContact(data) {
    var contact = data.contact || {};
    var list = document.getElementById('contact-list');
    var actions = document.getElementById('contact-quick-actions');
    var availEl = document.getElementById('contact-availability');

    if (availEl && hasVisibleValue(contact.availability)) {
      availEl.textContent = contact.availability;
    }

    if (list) {
      list.textContent = '';

      if (hasVisibleValue(contact.email)) {
        var emailRow = el('div', 'contact-row');
        var emailInfo = el('div', 'contact-row-info');
        emailInfo.appendChild(el('span', 'contact-row-label', 'Email'));
        emailInfo.appendChild(el('span', 'contact-row-value', contact.email));
        var copyEmailBtn = el('button', 'btn btn--ghost btn--sm');
        copyEmailBtn.type = 'button';
        copyEmailBtn.setAttribute('aria-label', 'Copy email address');
        copyEmailBtn.appendChild(ICONS.copy());
        copyEmailBtn.appendChild(document.createTextNode('Copy'));
        copyEmailBtn.addEventListener('click', function () {
          copyText(contact.email, 'Email');
        });
        emailRow.appendChild(emailInfo);
        emailRow.appendChild(copyEmailBtn);
        list.appendChild(emailRow);
      }

      if (hasVisibleValue(contact.phone)) {
        var phoneRow = el('div', 'contact-row');
        var phoneInfo = el('div', 'contact-row-info');
        phoneInfo.appendChild(el('span', 'contact-row-label', 'Phone'));
        phoneInfo.appendChild(el('span', 'contact-row-value', contact.phone));
        var copyPhoneBtn = el('button', 'btn btn--ghost btn--sm');
        copyPhoneBtn.type = 'button';
        copyPhoneBtn.setAttribute('aria-label', 'Copy phone number');
        copyPhoneBtn.appendChild(ICONS.copy());
        copyPhoneBtn.appendChild(document.createTextNode('Copy'));
        copyPhoneBtn.addEventListener('click', function () {
          copyText(contact.phone, 'Phone number');
        });
        phoneRow.appendChild(phoneInfo);
        phoneRow.appendChild(copyPhoneBtn);
        list.appendChild(phoneRow);
      }

      if (hasVisibleValue(contact.whatsapp)) {
        var waRow = el('div', 'contact-row');
        var waInfo = el('div', 'contact-row-info');
        waInfo.appendChild(el('span', 'contact-row-label', 'WhatsApp'));
        waInfo.appendChild(el('span', 'contact-row-value', contact.whatsapp));
        waRow.appendChild(waInfo);
        list.appendChild(waRow);
      }

      if (hasVisibleValue(contact.location)) {
        var locRow = el('div', 'contact-row');
        var locInfo = el('div', 'contact-row-info');
        locInfo.appendChild(el('span', 'contact-row-label', 'Location'));
        locInfo.appendChild(el('span', 'contact-row-value', contact.location));
        locRow.appendChild(locInfo);
        list.appendChild(locRow);
      }
    }

    if (actions) {
      actions.textContent = '';

      if (hasVisibleValue(contact.email)) {
        var mailBtn = el('a', 'btn btn--primary btn--sm');
        mailBtn.href = 'mailto:' + encodeURIComponent(contact.email.trim());
        mailBtn.appendChild(ICONS.mail());
        mailBtn.appendChild(document.createTextNode('Send Email'));
        if (isPlaceholder(contact.email)) {
          mailBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showToast('Replace YOUR_EMAIL_HERE in js/site-data.js with your email.');
          });
        }
        actions.appendChild(mailBtn);
      }

      if (hasVisibleValue(contact.whatsapp)) {
        var waDigits = digitsOnly(contact.whatsapp);
        var waBtn = el('a', 'btn btn--secondary btn--sm');
        waBtn.href = waDigits ? 'https://wa.me/' + waDigits : '#contact';
        waBtn.target = '_blank';
        waBtn.rel = 'noopener noreferrer';
        waBtn.appendChild(ICONS.whatsapp());
        waBtn.appendChild(document.createTextNode('Chat on WhatsApp'));
        if (!waDigits) {
          waBtn.removeAttribute('target');
          waBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showToast('Replace YOUR_WHATSAPP_NUMBER_HERE in js/site-data.js with digits (country code + number).');
          });
        }
        actions.appendChild(waBtn);
      }

      if (hasVisibleValue(contact.phone)) {
        var phoneDigits = contact.phone.replace(/[^0-9+]/g, '');
        var callBtn = el('a', 'btn btn--secondary btn--sm');
        callBtn.href = phoneDigits ? 'tel:' + phoneDigits : '#contact';
        callBtn.appendChild(ICONS.phone());
        callBtn.appendChild(document.createTextNode('Call'));
        if (!phoneDigits) {
          callBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showToast('Replace YOUR_PHONE_HERE in js/site-data.js with your phone number.');
          });
        }
        actions.appendChild(callBtn);
      }
    }

    // Social links in Contact and Footer
    var contactSocialBlock = document.getElementById('contact-social-block');
    var contactSocials = document.getElementById('contact-socials');
    var countContact = buildSocialButtons(contact.socials, contactSocials);
    if (contactSocialBlock) {
      contactSocialBlock.style.display = countContact > 0 ? '' : 'none';
    }

    var footerSocials = document.getElementById('footer-socials');
    buildSocialButtons(contact.socials, footerSocials);
  }

  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var nameInput = document.getElementById('contact-name');
    var emailInput = document.getElementById('contact-email');
    var subjectInput = document.getElementById('contact-subject');
    var messageInput = document.getElementById('contact-message');
    var honeypotInput = document.getElementById('contact-website');

    var errName = document.getElementById('err-name');
    var errEmail = document.getElementById('err-email');
    var errSubject = document.getElementById('err-subject');
    var errMessage = document.getElementById('err-message');

    function clearErrors() {
      [errName, errEmail, errSubject, errMessage].forEach(function (node) {
        if (node) node.textContent = '';
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();

      // Honeypot check (silent drop for bots)
      if (honeypotInput && honeypotInput.value.trim() !== '') {
        form.reset();
        showToast('Message prepared.');
        return;
      }

      var name = nameInput ? nameInput.value.trim() : '';
      var email = emailInput ? emailInput.value.trim() : '';
      var subject = subjectInput ? subjectInput.value.trim() : '';
      var message = messageInput ? messageInput.value.trim() : '';

      var valid = true;
      if (name.length < 2) {
        if (errName) errName.textContent = 'Please enter your name.';
        valid = false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (errEmail) errEmail.textContent = 'Please enter a valid email address.';
        valid = false;
      }
      if (subject.length < 3) {
        if (errSubject) errSubject.textContent = 'Please add a short subject.';
        valid = false;
      }
      if (message.length < 10) {
        if (errMessage) errMessage.textContent = 'Please write at least 10 characters.';
        valid = false;
      }

      if (!valid) return;

      var targetEmail = (state.data && state.data.contact && state.data.contact.email) || '';
      if (!hasVisibleValue(targetEmail) || isPlaceholder(targetEmail)) {
        showToast('Replace YOUR_EMAIL_HERE in js/site-data.js so the form opens your email address.');
        return;
      }

      var bodyText =
        'Name: ' +
        name +
        '\nEmail: ' +
        email +
        '\n\nMessage:\n' +
        message;

      var mailtoUrl =
        'mailto:' +
        encodeURIComponent(targetEmail.trim()) +
        '?subject=' +
        encodeURIComponent('[NextGenAI Inquiry] ' + subject) +
        '&body=' +
        encodeURIComponent(bodyText);

      showToast('Opening your email app with your drafted message…');
      window.location.href = mailtoUrl;
    });
  }

  /* ------------------------------------------------------------------------
   * Optional Firestore Spark Public Reader (OFF by default, static fallback)
   * ---------------------------------------------------------------------- */
  function decodeFirestoreValue(v) {
    if (!v || typeof v !== 'object') return null;
    if ('stringValue' in v) return v.stringValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('nullValue' in v) return null;
    if ('arrayValue' in v) {
      var vals = (v.arrayValue && v.arrayValue.values) || [];
      return vals.map(decodeFirestoreValue);
    }
    if ('mapValue' in v) {
      var out = {};
      var fields = (v.mapValue && v.mapValue.fields) || {};
      Object.keys(fields).forEach(function (k) {
        out[k] = decodeFirestoreValue(fields[k]);
      });
      return out;
    }
    return null;
  }

  function mergeRemoteData(baseData, remote) {
    if (!remote || typeof remote !== 'object') return baseData;
    var merged = Object.assign({}, baseData);
    if (Array.isArray(remote.projects) && remote.projects.length > 0) {
      merged.projects = remote.projects;
    }
    if (remote.contact && typeof remote.contact === 'object') {
      merged.contact = Object.assign({}, baseData.contact, remote.contact, {
        socials: Object.assign(
          {},
          (baseData.contact && baseData.contact.socials) || {},
          remote.contact.socials || {}
        ),
      });
    }
    if (remote.about && typeof remote.about === 'object') {
      merged.about = Object.assign({}, baseData.about, remote.about);
    }
    return merged;
  }

  function tryLoadRemoteFirestore(baseData) {
    var fb = window.NEXTGENAI_FIREBASE;
    if (
      !fb ||
      fb.enabled !== true ||
      !fb.config ||
      isPlaceholder(fb.config.projectId) ||
      isPlaceholder(fb.config.apiKey)
    ) {
      return Promise.resolve(baseData);
    }

    var url =
      'https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(fb.config.projectId) +
      '/databases/(default)/documents/' +
      encodeURIComponent(fb.collection || 'site_content') +
      '/' +
      encodeURIComponent(fb.documentId || 'main') +
      '?key=' +
      encodeURIComponent(fb.config.apiKey);

    return window
      .fetch(url, { method: 'GET', cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Firestore status ' + res.status);
        return res.json();
      })
      .then(function (doc) {
        if (!doc || !doc.fields) return baseData;
        var decoded = {};
        Object.keys(doc.fields).forEach(function (k) {
          decoded[k] = decodeFirestoreValue(doc.fields[k]);
        });
        return mergeRemoteData(baseData, decoded);
      })
      .catch(function () {
        // Offline or unavailable: silently keep static js/site-data.js content
        return baseData;
      });
  }

  /* ------------------------------------------------------------------------
   * Offline-Friendly Service Worker Registration (Relative path for GH Pages)
   * ---------------------------------------------------------------------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw-site.js').catch(function () {
        // Ignore registration errors in restricted preview frames
      });
    });
  }

  /* ------------------------------------------------------------------------
   * Bootstrap Application
   * ---------------------------------------------------------------------- */
  function renderAll(data) {
    state.data = data;
    renderBrandAndHero(data);
    renderAbout(data);
    renderProjects();
    renderServices(data);
    renderContact(data);
  }

  function init() {
    document.documentElement.classList.add('js-enabled');
    var staticData = window.SITE_DATA || {};

    initThemeToggle();
    initNavigation();
    initProjectControls();
    initModalEvents();
    initContactForm();

    // Render static site-data.js immediately (zero-latency first paint)
    renderAll(staticData);
    initRevealAndCounters();
    registerServiceWorker();

    // If optional Firebase Spark mode is enabled, hydrate silently with fallback
    tryLoadRemoteFirestore(staticData).then(function (resolvedData) {
      if (resolvedData !== staticData) {
        renderAll(resolvedData);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
