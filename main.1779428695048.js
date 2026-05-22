const config = window.STARRY_NEXUS_SITE;
const getAssetUrl = window.assetUrl || ((url) => url);
const prepareImage = (image, eager = false) => {
  image.decoding = "async";
  image.loading = eager ? "eager" : "lazy";
  if (eager) image.fetchPriority = "high";
};

const createLink = ({ label, url }, className = "text-link") => {
  const link = document.createElement("a");
  link.className = className;
  link.textContent = label;
  link.href = url || "#";
  if (url && url !== "#") {
    link.target = "_blank";
    link.rel = "noreferrer";
  } else {
    link.addEventListener("click", (event) => event.preventDefault());
  }
  return link;
};

const setMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.append(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (value) element.setAttribute(key, value);
  });
};

const setHeadLink = (rel, href, attributes = {}) => {
  if (!href) return;
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.append(element);
  }
  element.href = getAssetUrl(href);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value) element.setAttribute(key, value);
  });
};

const applyHeadConfig = () => {
  const seo = config.seo || {};
  const site = config.site || {};
  const pageTitle = seo.title || site.title || site.name || document.title;
  const description = seo.description || site.description || "";
  const keywords = Array.isArray(seo.keywords) ? seo.keywords.join(", ") : seo.keywords || "";
  const ogTitle = seo.ogTitle || pageTitle;
  const ogDescription = seo.ogDescription || description;
  const ogType = seo.ogType || "website";
  const ogSiteName = seo.ogSiteName || site.name || "";
  const favicon = site.faviconImage || site.logoImage || "";

  document.title = pageTitle;
  setMeta('meta[name="description"]', { name: "description", content: description });
  setMeta('meta[name="keywords"]', { name: "keywords", content: keywords });
  setMeta('meta[name="robots"]', { name: "robots", content: seo.robots || "index, follow" });
  setMeta('meta[name="theme-color"]', { name: "theme-color", content: seo.themeColor || "#080910" });
  setMeta('meta[property="og:title"]', { property: "og:title", content: ogTitle });
  setMeta('meta[property="og:description"]', { property: "og:description", content: ogDescription });
  setMeta('meta[property="og:type"]', { property: "og:type", content: ogType });
  setMeta('meta[property="og:site_name"]', { property: "og:site_name", content: ogSiteName });
  if (seo.ogImage) setMeta('meta[property="og:image"]', { property: "og:image", content: getAssetUrl(seo.ogImage) });
  if (seo.canonicalUrl) {
    setHeadLink("canonical", seo.canonicalUrl);
    setMeta('meta[property="og:url"]', { property: "og:url", content: seo.canonicalUrl });
  }
  if (favicon) setHeadLink("icon", favicon, { type: favicon.endsWith(".svg") ? "image/svg+xml" : "image/png" });
};

const absoluteUrl = (url) => {
  if (!url || url === "#") return "";
  return new URL(getAssetUrl(url), window.location.href).href;
};

