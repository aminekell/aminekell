'use strict';

/**
 * AMINE KELLA — Manga-Inspired Developer Portfolio (Volume 01)
 * Pure vanilla ES6+ interaction engine: preloader, scroll reveals, chapter tracking,
 * ink canvas synthesis, HTTP visualizer, accessibility, and Easter eggs.
 */

const REDUCED_MOTION_QUERY = window.matchMedia('(prefers-reduced-motion: reduce)');
const appState = {
  scrollRevealObserver: null,
  inkCanvasController: null,
  updateChapterNav: null,
  updateScrollProgress: null,
};

/** @returns {boolean} True when user prefers reduced motion. */
const isReducedMotion = () => REDUCED_MOTION_QUERY.matches;

/** @returns {ScrollBehavior} Scroll behavior honoring reduced motion. */
const getScrollBehavior = () => (isReducedMotion() ? 'auto' : 'smooth');

/** @param {ParentNode} [root=document] @returns {NodeListOf<Element>} */
const getRevealTargets = (root = document) => root.querySelectorAll('.reveal, [data-reveal]');

/** @param {Iterable<Element>} elements */
const revealAll = (elements) => elements.forEach((el) => el.classList.add('revealed'));

/**
 * Reveal a hidden container that may carry inline `display:none`.
 * @param {HTMLElement | null} element
 * @param {string} [fallbackDisplay='block']
 */
function revealHiddenContainer(element, fallbackDisplay = 'block') {
  if (!element) return;
  element.style.display = '';
  if (window.getComputedStyle(element).display === 'none') {
    element.style.display = fallbackDisplay;
  }
  element.setAttribute('aria-hidden', 'false');
  element.classList.add('revealed');
  revealAll(getRevealTargets(element));
}

/**
 * Throttle high-frequency scroll/resize work to one call per animation frame.
 * @param {() => void} callback
 * @returns {() => void}
 */
function createRafScheduler(callback) {
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      callback();
    });
  };
}

/** @param {EventTarget | null} target @returns {boolean} */
function isEditableTarget(target) {
  return target instanceof Element &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
}

/** @returns {HTMLElement[]} Chapters currently visible in layout. */
function getVisibleChapters() {
  return Array.from(document.querySelectorAll('.chapter')).filter(
    (ch) => window.getComputedStyle(ch).display !== 'none'
  );
}

/**
 * Find the visible chapter index closest to or spanning a viewport Y ratio.
 * @param {HTMLElement[]} chapters
 * @param {number} viewportRatio
 * @returns {number}
 */
function findActiveChapterIndex(chapters, viewportRatio = 0.5) {
  const targetY = window.innerHeight * viewportRatio;
  const spanning = chapters.findIndex((ch) => {
    const rect = ch.getBoundingClientRect();
    return rect.top <= targetY && rect.bottom >= targetY;
  });
  if (spanning !== -1) return spanning;

  let closestIndex = 0;
  let minDistance = Infinity;
  chapters.forEach((ch, idx) => {
    const rect = ch.getBoundingClientRect();
    const dist = Math.min(Math.abs(rect.top - targetY), Math.abs(rect.bottom - targetY));
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = idx;
    }
  });
  return closestIndex;
}

/* ==========================================================================
   1. PRELOADER & SPLASH ENTRANCE
   ========================================================================== */

/** Trigger splash page entrance animations after preloader dismissal. */
function triggerEntranceAnimations() {
  const megaTitles = document.querySelectorAll('.title-mega');
  megaTitles.forEach((title, index) => {
    if (isReducedMotion() || index === 0) {
      title.classList.add('revealed');
    } else {
      setTimeout(() => title.classList.add('revealed'), index * 120);
    }
  });

  document.querySelector('.protagonist')?.classList.add('revealed');
  document.querySelector('.splash-hero')?.classList.add('revealed');
  document.querySelector('.speech-bubble--splash')?.classList.add('revealed');

  const splashSection = document.querySelector('.splash-page');
  if (splashSection) {
    getRevealTargets(splashSection).forEach((el) => {
      if (!el.classList.contains('title-mega')) el.classList.add('revealed');
    });
  }
}

