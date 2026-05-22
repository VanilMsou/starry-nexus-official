const assetVersion = window.STARRY_NEXUS_SITE.version || window.STARRY_NEXUS_SITE.updatedAt || "";
const assetUrl = (url) => {
  if (!url || url === "#") return url;
  if (/^(https?:|mailto:|tel:|data:|blob:)/i.test(url)) return url;
  const [path, hash = ""] = url.split("#");
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${encodeURIComponent(assetVersion || "local")}${hash ? `#${hash}` : ""}`;
};
window.assetUrl = assetUrl;

const siteConfig = window.STARRY_NEXUS_SITE.site;
const normalizePagePath = (pathname) => pathname.replace(/\/index\.html$/i, "/");

const setChromeText = (selector, text) => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = text;
  });
};

const renderSiteChrome = () => {
  if (!siteConfig) return;
  const seoConfig = window.STARRY_NEXUS_SITE.seo || {};

  if (siteConfig.backgroundImage) {
    document.documentElement.style.setProperty("--site-bg-image", `url("${assetUrl(siteConfig.backgroundImage)}")`);
  }

  document.title = document.body.dataset.pageTitle
    ? `${document.body.dataset.pageTitle} | ${siteConfig.name}`
    : seoConfig.title || siteConfig.title;

  const setMeta = (selector, attr, value) => {
    const element = document.querySelector(selector);
    if (element && value) element.setAttribute(attr, value);
  };
  setMeta('meta[name="description"]', "content", seoConfig.description || siteConfig.description);
  setMeta('meta[property="og:title"]', "content", seoConfig.ogTitle || seoConfig.title || siteConfig.name);
  setMeta('meta[property="og:description"]', "content", seoConfig.ogDescription || seoConfig.description || siteConfig.description);
  if (seoConfig.ogImage) setMeta('meta[property="og:image"]', "content", assetUrl(seoConfig.ogImage));

  document.querySelectorAll("[data-brand-mark]").forEach((mark) => {
    mark.innerHTML = "";
    if (siteConfig.logoImage) {
      const image = document.createElement("img");
      image.src = assetUrl(siteConfig.logoImage);
      image.alt = `${siteConfig.name} Logo`;
      mark.append(image);
    } else {
      mark.textContent = siteConfig.logoText;
    }
  });
  setChromeText("[data-brand-name]", siteConfig.name);
  setChromeText("[data-site-name]", siteConfig.copyright || siteConfig.name);

  document.querySelectorAll("[data-site-nav]").forEach((nav) => {
    nav.innerHTML = "";
    nav.id = nav.id || "site-nav";
    siteConfig.nav.forEach((item) => {
      const link = document.createElement("a");
      const url = new URL(item.url, window.location.href);
      const isSamePage =
        url.origin === window.location.origin &&
        normalizePagePath(url.pathname) === normalizePagePath(window.location.pathname) &&
        url.hash;
      link.href = isSamePage ? url.hash : item.url;
      const hash = url.hash;
      if (hash) link.dataset.navTarget = hash.slice(1);
      link.textContent = item.label;
      nav.append(link);
    });
  });

  document.querySelectorAll("[data-top-link]").forEach((link) => {
    link.href = "#top";
    link.textContent = "回到顶部";
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
};

renderSiteChrome();

const mobileNavQuery = window.matchMedia("(max-width: 620px)");
const siteHeader = document.querySelector(".site-header");
const siteNav = document.querySelector("[data-site-nav]");
const siteNavToggle = document.querySelector(".site-nav-toggle");
const scheduleOnFrame = (callback) => {
  let frame = 0;
  return () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      callback();
    });
  };
};

const setMobileNavOpen = (open) => {
  if (!siteHeader || !siteNav || !siteNavToggle) return;
  const mobile = mobileNavQuery.matches;
  const expanded = mobile && open;
  siteHeader.classList.toggle("nav-open", expanded);
  document.body.classList.toggle("site-nav-open", expanded);
  siteNavToggle.setAttribute("aria-expanded", String(expanded));
  siteNavToggle.setAttribute("aria-label", expanded ? "关闭导航" : "打开导航");
  siteNav.setAttribute("aria-hidden", String(mobile && !expanded));
  siteNav.inert = mobile && !expanded;
};

if (siteNav && siteNavToggle) {
  const mobileNavStylesReady = getComputedStyle(siteNavToggle).getPropertyValue("--site-mobile-nav-ready").trim() === "1";
  if (!mobileNavStylesReady) {
    siteNavToggle.hidden = true;
  } else {
    siteNavToggle.hidden = false;
    siteNavToggle.addEventListener("click", () => {
      setMobileNavOpen(siteNavToggle.getAttribute("aria-expanded") !== "true");
    });
    siteNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMobileNavOpen(false);
    });
    document.addEventListener("click", (event) => {
      if (!mobileNavQuery.matches || siteHeader?.contains(event.target)) return;
      setMobileNavOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    });
    if (mobileNavQuery.addEventListener) mobileNavQuery.addEventListener("change", () => setMobileNavOpen(false));
    else mobileNavQuery.addListener(() => setMobileNavOpen(false));
    setMobileNavOpen(false);
  }
}

let activeNavId = "";
const updateActiveNav = () => {
  const links = [...document.querySelectorAll("[data-site-nav] a[data-nav-target]")];
  if (!links.length) return;
  const offset = Math.min(160, window.innerHeight * 0.28);
  let nextActiveId = links[0].dataset.navTarget;
  const nearPageBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  links.forEach((link) => {
    const section = document.getElementById(link.dataset.navTarget);
    if (section && section.getBoundingClientRect().top <= offset) nextActiveId = link.dataset.navTarget;
  });
  if (nearPageBottom) nextActiveId = links[links.length - 1].dataset.navTarget;
  const activeChanged = activeNavId !== nextActiveId;
  activeNavId = nextActiveId;
  links.forEach((link) => {
    const isActive = link.dataset.navTarget === activeNavId;
    link.classList.toggle("active", isActive);
    if (isActive && activeChanged && (!mobileNavQuery.matches || siteHeader?.classList.contains("nav-open"))) {
      link.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  });
};

const scheduleActiveNavUpdate = scheduleOnFrame(updateActiveNav);
window.addEventListener("scroll", scheduleActiveNavUpdate, { passive: true });
window.addEventListener("resize", scheduleActiveNavUpdate);
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-site-nav] a[data-nav-target]");
  if (!link) return;
  const section = document.getElementById(link.dataset.navTarget);
  if (!section) return;
  event.preventDefault();
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  history.pushState(null, "", `#${link.dataset.navTarget}`);
  window.setTimeout(scheduleActiveNavUpdate, 120);
});
updateActiveNav();

const revealSelector =
  "section:not(.hero), .stat-card, .release-card, .member-card, .poster-card, .gallery-item, .contact-card, .press-kit-card";

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  const observeReveal = (root = document) => {
    root.querySelectorAll(revealSelector).forEach((element, index) => {
      if (element.dataset.revealReady) return;
      element.dataset.revealReady = "true";
        element.style.setProperty("--reveal-delay", `${Math.min(index * 16, 120)}ms`);
      element.classList.add("reveal");
      observer.observe(element);
    });
  };

  observeReveal();
  window.observeReveal = observeReveal;
} else {
  document.querySelectorAll(revealSelector).forEach((element) => element.classList.add("is-visible"));
}