const applyStructuredData = () => {
  const seo = config.seo || {};
  const site = config.site || {};
  const canonicalUrl = seo.canonicalUrl || window.location.href;
  const baseId = canonicalUrl.replace(/#.*$/, "").replace(/\/$/, "");
  const visibleMemberSlugs = config.home?.memberSlugs || [];
  const visibleMembers = visibleMemberSlugs.length
    ? visibleMemberSlugs.map((slug) => (config.members || []).find((member) => member.slug === slug)).filter(Boolean)
    : config.members || [];
  const personNodes = visibleMembers.map((member) => {
    const memberSameAs = (member.socials || [])
      .map((link) => link?.url)
      .filter((url) => url && url !== "#" && /^https?:\/\//i.test(url));
    return {
      "@type": "Person",
      "@id": `${baseId}#member-${member.slug}`,
      "name": member.name || "",
      "jobTitle": member.role || "",
      "description": member.summary || "",
      "image": absoluteUrl(member.photo),
      "sameAs": [...new Set(memberSameAs)],
    };
  });
  const sameAs = [...(config.socials || []), ...(config.contact?.methods || [])]
    .map((link) => link?.url)
    .filter((url) => url && url !== "#" && /^https?:\/\//i.test(url));
  const graph = [
    {
      "@type": ["Organization", "MusicGroup"],
      "@id": `${baseId}#organization`,
      "name": site.name || seo.ogSiteName || document.title,
      "url": canonicalUrl,
      "description": seo.description || site.description || "",
      "logo": absoluteUrl(site.logoImage || site.faviconImage),
      "image": absoluteUrl(seo.ogImage || site.logoImage || site.faviconImage),
      "sameAs": [...new Set(sameAs)],
      "genre": ["Progressive Metalcore", "Post-Hardcore", "前卫后核"],
      "foundingDate": "2024",
      "foundingLocation": {
        "@type": "Place",
        "name": "Shanghai, China",
      },
      "member": personNodes.map((member) => ({ "@id": member["@id"] })),
    },
    {
      "@type": "WebSite",
      "@id": `${baseId}#website`,
      "url": canonicalUrl,
      "name": site.title || site.name || document.title,
      "description": seo.description || site.description || "",
      "publisher": { "@id": `${baseId}#organization` },
      "inLanguage": document.documentElement.lang || "zh-CN",
    },
    {
      "@type": "WebPage",
      "@id": `${baseId}#webpage`,
      "url": canonicalUrl,
      "name": seo.title || site.title || site.name || document.title,
      "description": seo.description || site.description || "",
      "isPartOf": { "@id": `${baseId}#website` },
      "about": { "@id": `${baseId}#organization` },
      "mainEntity": { "@id": `${baseId}#organization` },
      "inLanguage": document.documentElement.lang || "zh-CN",
    },
    ...personNodes,
  ];
  const data = { "@context": "https://schema.org", "@graph": graph };
  let script = document.getElementById("site-structured-data");
  if (!script) {
    script = document.createElement("script");
    script.id = "site-structured-data";
    script.type = "application/ld+json";
    document.head.append(script);
  }
  script.textContent = JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
};

applyHeadConfig();
applyStructuredData();

const platformIconMap = [
  { match: ["网易云", "netease", "cloud music"], icon: "assets/icons/netease-cloud.svg" },
  { match: ["b站", "bilibili", "哔哩"], icon: "assets/icons/bilibili.svg" },
  { match: ["小红书", "rednote", "xiaohongshu"], icon: "assets/images/socials/xiaohongshu-seeklogo-1778292665883-270d84.png" },
];

const getPlatformIcon = (link) => {
  if (link.icon) return link.icon;
  const label = (link.label || "").toLowerCase();
  const configured = (config.platforms || []).find((entry) =>
    [entry.label, ...(entry.matches || [])].filter(Boolean).some((keyword) => label.includes(keyword.toLowerCase())),
  );
  if (configured?.icon) return configured.icon;
  const social = (config.socials || []).find((entry) => (entry.label || "").toLowerCase() === label && entry.icon);
  if (social?.icon) return social.icon;
  const match = platformIconMap.find((entry) => entry.match.some((keyword) => label.includes(keyword.toLowerCase())));
  return match?.icon || "";
};

const getPlatformQr = (link) => link.qrcode || link.qr || "";

const createIconLink = (link, className = "pill-link") => {
  const element = createLink(link, className);
  const iconPath = getPlatformIcon(link);
  if (iconPath) {
    const icon = document.createElement("img");
    icon.src = getAssetUrl(iconPath);
    icon.alt = "";
    prepareImage(icon);
    element.prepend(icon);
  }
  attachQrBubble(element, link);
  return element;
};
const createPlatformLink = (link) => createIconLink(link, "release-link-button");

const attachQrBubble = (element, link) => {
  const qrPath = getPlatformQr(link);
  if (!qrPath) return;
  element.classList.add("has-qr-bubble");
  const bubble = document.createElement("span");
  bubble.className = "qr-bubble";
  bubble.innerHTML = `
    <img class="qr-bubble-image" src="${getAssetUrl(qrPath)}" alt="${link.label || "二维码"}">
    <span>${link.qrLabel || link.label || "扫码查看"}</span>
    <span class="qr-bubble-line qr-bubble-line-top" aria-hidden="true"></span>
    <span class="qr-bubble-line qr-bubble-line-right" aria-hidden="true"></span>
    <span class="qr-bubble-line qr-bubble-line-bottom" aria-hidden="true"></span>
    <span class="qr-bubble-line qr-bubble-line-left" aria-hidden="true"></span>
  `;
  prepareImage(bubble.querySelector("img"));
  element.append(bubble);
};

const bySlugs = (items, slugs) => {
  if (!slugs || slugs.length === 0) return items;
  const lookup = new Map(items.map((item) => [item.slug, item]));
  return slugs.map((slug) => lookup.get(slug)).filter(Boolean);
};

const getGalleryImages = (group) => (Array.isArray(group) ? group : group.images || []);
const getGalleryLayout = (group) => {
  const layout = Array.isArray(group) ? "live-a" : group.layout || "live-a";
  return ["live-a", "live-b", "live-c"].includes(layout) ? layout : "live-a";
};
const galleryTemplateSizes = {
  "live-a": 7,
  "live-b": 7,
  "live-c": 5,
};
const chunkItems = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};
const isMobileLayout = window.matchMedia("(max-width: 620px)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scheduleTrackFrame = (callback) => {
  let frame = 0;
  return () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      callback();
    });
  };
};
const getActivePanelIndex = (track) => {
  if (!track.children.length) return 0;
  const viewportCenter = track.scrollLeft + track.clientWidth / 2;
  let activeIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < track.children.length; index += 1) {
    const panel = track.children[index];
    const panelCenter = panel.offsetLeft + panel.clientWidth / 2;
    const distance = Math.abs(panelCenter - viewportCenter);
    if (distance >= closestDistance) continue;
    activeIndex = index;
    closestDistance = distance;
  }
  return activeIndex;
};
const scrollTrackToIndex = (track, index) => {
  const panel = track.children[index];
  if (!panel) return;
  track.scrollTo({ left: panel.offsetLeft, behavior: "smooth" });
};
const scrollTrackLoop = (track, direction) => {
  const count = track.children.length;
  if (count <= 1) return;
  const activeIndex = getActivePanelIndex(track);
  const nextIndex = (activeIndex + direction + count) % count;
  scrollTrackToIndex(track, nextIndex);
};
const appendTrackDot = (track, dots, panel, label) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "gallery-dot";
  dot.setAttribute("aria-label", label);
  dot.addEventListener("click", () => {
    track.scrollTo({ left: panel.offsetLeft, behavior: "smooth" });
  });
  dots.append(dot);
};
const updateTrackDots = (track, dots) => {
  if (!track.children.length) return;
  const activeIndex = getActivePanelIndex(track);
  [...dots.children].forEach((dot, index) => dot.classList.toggle("active", index === activeIndex));
};
const startAutoWhenVisible = (element, start, stop = () => {}) => {
  if (!element || prefersReducedMotion) return;
  if (!("IntersectionObserver" in window)) {
    start();
    return;
  }
  let started = false;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.32) {
        if (!started) {
          started = true;
          start();
        }
      } else if (started) {
        started = false;
        stop();
      }
    });
  }, { threshold: [0, 0.32] });
  observer.observe(element);
};
const passVerticalWheelToPage = (...elements) => {
  let pendingDelta = 0;
  let frame = 0;
  const flush = () => {
    window.scrollBy(0, pendingDelta);
    pendingDelta = 0;
    frame = 0;
  };
  elements.filter(Boolean).forEach((element) => {
    element.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      pendingDelta += event.deltaY;
      if (!frame) frame = window.requestAnimationFrame(flush);
    }, { passive: false });
  });
};

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element && value !== undefined) element.textContent = value;
};

