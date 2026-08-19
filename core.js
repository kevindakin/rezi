// GLOBAL VARIABLES
const durationBase = 0.8;
const durationSlow = 1.2;
const durationFast = 0.4;
const easeBase = "power4.inOut";

// GENERAL

function lenisScroll() {
  const lenis = new Lenis({
    lerp: 0.12,
  });

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });
}

function disableScroll() {
  document.body.classList.add("no-scroll");
}

function enableScroll() {
  document.body.classList.remove("no-scroll");
}

function isMenuOpen() {
  const menu = document.querySelector(".nav_wrap");
  return menu && menu.getAttribute("aria-hidden") === "false";
}

function navScroll() {
  const navComponent = document.querySelector('[data-menu="wrap"]');
  if (!navComponent) return;

  const root = document.documentElement;

  // Resolve any CSS length (rem/px/etc.) to pixels via the browser.
  const resolveLength = (value) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;height:${value};`;
    document.body.appendChild(probe);
    const px = probe.getBoundingClientRect().height;
    probe.remove();
    return px;
  };

  // Nav-aware sticky bars (most pages have none).
  const stickyBars = document.querySelectorAll('[data-sticky-offset="nav"]');
  const hasBars = stickyBars.length > 0;

  const navHeight = hasBars
    ? resolveLength(
        getComputedStyle(root).getPropertyValue("--nav-height").trim()
      )
    : 0;

  root.classList.add("nav-shown");

  let navHidden = false;
  let activeTween = null;
  let barTween = null;

  ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      if (isMenuOpen()) {
        if (activeTween) activeTween.kill();
        if (barTween) barTween.kill();
        gsap.set(navComponent, { y: "0%" });
        if (hasBars) gsap.set(stickyBars, { top: navHeight });
        root.classList.add("nav-shown");
        navHidden = false;
        return;
      }

      const scrollDistance = self.scroll();
      const navRect = navComponent.getBoundingClientRect();
      const threshold = navRect.height;
      const scrollingUp = self.direction === -1;

      if (scrollDistance === 0) navComponent.classList.remove("is-scrolled");

      if (!scrollingUp && !navHidden && scrollDistance > threshold) {
        if (activeTween) activeTween.kill();
        if (barTween) barTween.kill();
        navHidden = true;
        root.classList.remove("nav-shown");

        activeTween = gsap.to(navComponent, {
          y: "-100%",
          duration: durationSlow,
          ease: easeBase,
          onComplete: () => {
            navComponent.classList.add("is-scrolled");
            activeTween = null;
          },
        });

        if (hasBars) {
          barTween = gsap.to(stickyBars, {
            top: 0,
            duration: durationSlow,
            ease: easeBase,
            onComplete: () => {
              barTween = null;
            },
          });
        }
      } else if (scrollingUp && navHidden) {
        if (activeTween) activeTween.kill();
        if (barTween) barTween.kill();
        navHidden = false;
        root.classList.add("nav-shown");

        activeTween = gsap.to(navComponent, {
          y: "0%",
          duration: durationSlow,
          ease: easeBase,
          onComplete: () => {
            activeTween = null;
          },
        });

        if (hasBars) {
          barTween = gsap.to(stickyBars, {
            top: navHeight,
            duration: durationSlow,
            ease: easeBase,
            onComplete: () => {
              barTween = null;
            },
          });
        }
      }
    },
  });
}

function stickyBars() {
  const mq = window.matchMedia("(min-width: 992px)");
  if (!mq.matches) return;

  document.querySelectorAll('[data-sticky-offset="nav"]').forEach((bar) => {
    if (bar.dataset.stickyInitialized) return;
    bar.dataset.stickyInitialized = "true";

    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "height:0;width:100%;pointer-events:none;";
    bar.parentNode.insertBefore(sentinel, bar);

    // Resolve --nav-height to px (rem-safe), same as navScroll.
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--nav-height")
      .trim();
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;height:${raw};`;
    document.body.appendChild(probe);
    const navHeight = probe.getBoundingClientRect().height || 0;
    probe.remove();

    const io = new IntersectionObserver(
      ([entry]) => bar.classList.toggle("is-sticky", !entry.isIntersecting),
      { rootMargin: `-${navHeight + 1}px 0px 0px 0px`, threshold: 0 }
    );
    io.observe(sentinel);
  });
}