/** Manage the ink-drop preloader lifecycle and trigger entrance animations. */
function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) {
    triggerEntranceAnimations();
    return;
  }

  let handled = false;
  let fallbackTimer = null;

  const dismiss = () => {
    if (handled) return;
    handled = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);

    if (isReducedMotion()) {
      preloader.remove();
      triggerEntranceAnimations();
      return;
    }

    setTimeout(() => {
      preloader.classList.add('preloader--hidden');
      setTimeout(() => {
        preloader.remove();
        triggerEntranceAnimations();
      }, 800);
    }, 1200);
  };

  if (document.readyState === 'complete') {
    dismiss();
    return;
  }

  window.addEventListener('load', dismiss, { once: true });
  // Guard against hung third-party resources blocking `load`.
  fallbackTimer = setTimeout(dismiss, 3500);
}

/* ==========================================================================
   2. SCROLL REVEAL ENGINE
   ========================================================================== */

/** Observe `.reveal` and `[data-reveal]` elements and reveal them on scroll entry. */
function initScrollEngine() {
  const targets = getRevealTargets();
  if (!targets.length) return;

  if (isReducedMotion() || typeof IntersectionObserver === 'undefined') {
    revealAll(targets);
    return;
  }

  const splashSection = document.querySelector('.splash-page');
  const hasPreloader = Boolean(document.getElementById('preloader'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = parseInt(entry.target.dataset.delay, 10) || 0;
        observer.unobserve(entry.target);
        if (delay > 0) {
          setTimeout(() => entry.target.classList.add('revealed'), delay);
        } else {
          entry.target.classList.add('revealed');
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
  );

  targets.forEach((el) => {
    // Splash targets are choreographed by triggerEntranceAnimations() once preloader lifts.
    if (hasPreloader && splashSection && splashSection.contains(el)) return;
    observer.observe(el);
  });

  appState.scrollRevealObserver = observer;
}

/* ==========================================================================
   3. CHAPTER NAVIGATION & DARK-CHAPTER TRACKING
   ========================================================================== */

/** Wire side navigation dots, smooth scroll links, and active chapter tracking. */
function initChapterNav() {
  const chapters = document.querySelectorAll('.chapter');
  const navDots = document.querySelectorAll('.nav-dot');
  const currentDisplay = document.getElementById('current-chapter');
  if (!chapters.length) return;

  const setActiveChapter = (chapterId) => {
    if (!chapterId) return;
    navDots.forEach((dot) => {
      const active = dot.dataset.chapter === chapterId;
      dot.classList.toggle('active', active);
      if (active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });

    if (currentDisplay) {
      if (chapterId === 'final') currentDisplay.textContent = 'END';
      else if (chapterId === 'secret') currentDisplay.textContent = 'CH.Ø';
      else currentDisplay.textContent = `CH.${chapterId}`;
    }

    document.body.classList.toggle(
      'dark-chapter',
      chapterId === '00' || chapterId === 'final' || chapterId === 'secret'
    );
  };

  navDots.forEach((dot) => {
    dot.addEventListener('click', (e) => {
      const targetChapter = dot.dataset.chapter;
      const target = document.getElementById(`chapter-${targetChapter}`);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: getScrollBehavior() });
      setActiveChapter(targetChapter);
    });

    dot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dot.click();
      }
    });
  });

  const scrollIndicator = document.querySelector('.scroll-indicator[href^="#"]');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', (e) => {
      const targetId = scrollIndicator.getAttribute('href')?.slice(1);
      const target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: getScrollBehavior() });
    });
  }

  const syncActiveChapter = () => {
    const visible = getVisibleChapters();
    if (!visible.length) return;
    const active = visible[findActiveChapterIndex(visible, 0.45)];
    if (active?.dataset.chapter) setActiveChapter(active.dataset.chapter);
  };

  appState.updateChapterNav = syncActiveChapter;

  if (typeof IntersectionObserver !== 'undefined') {
    // Viewport-center band handles chapters taller than the viewport reliably.
    const chapterObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) syncActiveChapter();
      },
      { threshold: 0, rootMargin: '-45% 0px -45% 0px' }
    );
    chapters.forEach((ch) => chapterObserver.observe(ch));
  }

  const handleScroll = createRafScheduler(syncActiveChapter);
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });
  syncActiveChapter();
}

/* ==========================================================================
   4. INK CANVAS EFFECT
   ========================================================================== */