const renderHomeText = () => {
  const text = config.text || {};
  const hero = text.hero || {};
  setText("hero-kicker", hero.kicker);
  setText("hero-title", hero.title);
  setText("hero-subtitle", hero.subtitle);
  const primary = document.getElementById("hero-primary");
  const secondary = document.getElementById("hero-secondary");
  const pdf = document.getElementById("hero-pdf");
  if (primary) {
    primary.textContent = hero.primaryButton || primary.textContent;
    primary.href = hero.primaryUrl || primary.href;
  }
  if (secondary) {
    secondary.textContent = hero.secondaryButton || secondary.textContent;
    secondary.href = hero.secondaryUrl || secondary.href;
  }
  if (pdf) {
    const pdfUrl = hero.pdfUrl || config.contact?.pressKit?.url || "#";
    pdf.textContent = hero.pdfButton || pdf.textContent;
    pdf.href = pdfUrl;
    if (pdfUrl && pdfUrl !== "#") {
      pdf.target = "_blank";
      pdf.rel = "noreferrer";
    }
  }

  const about = text.about || {};
  setText("about-kicker", about.kicker);
  setText("about-title", about.title);
  const aboutCopy = document.getElementById("about-copy");
  if (aboutCopy) {
    aboutCopy.innerHTML = "";
    const paragraphs = [...(about.paragraphs || []), ...(about.profileParagraphs || [])].filter((paragraph, index, list) => {
      const trimmed = paragraph.trim();
      return trimmed && list.findIndex((item) => item.trim() === trimmed) === index;
    });
    paragraphs.forEach((paragraph) => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      aboutCopy.append(p);
    });
  }
  const aboutPhoto = document.getElementById("about-photo");
  const aboutPhotoImage = aboutPhoto?.querySelector("img");
  if (aboutPhoto && aboutPhotoImage && about.photo) {
    aboutPhoto.hidden = false;
    aboutPhotoImage.src = getAssetUrl(about.photo);
    prepareImage(aboutPhotoImage);
    aboutPhoto.tabIndex = 0;
    aboutPhoto.setAttribute("role", "button");
    aboutPhoto.setAttribute("aria-label", "放大查看乐队合照");
    const toggleZoom = () => aboutPhoto.classList.toggle("is-expanded");
    aboutPhoto.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleZoom();
    });
    document.addEventListener("click", (event) => {
      if (!aboutPhoto.classList.contains("is-expanded")) return;
      if (aboutPhoto.contains(event.target)) return;
      aboutPhoto.classList.remove("is-expanded");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") aboutPhoto.classList.remove("is-expanded");
    });
    aboutPhoto.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleZoom();
      }
    });
  }
  setText("live-kicker", text.live?.kicker);
  setText("gallery-title", text.live?.title);
  document.querySelector(".gallery-hint").textContent = text.live?.hint || "";
  setText("shows-kicker", text.shows?.kicker);
  setText("shows-title", text.shows?.title);
  setText("music-kicker", text.music?.kicker);
  setText("music-title", text.music?.title);
  setText("members-kicker", text.members?.kicker);
  setText("members-title", text.members?.title);
  setText("social-kicker", text.social?.kicker);
  setText("social-title", text.social?.title);
  setText("social-copy", text.social?.copy);
};