function navDropdown() {
  const nav = document.querySelector('[data-menu="wrap"]');
  if (!nav) return;

  const items = nav.querySelectorAll('[data-dropdown="wrap"]');
  if (!items.length) return;

  items.forEach((item) => {
    const link = item.querySelector('[data-dropdown="trigger"]');
    const menu = item.querySelector('[data-dropdown="menu"]');

    if (!link || !menu) return;

    const arrow = link.querySelector(".nav_dropdown_arrow");
    const dropdownItems = menu.querySelectorAll('[data-dropdown="item"]');

    let timeout;
    let isOpen = false;

    // Desktop timeline
    const desktopOpen = gsap.timeline({
      paused: true,
      defaults: { duration: 0.5, ease: "power4.out" },
    });

    desktopOpen
      .to(menu, { autoAlpha: 1, y: "0rem" })
      .fromTo(
        dropdownItems,
        { opacity: 0, y: "1rem" },
        { opacity: 1, y: "0rem", stagger: 0.1 },
        "<0.1"
      );

    const openMenu = () => {
      clearTimeout(timeout);
      isOpen = true;
      menu.style.display = "flex";
      arrow?.classList.add("is-open");

      const dropdownWrap = menu.closest(".dropdown_wrap");
      if (dropdownWrap) {
        dropdownWrap.style.left = "";
        dropdownWrap.style.right = "";
      }

      requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const padding = 16;

        if (rect.right > viewportWidth - padding) {
          const overflow = rect.right - (viewportWidth - padding);
          if (dropdownWrap) {
            const currentLeft =
              parseFloat(getComputedStyle(dropdownWrap).left) || 0;
            dropdownWrap.style.left = `${currentLeft - overflow}px`;
          }
        }

        desktopOpen.play();
      });
    };

    const closeMenu = () => {
      isOpen = false;
      desktopOpen.pause(0);
      gsap.set(menu, { autoAlpha: 0, display: "none" });
      gsap.set(dropdownItems, { opacity: 0, y: "1rem" });
      arrow?.classList.remove("is-open");
    };

    item.addEventListener("mouseenter", () => {
      if (window.innerWidth >= 992) openMenu();
    });

    menu.addEventListener("mouseenter", () => {
      if (window.innerWidth >= 992) openMenu();
    });

    item.addEventListener("mouseleave", () => {
      if (window.innerWidth >= 992) {
        timeout = setTimeout(closeMenu, 50);
      }
    });

    // Mobile click
    link.addEventListener("click", (event) => {
      if (window.innerWidth >= 992) return;
      event.preventDefault();

      if (isOpen) {
        isOpen = false;
        gsap.set(menu, { display: "none", visibility: "hidden", opacity: 0 });
        arrow?.classList.remove("is-open");
      } else {
        isOpen = true;
        gsap.set(menu, { display: "flex", visibility: "visible", opacity: 0 });
        gsap.to(menu, { opacity: 1, duration: 0.4, ease: "power4.out" });
        gsap.fromTo(
          dropdownItems,
          { opacity: 0, y: "1rem" },
          {
            opacity: 1,
            y: "0rem",
            stagger: 0.1,
            duration: 0.5,
            ease: "power4.out",
            delay: 0.15,
          }
        );
        arrow?.classList.add("is-open");
      }
    });
  });
}

function copyright() {
  const copyrightDate = document.querySelector(
    '[data-element="copyright-date"]'
  );

  if (copyrightDate) {
    const currentYear = new Date().getFullYear();
    copyrightDate.textContent = currentYear;
  }
}