/** Render interactive ink splatter blooms across the opening splash canvas. */
function initInkCanvas() {
  const canvas = document.getElementById('ink-canvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const splashPage = document.querySelector('.splash-page');
  let width = 0;
  let height = 0;
  let inkDrops = [];
  let animationId = null;
  let isSplashVisible = true;
  let lastPointerDropTime = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.offsetWidth || splashPage?.offsetWidth || window.innerWidth;
    height = canvas.offsetHeight || splashPage?.offsetHeight || window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createInkDrop(x, y) {
    return {
      x: x ?? Math.random() * width,
      y: y ?? Math.random() * height,
      radius: 0,
      maxRadius: 30 + Math.random() * 80,
      speed: 0.5 + Math.random() * 1.5,
      opacity: 0.03 + Math.random() * 0.08,
      color: Math.random() > 0.85 ? 'rgba(220, 20, 60, ' : 'rgba(10, 10, 10, ',
    };
  }

  function seedDrops() {
    inkDrops = Array.from({ length: 15 }, () => createInkDrop());
  }

  function draw() {
    if (isReducedMotion() || !isSplashVisible || document.hidden) {
      animationId = null;
      return;
    }

    // Fade prior ink gently back to transparent so underlying paper/dark hues stay clean.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.004)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    inkDrops.forEach((drop) => {
      if (drop.radius >= drop.maxRadius) return;
      drop.radius += drop.speed;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${drop.color}${drop.opacity})`;
      ctx.fill();

      if (drop.radius > drop.maxRadius * 0.3) {
        for (let j = 0; j < 3; j++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = drop.radius * (0.8 + Math.random() * 0.5);
          ctx.beginPath();
          ctx.arc(drop.x + Math.cos(angle) * dist, drop.y + Math.sin(angle) * dist, 1 + Math.random() * 3, 0, Math.PI * 2);
          ctx.fillStyle = `${drop.color}${drop.opacity * 0.5})`;
          ctx.fill();
        }
      }
    });

    if (Math.random() > 0.97 && inkDrops.length < 40) inkDrops.push(createInkDrop());
    inkDrops = inkDrops.filter((d) => d.radius < d.maxRadius);
    animationId = requestAnimationFrame(draw);
  }

  function start() {
    if (isReducedMotion() || animationId || !isSplashVisible || document.hidden) return;
    canvas.style.display = '';
    if (!inkDrops.length) seedDrops();
    draw();
  }

  function stop() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  appState.inkCanvasController = { start, stop };

  if (splashPage) {
    splashPage.addEventListener('mousemove', (e) => {
      if (isReducedMotion()) return;
      const now = performance.now();
      if (now - lastPointerDropTime < 35) return;
      lastPointerDropTime = now;

      const rect = canvas.getBoundingClientRect();
      if (inkDrops.length < 50) {
        inkDrops.push(createInkDrop(e.clientX - rect.left, e.clientY - rect.top));
      }
    });

    if (typeof IntersectionObserver !== 'undefined') {
      const splashObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          isSplashVisible = entry.isIntersecting;
          if (isSplashVisible) start();
          else stop();
        });
      });
      splashObserver.observe(splashPage);
    }
  }

  window.addEventListener('resize', createRafScheduler(resize), { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  resize();
  if (!isReducedMotion()) {
    seedDrops();
    start();
  }
}

/* ==========================================================================
   5. TECH ARSENAL INTERACTIONS
   ========================================================================== */

/** Wire accessible click feedback and 5-click secret panel unlock on `.tech-item`. */
function initTechItems() {
  const techItems = document.querySelectorAll('.tech-item');
  if (!techItems.length) return;

  techItems.forEach((item) => {
    let clickCount = 0;
    let flashTimer = null;

    if (!item.hasAttribute('tabindex')) item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    if (!item.hasAttribute('aria-label')) {
      const name = item.querySelector('.tech-item__name')?.textContent?.trim() || 'this technology';
      item.setAttribute('aria-label', `Learn more about ${name}`);
    }

    item.addEventListener('click', () => {
      clickCount++;

      if (!isReducedMotion()) {
        clearTimeout(flashTimer);
        item.style.transition = 'none';
        item.style.boxShadow =
          '0 0 30px var(--crimson-glow, rgba(220, 20, 60, 0.3)), inset 0 0 30px rgba(220, 20, 60, 0.12)';

        requestAnimationFrame(() => {
          item.style.transition = 'box-shadow 0.5s ease';
          flashTimer = setTimeout(() => {
            item.style.boxShadow = '';
            flashTimer = setTimeout(() => {
              item.style.transition = '';
            }, 500);
          }, 100);
        });
      }

      if (clickCount >= 5) {
        const easterEgg = document.getElementById('arsenal-easter-egg') || document.querySelector('.easter-egg');
        if (easterEgg && !easterEgg.classList.contains('revealed')) {
          revealHiddenContainer(easterEgg);
          easterEgg.scrollIntoView({ behavior: getScrollBehavior(), block: 'center' });
          appState.updateScrollProgress?.();
        }
        clickCount = 0;
      }
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });
}

/* ==========================================================================
   6. HTTP REQUEST VISUALIZER (CHAPTER 04)
   ========================================================================== */

/** Animate the 7-stage HTTP request pipeline and scroll-tracked request orb. */
function initHTTPVisualizer() {
  const steps = document.querySelectorAll('.http-step');
  const connectors = document.querySelectorAll('.http-connector');
  const orb = document.getElementById('http-orb') || document.querySelector('.http-orb');
  if (!steps.length) return;

  const activateUpToStep = (stepNum) => {
    steps.forEach((s) => {
      if (parseInt(s.dataset.step, 10) <= stepNum) s.classList.add('active');
    });
    connectors.forEach((conn, idx) => {
      if (idx < stepNum - 1) conn.classList.add('active');
    });
  };

  if (isReducedMotion() || typeof IntersectionObserver === 'undefined') {
    activateUpToStep(steps.length);
  } else {
    const stepObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const stepNum = parseInt(entry.target.dataset.step, 10);
          if (!Number.isNaN(stepNum)) activateUpToStep(stepNum);
        });
      },
      { threshold: 0.35, rootMargin: '0px 0px -15% 0px' }
    );
    steps.forEach((step) => stepObserver.observe(step));
  }

  const chapter04 = document.getElementById('chapter-04');
  const journey = document.querySelector('.http-journey') || chapter04;
  if (!orb || !chapter04 || !journey) return;

  const updateOrbPosition = () => {
    if (isReducedMotion()) {
      orb.style.display = 'none';
      return;
    }

    const rect = chapter04.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.top >= vh || rect.bottom <= 0) {
      orb.style.display = 'none';
      return;
    }

    orb.style.display = 'block';
    orb.style.left = '50%';
    orb.style.transform = 'translateX(-50%)';

    if (window.getComputedStyle(orb).position === 'fixed') {
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / (rect.height + vh)));
      const orbY = rect.top + rect.height * progress;
      orb.style.top = `${Math.max(0, Math.min(vh - 20, orbY))}px`;
    } else {
      const journeyRect = journey.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (vh * 0.5 - journeyRect.top) / Math.max(1, journeyRect.height)));
      const maxTop = Math.max(0, journeyRect.height - orb.offsetHeight);
      orb.style.top = `${Math.round(maxTop * progress)}px`;
    }
  };

  const handleOrbScroll = createRafScheduler(updateOrbPosition);
  window.addEventListener('scroll', handleOrbScroll, { passive: true });
  window.addEventListener('resize', handleOrbScroll, { passive: true });
  updateOrbPosition();
}

/* ==========================================================================
   7. EASTER EGGS
   ========================================================================== */

/** Initialize Konami secret chapter, closing triple-click, and protagonist hover egg. */
function initEasterEggs() {
  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIdx = 0;

  document.addEventListener('keydown', (e) => {
    if (isEditableTarget(e.target)) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === konami[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === konami.length) {
        const secret = document.getElementById('secret-chapter');
        if (secret) {
          revealHiddenContainer(secret);
          if (!isReducedMotion()) secret.style.animation = 'glitch 0.5s ease';
          secret.scrollIntoView({ behavior: getScrollBehavior() });
          appState.updateChapterNav?.();
          appState.updateScrollProgress?.();
        }
        konamiIdx = 0;
      }
    } else {
      konamiIdx = key === konami[0] ? 1 : 0;
    }
  });

  const closingTitle = document.querySelector('.closing-title, .closing-page__mega');
  if (closingTitle) {
    let clickCount = 0;
    let clickTimer = null;

    closingTitle.addEventListener('click', () => {
      if (closingTitle.dataset.eggUnlocked === 'true') return;
      clickCount++;
      clearTimeout(clickTimer);

      if (clickCount >= 3) {
        closingTitle.dataset.eggUnlocked = 'true';
        const msg = document.createElement('div');
        msg.className = 'speech-bubble speech-bubble--crimson reveal revealed';
        msg.style.marginTop = '2rem';
        msg.setAttribute('role', 'status');
        msg.textContent = "You looked deeper. That's what makes a great engineer.";
        closingTitle.parentNode?.insertBefore(msg, closingTitle.nextSibling);
        clickCount = 0;
        return;
      }

      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 500);
    });
  }

  const protagonist = document.querySelector('.protagonist');
  if (protagonist?.parentElement) {
    let hoverCount = 0;
    let bubbleVisible = false;

    protagonist.addEventListener('mouseenter', () => {
      if (bubbleVisible) return;
      if (++hoverCount < 10) return;

      bubbleVisible = true;
      hoverCount = 0;
      if (!isReducedMotion()) {
        protagonist.style.filter = 'drop-shadow(0 0 60px rgba(220, 20, 60, 0.6))';
      }

      const parent = protagonist.parentElement;
      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }

      const bubble = document.createElement('div');
      bubble.className = 'speech-bubble';
      bubble.style.cssText =
        'position:absolute;bottom:110%;left:50%;transform:translateX(-50%);z-index:10;white-space:nowrap;';
      bubble.setAttribute('role', 'status');
      bubble.textContent = "Curious, aren't you?";
      parent.appendChild(bubble);

      setTimeout(() => {
        bubble.remove();
        protagonist.style.filter = '';
        bubbleVisible = false;
      }, 3000);
    });
  }
}

/* ==========================================================================
   8. KEYBOARD NAVIGATION
   ========================================================================== */

/** Navigate between visible chapters via Arrow keys, PageUp/Down, Home, and End. */
function initKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isEditableTarget(e.target)) return;
    const chapters = getVisibleChapters();
    if (!chapters.length) return;

    const currentIndex = findActiveChapterIndex(chapters, 0.5);
    const behavior = getScrollBehavior();

    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      if (currentIndex < chapters.length - 1) {
        e.preventDefault();
        chapters[currentIndex + 1].scrollIntoView({ behavior });
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (currentIndex > 0) {
        e.preventDefault();
        chapters[currentIndex - 1].scrollIntoView({ behavior });
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      chapters[0].scrollIntoView({ behavior });
    } else if (e.key === 'End') {
      e.preventDefault();
      chapters[chapters.length - 1].scrollIntoView({ behavior });
    }
  });
}

/* ==========================================================================
   9. REDUCED MOTION SUPPORT
   ========================================================================== */

/** Enforce static accessible presentation when `prefers-reduced-motion: reduce` matches. */
function initReducedMotion() {
  const applyState = (matches) => {
    const canvas = document.getElementById('ink-canvas');
    if (matches) {
      appState.inkCanvasController?.stop();
      if (canvas) canvas.style.display = 'none';

      document.getElementById('preloader')?.remove();
      appState.scrollRevealObserver?.disconnect();
      revealAll(getRevealTargets());
      triggerEntranceAnimations();

      document.querySelectorAll('.http-step, .http-connector').forEach((el) => el.classList.add('active'));
      const orb = document.getElementById('http-orb') || document.querySelector('.http-orb');
      if (orb) orb.style.display = 'none';

      document.querySelectorAll('.chapter-title-page').forEach((t) => t.classList.add('chapter-title--visible'));
      document.querySelectorAll('[data-parallax]').forEach((el) => {
        el.style.transform = '';
      });
    } else {
      if (canvas) canvas.style.display = '';
      appState.inkCanvasController?.start();
    }
  };

  applyState(REDUCED_MOTION_QUERY.matches);
  REDUCED_MOTION_QUERY.addEventListener('change', (mq) => applyState(mq.matches));
}

/* ==========================================================================
   10. PARALLAX, PANEL FOCUS, BORDER DRAW & SCROLL PROGRESS
   ========================================================================== */

/** Apply subtle scroll-linked parallax to `[data-parallax]` elements. */
function initParallax() {
  const elements = document.querySelectorAll('[data-parallax]');
  if (!elements.length) return;

  const update = createRafScheduler(() => {
    if (isReducedMotion()) return;
    const vh = window.innerHeight;
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        const speed = parseFloat(el.dataset.parallax) || 0.1;
        el.style.transform = `translateY(${(rect.top - vh / 2) * speed}px)`;
      }
    });
  });

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
}

/** Highlight hovered manga panels while dimming revealed siblings in pointer environments. */
function initPanelEffects() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  const grids = document.querySelectorAll('.panel-grid');
  if (!grids.length) return;

  grids.forEach((grid) => {
    const panels = grid.querySelectorAll('.panel, .manga-panel, .tech-item');
    if (panels.length < 2) return;

    let gridLeaveTimer = null;

    const resetPanels = () => {
      panels.forEach((p) => {
        p.style.opacity = '';
        p.style.transform = '';
        p.style.zIndex = '';
      });
    };

    panels.forEach((panel) => {
      panel.addEventListener('mouseenter', () => {
        if (isReducedMotion()) return;
        clearTimeout(gridLeaveTimer);
        panels.forEach((sibling) => {
          sibling.style.transition = 'opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease';
          if (sibling === panel) return;
          const isControlled = sibling.hasAttribute('data-reveal') || sibling.classList.contains('reveal');
          if (!isControlled || sibling.classList.contains('revealed')) {
            sibling.style.opacity = '0.7';
          }
        });
        panel.style.transform = 'scale(1.02)';
        panel.style.zIndex = '5';
      });

      panel.addEventListener('mouseleave', resetPanels);
    });

    grid.addEventListener('mouseleave', () => {
      resetPanels();
      clearTimeout(gridLeaveTimer);
      gridLeaveTimer = setTimeout(() => {
        panels.forEach((p) => {
          p.style.transition = '';
        });
      }, 320);
    });
  });
}

/** Draw chapter title page accents as each chapter enters the viewport. */
function initBorderDraw() {
  const titles = document.querySelectorAll('.chapter-title-page');
  if (!titles.length) return;

  if (isReducedMotion() || typeof IntersectionObserver === 'undefined') {
    titles.forEach((t) => t.classList.add('chapter-title--visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('chapter-title--visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );

  titles.forEach((title) => observer.observe(title));
}

/** Render and update a thin crimson scroll-progress indicator at the top of the viewport. */
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('role', 'presentation');
  bar.setAttribute('aria-hidden', 'true');
  bar.style.cssText =
    'position:fixed;top:0;left:0;height:3px;background:var(--crimson,#DC143C);z-index:10001;transition:width 0.1s linear;width:0%;pointer-events:none;';
  document.body.appendChild(bar);

  const update = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.max(0, Math.min(100, (scrollTop / docHeight) * 100)) : 0;
    bar.style.width = `${progress}%`;
  };

  appState.updateScrollProgress = update;
  const handleScroll = createRafScheduler(update);
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });
  update();
}

/* ==========================================================================
   11. INITIALIZATION
   ========================================================================== */

function initPortfolio() {
  initPreloader();
  initScrollEngine();
  initChapterNav();
  initInkCanvas();
  initTechItems();
  initHTTPVisualizer();
  initEasterEggs();
  initKeyboardNav();
  initReducedMotion();
  initParallax();
  initPanelEffects();
  initBorderDraw();
  initScrollProgress();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPortfolio, { once: true });
} else {
  initPortfolio();
}

function initMangaDepthScenes() {
  document.querySelectorAll('[data-depth-panel]').forEach((panel) => {
    const status = panel.querySelector('[data-depth-status]');
    const choices = panel.querySelector('[data-request-choices]');
    const trace = panel.querySelector('[data-depth-action="trace"]');
    const company = panel.querySelector('.depth-cutaway .depth-plane:nth-child(3)');

    panel.querySelectorAll('[hidden]:not([data-request-choices])').forEach((control) => {
      control.hidden = false;
    });

    panel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-depth-action]');
      if (!button) return;

      switch (button.dataset.depthAction) {
        case 'container': {
          const stopped = panel.classList.toggle('is-stopped');
          button.textContent = stopped ? 'Start WordPress' : 'Stop WordPress';
          status.textContent = stopped
            ? 'WordPress stopped. Dynamic pages are unavailable, but the site files are still on the persistent volume.'
            : 'WordPress is running. It can read the existing site files from the same volume.';
          break;
        }
        case 'ray': {
          const projected = panel.classList.toggle('is-projected');
          button.textContent = projected ? 'Show floor plan' : 'Show first-person projection';
          status.textContent = projected
            ? 'First-person view. A nearer wall fills more of the view. The red line marks the same center ray.'
            : 'Map view. The red ray marks the distance to the first wall.';
          break;
        }
        case 'trace':
          panel.classList.remove('is-open');
          // Commit the reset so replay restarts the packet animation.
          panel.querySelector('.depth-signal').getBoundingClientRect();
          panel.classList.add('is-open');
          choices.hidden = false;
          company.textContent = 'Company service';
          trace.textContent = 'Replay save request';
          status.textContent = '503. The logo upload failed. What should the interface publish?';
          break;
        case 'partial':
          company.textContent = 'Company name published';
          status.textContent = 'The new name is published with the old logo. The interface offers to retry the upload.';
          break;
        case 'draft':
          company.textContent = 'Company edits held as draft';
          status.textContent = 'Nothing new is published. Both edits stay in the draft so the user can retry together.';
          break;
      }
    });
  });
}

initMangaDepthScenes();