renderHomeText();

const heroShowcaseStage = document.getElementById("hero-showcase-stage");
const fallbackShowcaseImages = (config.home?.galleryGroups || []).flatMap(getGalleryImages).slice(0, 5);
const showcaseImages = (config.text?.hero?.showcaseImages || []).length ? config.text.hero.showcaseImages : fallbackShowcaseImages;
if (heroShowcaseStage && showcaseImages.length) {
  showcaseImages.slice(0, 5).forEach((image, index) => {
    const card = document.createElement("figure");
    card.className = `showcase-card card-${index + 1}`;
    card.innerHTML = `
      <img src="${getAssetUrl(image.src)}" alt="${image.alt || "Starry Nexus 灞曠ず鍥剧墖"}">
      <figcaption>${image.caption || String(index + 1).padStart(2, "0")}</figcaption>
    `;
    prepareImage(card.querySelector("img"), index === 0);
    heroShowcaseStage.append(card);
  });
}

const stats = document.getElementById("stats");
config.stats.forEach((item) => {
  const stat = document.createElement("article");
  stat.className = "stat-card";
  stat.innerHTML = `<strong>${item.value}</strong><span>${item.label}</span>`;
  stats.append(stat);
});

const gallery = document.getElementById("gallery");
const galleryViewport = document.getElementById("gallery-viewport");
const galleryDots = document.getElementById("gallery-dots");
const configuredGalleryGroups = (config.home.galleryGroups || [config.gallery]).map((group) => ({
  layout: getGalleryLayout(group),
  images: getGalleryImages(group),
}));
const galleryGroups = isMobileLayout
  ? chunkItems(configuredGalleryGroups.flatMap((group) => group.images), 4)
      .filter((images) => images.length === 4)
      .map((images) => ({ layout: "mobile", images }))
  : configuredGalleryGroups;