const initPlausibleEvents = () => {
  if (window.reziCtaTrackingInitialized) return;
  window.reziCtaTrackingInitialized = true;

  // Most specific first — first match wins.
  const sources = [
    { selector: "[data-rich-component]", name: null },         // injected library CTAs
    { selector: ".upload_drop_wrap",     name: "cta-upload" }, // upload zone elsewhere
    { selector: ".blog_post_cta",        name: "sidebar-cta" },
    { selector: ".card_cta_wrap",        name: "cta" },
    { selector: ".footer_cta_wrap",      name: "footer-cta" },
    { selector: ".nav_wrap",             name: "nav" }
  ];

  const resolve = (el) => {
    if (!el || !el.closest) return null;

    for (const source of sources) {
      const wrap = el.closest(source.selector);
      if (!wrap) continue;

      // Ignore the hidden library sources.
      if (wrap.closest('[data-rich-components="components"]')) return null;

      return {
        element: wrap,
        name: source.name || wrap.getAttribute("data-rich-component") || "unknown"
      };
    }

    return null;
  };

  const send = (hit, action) => {
    if (!hit || typeof window.plausible !== "function") return;

    const context = hit.element.closest('[data-rich-components="rich"], [data-toc="rich"]')
      ? "in-article"
      : "page";

    window.plausible("CTA Click", {
      props: { cta: hit.name, action: action, context: context }
    });
  };

  document.addEventListener("click", (e) => {
    if (!e.target.closest) return;

    const card = e.target.closest(".upload_drop_card");
    if (card) {
      send(resolve(card), "upload-open");
      return;
    }

    const link = e.target.closest('a[href*="app.rezi.ai/signup"]');
    if (link) send(resolve(link), "signup");
  });

  document.addEventListener("change", (e) => {
    if (!e.target.matches || !e.target.matches('input[type="file"]')) return;
    if (!e.target.files || !e.target.files.length) return;
    send(resolve(e.target), "upload-file");
  });
};

// MOBILE MENU

function mobileMenu() {
  const nav = document.querySelector('[data-menu="wrap"]');
  const menu = nav.querySelector(".nav_content");
  const button = nav.querySelector(".nav_button");
  const links = menu.querySelectorAll('[data-menu="item"]');

  const lineTop = button.children[0];
  const lineBottom = button.children[1];

  gsap.set(links, { y: "2rem", opacity: 0 });

  let isAnimating = false;
  let isMenuOpen = false;
  let dropdownsInitialized = false;

  let menuOpen = gsap.timeline({
    paused: true,
    defaults: { duration: 0.7, ease: "power4.out" },
    onStart: () => {
      isAnimating = true;
      gsap.set(menu, { display: "flex" });
      nav.classList.add("is-open");
      disableScroll();
      if (!dropdownsInitialized) {
        navDropdown();
        dropdownsInitialized = true;
      }
    },
    onComplete: () => {
      isAnimating = false;
    },
  });

  let menuClose = gsap.timeline({
    paused: true,
    defaults: { duration: 0.7, ease: "power4.out" },
    onStart: () => {
      isAnimating = true;
      enableScroll();
    },
    onComplete: () => {
      gsap.set(menu, { display: "none" });
      nav.classList.remove("is-open");
      isAnimating = false;
    },
  });

  menuOpen
    .to(lineTop, { y: 3.75, rotate: -45, duration: 0.4 }, 0)
    .to(lineBottom, { y: -3.75, rotate: 45, duration: 0.4 }, 0)
    .to(menu, { opacity: 1 }, 0)
    .to(links, { y: "0rem", opacity: 1, stagger: 0.06 }, 0.05);

  menuClose
    .to(links, { y: "0rem", opacity: 0 }, 0)
    .to(menu, { opacity: 0 }, 0)
    .to(lineTop, { y: 0, rotate: 0, duration: 0.4 }, 0)
    .to(lineBottom, { y: 0, rotate: 0, duration: 0.4 }, 0);

  button.addEventListener("click", () => {
    if (isAnimating) return;
    if (!isMenuOpen) {
      menuOpen.restart();
      isMenuOpen = true;
    } else {
      menuClose.restart();
      isMenuOpen = false;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMenuOpen && !isAnimating) {
      menuClose.restart();
      isMenuOpen = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  lenisScroll();
  navScroll();
  stickyBars();
  navDropdown();
  copyright();
  initPlausibleEvents();

  gsap.matchMedia().add("(max-width: 991px)", () => {
    mobileMenu();
  });
});