galleryGroups.forEach((group, index) => {
  const selectedLayout = getGalleryLayout(group);
  const panelLayout = group.layout === "mobile" ? "mobile" : selectedLayout;
  const images = group.images.slice(0, group.layout === "mobile" ? 4 : galleryTemplateSizes[selectedLayout]);
  const panel = document.createElement("div");
  panel.className = `gallery-panel gallery-${panelLayout}`;
  panel.id = `gallery-panel-${index}`;
  panel.setAttribute("aria-label", `鐜板満鐓х墖缁?${index + 1}`);

  images.forEach((item, imageIndex) => {
    const figure = document.createElement("figure");
    figure.className = `gallery-item slot-${imageIndex + 1}`;
    figure.innerHTML = `
      <img src="${getAssetUrl(item.src)}" alt="${item.alt}">
      <figcaption>${item.caption}</figcaption>
    `;
    const image = figure.querySelector("img");
    prepareImage(image, index === 0 && imageIndex < 2);
    const syncImageShape = () => {
      const isPortrait = image.naturalHeight > image.naturalWidth;
      figure.classList.toggle("portrait", isPortrait);
      figure.classList.toggle("landscape", !isPortrait);
    };
    image.addEventListener("load", syncImageShape);
    if (image.complete) syncImageShape();
    panel.append(figure);
  });

  gallery.append(panel);

  appendTrackDot(gallery, galleryDots, panel, `查看第 ${index + 1} 组现场照片`);
});

const updateGalleryDots = () => updateTrackDots(gallery, galleryDots);

const scrollGallery = (direction) => {
  scrollTrackLoop(gallery, direction);
};

document.getElementById("gallery-prev").addEventListener("click", () => scrollGallery(-1));
document.getElementById("gallery-next").addEventListener("click", () => scrollGallery(1));
const scheduleGalleryDots = scheduleTrackFrame(updateGalleryDots);
gallery.addEventListener("scroll", scheduleGalleryDots, { passive: true });
window.addEventListener("resize", scheduleGalleryDots);
updateGalleryDots();
let galleryAutoTimer;
const startGalleryAuto = () => {
  if (gallery.children.length <= 1) return;
  window.clearInterval(galleryAutoTimer);
  galleryAutoTimer = window.setInterval(() => scrollGallery(1), 5200);
};
const stopGalleryAuto = () => window.clearInterval(galleryAutoTimer);
galleryViewport.addEventListener("mouseenter", stopGalleryAuto);
galleryViewport.addEventListener("mouseleave", startGalleryAuto);
galleryViewport.addEventListener("focusin", stopGalleryAuto);
galleryViewport.addEventListener("focusout", startGalleryAuto);
startAutoWhenVisible(galleryViewport, startGalleryAuto, stopGalleryAuto);

const featuredPosters = document.getElementById("featured-posters");
const posterViewport = document.querySelector(".poster-viewport");
const posterDots = document.getElementById("poster-dots");
const posterPrev = document.getElementById("poster-prev");
const posterNext = document.getElementById("poster-next");
const featuredShows = bySlugs(config.shows, config.home.featuredShowSlugs);
const posterPageSize = isMobileLayout ? 4 : 8;

chunkItems(featuredShows, posterPageSize).forEach((shows, panelIndex) => {
  const panel = document.createElement("div");
  panel.className = "poster-wall poster-template poster-panel";
  panel.id = `poster-panel-${panelIndex}`;
  panel.setAttribute("aria-label", `婕斿嚭娴锋姤缁?${panelIndex + 1}`);

  shows.forEach((show, index) => {
    const poster = document.createElement("article");
    poster.className = "poster-card";
    poster.innerHTML = `
      <img src="${getAssetUrl(show.poster || show.cover)}" alt="${show.title} 娴锋姤">
      <strong>${show.title}</strong>
    `;
    const image = poster.querySelector("img");
    prepareImage(image, panelIndex === 0 && index < 2);
    const syncPosterShape = () => {
      poster.classList.toggle("portrait", image.naturalHeight >= image.naturalWidth);
      poster.classList.toggle("landscape", image.naturalWidth > image.naturalHeight);
    };
    image.addEventListener("load", syncPosterShape);
    if (image.complete) syncPosterShape();
    panel.append(poster);
  });

  featuredPosters.append(panel);

  appendTrackDot(featuredPosters, posterDots, panel, `查看第 ${panelIndex + 1} 组演出海报`);
});

const updatePosterDots = () => updateTrackDots(featuredPosters, posterDots);

const scrollPosters = (direction) => {
  scrollTrackLoop(featuredPosters, direction);
};

if (featuredShows.length <= posterPageSize) {
  posterPrev.hidden = true;
  posterNext.hidden = true;
  posterDots.hidden = true;
} else {
  posterPrev.addEventListener("click", () => scrollPosters(-1));
  posterNext.addEventListener("click", () => scrollPosters(1));
  const schedulePosterDots = scheduleTrackFrame(updatePosterDots);
  featuredPosters.addEventListener("scroll", schedulePosterDots, { passive: true });
  window.addEventListener("resize", schedulePosterDots);
  updatePosterDots();
  if (isMobileLayout) {
    let posterTimer;
    const startPosterTimer = () => {
      window.clearInterval(posterTimer);
      posterTimer = window.setInterval(() => scrollPosters(1), 5200);
    };
    const stopPosterTimer = () => window.clearInterval(posterTimer);
    startAutoWhenVisible(featuredPosters, startPosterTimer, stopPosterTimer);
  }
}

if (isMobileLayout) {
  passVerticalWheelToPage(galleryViewport, gallery, posterViewport, featuredPosters);
}

const releases = document.getElementById("releases");
const releaseDots = document.getElementById("release-dots");
const releasePrev = document.getElementById("release-prev");
const releaseNext = document.getElementById("release-next");
const featuredReleases = bySlugs(config.releases, config.home.releaseSlugs);
const releasePageSize = isMobileLayout ? 1 : 3;

chunkItems(featuredReleases, releasePageSize).forEach((items, panelIndex) => {
  const panel = document.createElement("div");
  panel.className = "release-panel";
  panel.id = `release-panel-${panelIndex}`;
  panel.setAttribute("aria-label", `浣滃搧缁?${panelIndex + 1}`);

  items.forEach((release) => {
    const article = document.createElement("article");
    article.className = "release-card";
    const links = document.createElement("div");
    links.className = "release-links";
    release.links.forEach((link) => links.append(createPlatformLink(link)));
    article.innerHTML = `
      <div class="card-image-link">
        <img src="${getAssetUrl(release.cover)}" alt="${release.title} 灏侀潰">
      </div>
      <div class="release-body">
        <span>${release.type}</span>
        <h3>${release.title}</h3>
        <p>发布时间：${release.date}</p>
      </div>
    `;
    prepareImage(article.querySelector("img"), panelIndex === 0);
    article.querySelector(".release-body").append(links);
    panel.append(article);
  });

  releases.append(panel);

  appendTrackDot(releases, releaseDots, panel, `查看第 ${panelIndex + 1} 组作品`);
});

const updateReleaseDots = () => updateTrackDots(releases, releaseDots);

const scrollReleases = (direction) => {
  scrollTrackLoop(releases, direction);
};

if (featuredReleases.length <= releasePageSize) {
  releasePrev.hidden = true;
  releaseNext.hidden = true;
  releaseDots.hidden = true;
} else {
  releasePrev.addEventListener("click", () => scrollReleases(-1));
  releaseNext.addEventListener("click", () => scrollReleases(1));
  const scheduleReleaseDots = scheduleTrackFrame(updateReleaseDots);
  releases.addEventListener("scroll", scheduleReleaseDots, { passive: true });
  window.addEventListener("resize", scheduleReleaseDots);
  updateReleaseDots();
  if (isMobileLayout) {
    let releaseTimer;
    const startReleaseTimer = () => {
      window.clearInterval(releaseTimer);
      releaseTimer = window.setInterval(() => scrollReleases(1), 4400);
    };
    const stopReleaseTimer = () => window.clearInterval(releaseTimer);
    const restartReleaseTimer = () => {
      window.clearInterval(releaseTimer);
      releaseTimer = window.setInterval(() => scrollReleases(1), 5200);
    };
    releases.addEventListener("mouseenter", stopReleaseTimer);
    releases.addEventListener("mouseleave", restartReleaseTimer);
    startAutoWhenVisible(releases, startReleaseTimer, stopReleaseTimer);
  }
}

const members = document.getElementById("members-grid");
let memberPrev;
let memberNext;
if (isMobileLayout && members) {
  const memberFrame = document.createElement("div");
  memberFrame.className = "member-frame";
  members.parentNode.insertBefore(memberFrame, members);
  memberFrame.append(members);
  memberPrev = document.createElement("button");
  memberNext = document.createElement("button");
  memberPrev.type = "button";
  memberNext.type = "button";
  memberPrev.className = "gallery-control prev member-prev";
  memberNext.className = "gallery-control next member-next";
  memberPrev.setAttribute("aria-label", "上一位成员");
  memberNext.setAttribute("aria-label", "下一位成员");
  memberPrev.textContent = "‹";
  memberNext.textContent = "›";
  memberFrame.append(memberPrev, memberNext);
}
bySlugs(config.members, config.home.memberSlugs).forEach((member) => {
  const card = document.createElement("article");
  card.className = "member-card";
  const highlights = (member.highlights || []).map((item) => `<li>${item}</li>`).join("");
  const memberLinks = document.createElement("div");
  memberLinks.className = "member-links";
  (member.socials || member.links || [])
    .filter((link) => link?.label && ((link.url && link.url !== "#") || getPlatformQr(link)))
    .forEach((link) => memberLinks.append(createIconLink(link, "member-link")));
  card.innerHTML = `
    <div class="card-image-link">
      <img src="${getAssetUrl(member.photo)}" alt="${member.name} 照片">
    </div>
    <div class="member-body">
      <p>${member.role}</p>
      <h3>${member.name}</h3>
      ${member.summary ? `<p class="member-summary">${member.summary}</p>` : ""}
      <ul>${highlights}</ul>
    </div>
  `;
  prepareImage(card.querySelector("img"));
  if (memberLinks.children.length) card.querySelector(".member-body").append(memberLinks);
  members.append(card);
});
if (isMobileLayout && members.children.length > 1) {
  let memberTimer;
  const startMemberTimer = () => {
    window.clearInterval(memberTimer);
    memberTimer = window.setInterval(() => scrollTrackLoop(members, 1), 4400);
  };
  const stopMemberTimer = () => window.clearInterval(memberTimer);
  const restartMemberTimer = () => {
    window.clearInterval(memberTimer);
    memberTimer = window.setInterval(() => scrollTrackLoop(members, 1), 5200);
  };
  memberPrev?.addEventListener("click", () => {
    stopMemberTimer();
    scrollTrackLoop(members, -1);
    restartMemberTimer();
  });
  memberNext?.addEventListener("click", () => {
    stopMemberTimer();
    scrollTrackLoop(members, 1);
    restartMemberTimer();
  });
  startAutoWhenVisible(members, startMemberTimer, stopMemberTimer);
}

const socialLinks = document.getElementById("social-links");
config.socials.forEach((social) => {
  const link = createIconLink(social, "pill-link social-pill-link");
  socialLinks.append(link);
});
const contactMethods = document.getElementById("contact-methods");
const contactConfig = config.contact || {};
document.getElementById("contact-kicker").textContent = contactConfig.kicker || "Contact";
document.getElementById("contact-title").textContent = contactConfig.title || "演出、合作与活动建联";
const contactLead = document.getElementById("contact-lead");
contactLead.textContent = contactConfig.lead || "";

const contactNotes = document.getElementById("contact-notes");
(contactConfig.notes || []).forEach((note) => {
  const item = document.createElement("p");
  item.textContent = note;
  contactNotes.append(item);
});

const contactQrGrid = document.createElement("div");
contactQrGrid.className = "contact-qr-grid contact-copy-qr-grid";
(contactConfig.qrcodes || [])
  .filter((item) => item?.image)
  .slice(0, 2)
  .forEach((item) => {
    const figure = document.createElement("figure");
    figure.innerHTML = `
      <img src="${getAssetUrl(item.image)}" alt="${item.label || "QR Code"}">
      <figcaption>${item.label || ""}</figcaption>
    `;
    prepareImage(figure.querySelector("img"));
    contactQrGrid.append(figure);
  });
if (contactQrGrid.children.length) {
  const pressKit = document.getElementById("press-kit");
  if (pressKit) pressKit.before(contactQrGrid);
  else contactLead.after(contactQrGrid);
}

(contactConfig.methods || config.contacts || []).forEach((contact) => {
  const method = document.createElement("button");
  method.type = "button";
  method.className = "contact-card contact-link-button";
  const iconPath = getPlatformIcon(contact);
  method.innerHTML = `
    ${iconPath ? `<img src="${getAssetUrl(iconPath)}" alt="">` : ""}
    <span>${contact.label}</span>
  `;
  attachQrBubble(method, contact);
  contactMethods.append(method);
});

const pressKit = document.getElementById("press-kit");
if (contactConfig.pressKit) {
  const pressKitUrl = contactConfig.pressKit.url || config.text?.hero?.pdfUrl || "#";
  pressKit.href = pressKitUrl;
  if (pressKitUrl && pressKitUrl !== "#") {
    pressKit.target = "_blank";
    pressKit.rel = "noreferrer";
  }
  pressKit.innerHTML = `
    <span>${contactConfig.pressKit.eyebrow || "Contact Card"}</span>
    <strong>${contactConfig.pressKit.label || "合作资料与二维码"}</strong>
    <p>${contactConfig.pressKit.description || ""}</p>
  `;
}
window.observeReveal?.();


