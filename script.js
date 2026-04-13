const views = [...document.querySelectorAll(".view")];
const navLinks = [...document.querySelectorAll(".nav a, .footer-nav a")];
const mobileNavLinks = [...document.querySelectorAll(".mobile-nav a")];
const brandLink = document.querySelector(".js-home-brand");
const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-nav");
const siteHeader = document.querySelector(".site-header");
const heroSection = document.querySelector(".hero");
const forms = [...document.querySelectorAll(".js-lead-form")];
const faqItems = [...document.querySelectorAll(".faq-item")];
let compareSliders = [...document.querySelectorAll(".compare-slider")];
const reviewTrack = document.querySelector('[data-slider="reviews"]');
const reviewPrev = document.querySelector(".reviews-prev");
const reviewNext = document.querySelector(".reviews-next");
const scrollTopButton = document.querySelector(".scroll-top");
const siteFooter = document.querySelector(".site-footer");
const orderModal = document.querySelector(".js-order-modal");
const cookieConsentModal = document.querySelector(".js-cookie-consent-modal");
const openOrderButtons = [...document.querySelectorAll(".js-open-order-modal")];
const closeOrderButtons = [...document.querySelectorAll(".js-close-order-modal")];
const cookieAcceptButton = document.querySelector(".js-cookie-accept");
const cookieCloseButtons = [...document.querySelectorAll(".js-cookie-close")];
const cookieConsentLinks = [...document.querySelectorAll(".cookie-consent-banner a")];
const limitedTexts = [...document.querySelectorAll(".js-limited-text")];
const revealSections = [...document.querySelectorAll(".js-reveal-section")];
const revealItems = [...document.querySelectorAll(".reveal-up")];
const parallaxPanels = [...document.querySelectorAll(".js-parallax-panel, .service-showcase, .advantages-section, .reviews-section, #contacts, .site-footer")];
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const mapEmbeds = [...document.querySelectorAll("[data-map-embed]")];
const mapAddressText = [...document.querySelectorAll("[data-map-address-text]")];
const mapTitles = [...document.querySelectorAll("[data-map-title]")];
const mapNotes = [...document.querySelectorAll("[data-map-note]")];
const mapRoutes = [...document.querySelectorAll("[data-map-route]")];
const sitePhoneLinks = [...document.querySelectorAll("[data-site-phone-link], .call-link")];
const siteHoursNodes = [...document.querySelectorAll("[data-site-hours]")];
const siteCityNodes = [...document.querySelectorAll("[data-site-city]")];
const reviewCards = [...document.querySelectorAll("[data-review-card]")];
const siteConfig = window.SITE_CONFIG || {};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isAbsoluteUrl(value) {
  return /^(?:[a-z]+:)?\/\//i.test(String(value || ""));
}

function normalizeMediaUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:")) return raw;
  if (isAbsoluteUrl(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return raw.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "");
}

function normalizeTargetUrl(value, fallback = "#") {
  const normalized = normalizeMediaUrl(value);
  return normalized || fallback;
}

function buildQrImageUrl(placeUrl) {
  const safeUrl = normalizeTargetUrl(placeUrl, "");
  if (!safeUrl || safeUrl === "#") return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&format=svg&data=${encodeURIComponent(safeUrl)}`;
}

function resolveReviewQrSrc(reviewConfig, placeUrl) {
  const staticQr = normalizeMediaUrl(reviewConfig?.qrImage);
  if (staticQr) return staticQr;
  return buildQrImageUrl(placeUrl);
}

function preloadReviewCardAssets() {
  const reviewsConfig = siteConfig.reviewCards || {};
  Object.values(reviewsConfig).forEach((reviewConfig) => {
    if (!reviewConfig) return;
    const placeUrl = normalizeTargetUrl(reviewConfig.placeUrl || reviewConfig.reviewUrl || reviewConfig.buttonUrl || reviewConfig.qrUrl, "#");
    const qrSrc = resolveReviewQrSrc(reviewConfig, placeUrl);
    if (!qrSrc) return;

    const hasPreload = [...document.head.querySelectorAll('link[rel="preload"][as="image"]')]
      .some((link) => link.getAttribute("href") === qrSrc);

    if (!hasPreload) {
      const preload = document.createElement("link");
      preload.rel = "preload";
      preload.as = "image";
      preload.href = qrSrc;
      preload.setAttribute("fetchpriority", "high");
      document.head.appendChild(preload);
    }

    const image = new Image();
    image.decoding = "sync";
    image.fetchPriority = "high";
    image.src = qrSrc;
  });
}

function clampRating(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(5, numeric));
}

function formatRating(value) {
  const rating = clampRating(value);
  if (!rating) return "—";
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

function formatReviewsCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return "";
  return `${count} ${new Intl.PluralRules("ru-RU").select(count) === "one" ? "отзыв" : (new Intl.PluralRules("ru-RU").select(count) === "few" ? "отзыва" : "отзывов")}`;
}

function buildStars(value) {
  const rating = Math.round(clampRating(value)) || 0;
  return rating ? `${"★".repeat(rating)}${"☆".repeat(Math.max(0, 5 - rating))}` : "";
}

function getReviewSourceMeta(source) {
  const normalized = String(source || "manual").toLowerCase();
  if (normalized === "2gis" || normalized === "gis") {
    return {
      source: "2gis",
      label: "",
      brandMark: "2GIS",
      cardClass: "review-card-gis",
      buttonClass: "gis-solid",
      iconLabel: "2GIS",
      preferMarkOnly: true,
    };
  }
  if (normalized === "yandex") {
    return {
      source: "yandex",
      label: "Яндекс Карты",
      brandMark: "",
      cardClass: "review-card-yandex",
      buttonClass: "yandex-solid",
      iconLabel: "Яндекс",
      preferLabelOnly: true,
    };
  }
  return {
    source: "manual",
    label: "Ручной источник",
    brandMark: "★",
    cardClass: "review-card-manual",
    buttonClass: "manual-solid",
    iconLabel: "★",
    preferMarkOnly: false,
    preferLabelOnly: false,
  };
}
const formatCards = [...document.querySelectorAll(".work-modes-panel .work-mode-card")];
const interactiveCards = [
  ...document.querySelectorAll(".compare-card, .review-card, .review-slide, .map-card, .contact-block"),
];
const maxLinks = [...document.querySelectorAll("[data-max-link]")];
const allImages = [...document.querySelectorAll("img")];
let reviewSliderBound = false;
const heroStaticQuery = window.matchMedia("(max-width: 767px), (prefers-reduced-motion: reduce)");
const FORM_REQUEST_TIMEOUT_MS = 15000;
const FORM_COOLDOWN_MS = 15000;
const FORM_DUPLICATE_TTL_MS = 120000;
const FORM_DUPLICATE_STORAGE_KEY = "aquablesk_lead_submit_cache";

function syncHeroRuntimeClass() {
  document.body.classList.toggle("mobile-hero-static", heroStaticQuery.matches);
}

syncHeroRuntimeClass();
if (heroStaticQuery.addEventListener) {
  heroStaticQuery.addEventListener("change", syncHeroRuntimeClass);
} else if (heroStaticQuery.addListener) {
  heroStaticQuery.addListener(syncHeroRuntimeClass);
}

function mergeSiteConfig(source) {
  if (!source || typeof source !== "object") return;
  Object.entries(source).forEach(([key, value]) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      siteConfig[key] &&
      typeof siteConfig[key] === "object" &&
      !Array.isArray(siteConfig[key])
    ) {
      siteConfig[key] = { ...siteConfig[key], ...value };
      return;
    }
    siteConfig[key] = value;
  });
}

const validViews = new Set([
  "home",
  "services-page",
  "reviews-page",
  "about",
  "contacts-page",
  "privacy",
  "user-agreement",
  "thank-you",
]);

function applyContactMapConfig() {
  const mapConfig = siteConfig.contactMap || {};
  const lat = Number(mapConfig.lat);
  const lng = Number(mapConfig.lng);
  const zoom = Number(mapConfig.zoom) || 15;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const address = mapConfig.address || "Хабаровск, центр города";
  const title = mapConfig.title || "АкваБлеск в Хабаровске";
  const note = mapConfig.note || "Откройте карту, посмотрите точку и постройте маршрут.";
  const routeUrl = normalizeTargetUrl(
    mapConfig.routeUrl || mapConfig.placeUrl ||
    (hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`),
    "https://www.google.com/maps",
  );
  const embedUrl = normalizeTargetUrl(
    mapConfig.embedUrl || mapConfig.iframeSrc ||
    (hasCoords
      ? `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`
      : `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=${zoom}&output=embed`),
    "about:blank",
  );

  mapEmbeds.forEach((frame) => {
    frame.src = embedUrl;
    frame.title = title;
    frame.loading = "lazy";
    frame.setAttribute("allowfullscreen", "");
  });
  mapAddressText.forEach((node) => {
    node.textContent = address;
  });
  mapTitles.forEach((node) => {
    node.textContent = title;
  });
  mapNotes.forEach((node) => {
    node.textContent = note;
  });
  mapRoutes.forEach((link) => {
    link.href = routeUrl;
  });
}

function applySiteContactConfig() {
  const siteData = siteConfig.site || {};
  const fallbackPhone = siteData.phoneDisplay || "+7 (914) 582-63-17";
  const normalizedHref =
    siteData.phoneHref ||
    (() => {
      const digits = String(fallbackPhone).replace(/\D/g, "");
      return digits ? `tel:+${digits}` : "tel:+79145826317";
    })();
  const city = siteData.city || "Хабаровск";
  const hours = siteData.hours || "Ежедневно 09:00–22:00";
  const phoneAria = `Позвонить по номеру ${fallbackPhone}`;

  sitePhoneLinks.forEach((link) => {
    link.href = normalizedHref;
    link.setAttribute("aria-label", phoneAria);
    if (link.hasAttribute("data-site-phone-text") || link.classList.contains("phone-link")) {
      link.textContent = fallbackPhone;
    }
    if (link.title && /MAX/i.test(link.title) === false) {
      link.title = phoneAria;
    }
  });

  siteHoursNodes.forEach((node) => {
    node.textContent = hours;
  });

  siteCityNodes.forEach((node) => {
    node.textContent = city;
  });
}

function applyReviewCardConfig() {
  const reviewsConfig = siteConfig.reviewCards || {};

  reviewCards.forEach((card) => {
    const reviewKey = card.dataset.reviewCard;
    const reviewConfig = reviewsConfig[reviewKey];
    if (!reviewConfig) return;

    const sourceMeta = getReviewSourceMeta(reviewConfig.source || reviewKey);
    const titleNode = card.querySelector("[data-review-title]");
    const textNode = card.querySelector("[data-review-text]");
    const actionLink = card.querySelector("[data-review-link]");
    const qrLink = card.querySelector("[data-review-qr-link]");
    const qrImage = card.querySelector("[data-review-qr]");
    const sourceLabelNode = card.querySelector("[data-review-source-label]");
    const brandMarkNode = card.querySelector("[data-review-brand-mark]");
    const ratingNode = card.querySelector("[data-review-rating]");
    const starsNode = card.querySelector("[data-review-stars]");
    const countNode = card.querySelector("[data-review-count]");
    const ratingIconNode = card.querySelector("[data-review-rating-icon]");

    const title = reviewConfig.title || titleNode?.textContent || "";
    const text = reviewConfig.text || textNode?.textContent || "";
    const rawSourceLabel = reviewConfig.sourceLabel || sourceMeta.label;
    const sourceLabel = sourceMeta.preferMarkOnly ? "" : rawSourceLabel;
    const brandMark = sourceMeta.preferLabelOnly ? "" : (reviewConfig.icon || sourceMeta.brandMark);
    const placeUrl = normalizeTargetUrl(reviewConfig.placeUrl || reviewConfig.reviewUrl || reviewConfig.buttonUrl || reviewConfig.qrUrl, "#");
    const buttonLabel = reviewConfig.buttonLabel || actionLink?.textContent || "Перейти";
    const rating = formatRating(reviewConfig.rating);
    const stars = buildStars(reviewConfig.rating);
    const reviewsCount = formatReviewsCount(reviewConfig.reviewsCount);
    const qrImageSrc = resolveReviewQrSrc(reviewConfig, placeUrl);
    const openInNewTab = reviewConfig.openInNewTab !== false;

    card.dataset.reviewSource = sourceMeta.source;
    card.classList.remove("review-card-gis", "review-card-yandex", "review-card-manual");
    card.classList.add(sourceMeta.cardClass);

    if (titleNode) titleNode.textContent = title;
    if (textNode) textNode.textContent = text;
    if (sourceLabelNode) sourceLabelNode.textContent = sourceLabel;
    if (brandMarkNode) brandMarkNode.textContent = brandMark;
    if (ratingNode) ratingNode.textContent = rating;
    if (starsNode) starsNode.textContent = stars;
    if (countNode) countNode.textContent = reviewsCount || "Без счётчика отзывов";
    if (ratingIconNode) {
      ratingIconNode.setAttribute("aria-label", `${sourceLabel}: рейтинг ${rating}`);
      ratingIconNode.dataset.iconLabel = reviewConfig.icon || sourceMeta.iconLabel;
    }

    if (actionLink) {
      actionLink.textContent = buttonLabel;
      actionLink.href = placeUrl;
      actionLink.classList.remove("gis-solid", "yandex-solid", "manual-solid");
      actionLink.classList.add(sourceMeta.buttonClass);
      if (openInNewTab) {
        actionLink.target = "_blank";
        actionLink.rel = "noopener noreferrer";
      } else {
        actionLink.removeAttribute("target");
        actionLink.removeAttribute("rel");
      }
    }

    if (qrLink) {
      qrLink.href = placeUrl;
      if (openInNewTab) {
        qrLink.target = "_blank";
        qrLink.rel = "noopener noreferrer";
      } else {
        qrLink.removeAttribute("target");
        qrLink.removeAttribute("rel");
      }
      qrLink.setAttribute("aria-label", `${title}: открыть ссылку ${sourceLabel} по QR`);
    }

    if (qrImage) {
      qrImage.src = qrImageSrc;
      qrImage.alt = reviewConfig.qrAlt || `QR-код: ${title}`;
    }
  });
}

function applyMessengerConfig() {
  const messengerConfig = siteConfig.messenger || {};
  const messengerName = messengerConfig.name || "MAX";
  const messengerUrl = messengerConfig.url || "#";
  const openInNewTab = messengerConfig.openInNewTab !== false;

  maxLinks.forEach((link) => {
    const variant = link.dataset.maxVariant || "contacts";
    const label =
      variant === "hero"
        ? (messengerConfig.heroLabel || `Написать в ${messengerName}`)
        : (messengerConfig.contactsLabel || `Перейти в ${messengerName}`);
    const ariaLabel = messengerConfig.ariaLabel || label;

    link.href = messengerUrl;
    link.textContent = label;
    link.setAttribute("aria-label", ariaLabel);
    link.setAttribute("title", label);

    if (openInNewTab) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else {
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
  });
}

function renderBeforeAfterCards(items) {
  const wrapper = document.querySelector(".before-after-sliders");
  if (!wrapper || !Array.isArray(items) || !items.length) return;

  wrapper.innerHTML = items
    .filter((item) => item && item.before && item.after)
    .map((item, index) => {
      const start = [52, 48, 58, 44][index % 4];
      const title = escapeHtml(item.title || `Сравнение ${index + 1}`);
      const beforeImage = normalizeMediaUrl(item.before);
      const afterImage = normalizeMediaUrl(item.after);
      return `
        <article class="compare-card">
          <p class="center strong">${title}</p>
          <div class="compare-slider" data-start="${start}">
            <img class="compare-base" src="${afterImage}" alt="После — ${title}">
            <div class="compare-overlay" style="width:${start}%;">
              <img src="${beforeImage}" alt="До — ${title}">
            </div>
            <span class="compare-label before">До</span>
            <span class="compare-label after">После</span>
            <div class="compare-divider" style="left:${start}%;"><span></span></div>
            <input class="compare-range" type="range" min="0" max="100" value="${start}" aria-label="Сравнение фото: ${title}">
          </div>
        </article>
      `;
    })
    .join("");

  compareSliders = [...wrapper.querySelectorAll(".compare-slider")];
}

function renderPublicReviews(reviews) {
  if (!reviewTrack || !Array.isArray(reviews) || !reviews.length) return;
  reviewTrack.innerHTML = reviews
    .filter((item) => item && item.text)
    .map((item) => {
      const author = escapeHtml(item.author || "Клиент");
      const publishedAt = item.publishedAt
        ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(item.publishedAt))
        : "";
      const link = normalizeTargetUrl(item.link || "", "");
      const safeText = escapeHtml(item.text || "");
      return `
        <article class="review-slide">
          <div class="review-slide-head">
            <strong>${author}</strong>
          </div>
          <p>${safeText}</p>
          ${(publishedAt || link) ? `<div class="review-slide-meta">${publishedAt ? `<span>${escapeHtml(publishedAt)}</span>` : ""}${link ? `<a href="${link}" target="_blank" rel="noopener noreferrer">Открыть источник</a>` : ""}</div>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderYandexWidget(widgetUrl) {
  if (!widgetUrl) return;
  const widgetRoot = document.querySelector(".reviews-widget");
  if (!widgetRoot || widgetRoot.querySelector(".yandex-widget-shell")) return;

  const shell = document.createElement("div");
  shell.className = "yandex-widget-shell";
  shell.innerHTML = `
    <p class="eyebrow widget-eyebrow">Отзывы клиентов</p>
    <div class="yandex-widget-frame-shell">
      <iframe
        class="yandex-widget-frame"
        src="${widgetUrl}"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        title="Виджет отзывов клиентов"
      ></iframe>
    </div>
  `;
  widgetRoot.appendChild(shell);
}

async function loadServerPublicConfig() {
  try {
    const response = await fetch("/api/public/settings", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const payload = await response.json();
    mergeSiteConfig(payload);
    if (Array.isArray(payload.beforeAfter)) {
      renderBeforeAfterCards(payload.beforeAfter);
    }
    if (Array.isArray(payload.reviews)) {
      renderPublicReviews(payload.reviews);
    }
    if (payload.reviewsIntegration?.yandexWidgetUrl) {
      renderYandexWidget(payload.reviewsIntegration.yandexWidgetUrl);
    }
  } catch (error) {
    console.warn("Public backend config not loaded", error);
  }
}

function initImageLoading() {
  allImages.forEach((image) => {
    image.decoding = "async";

    if (image.closest(".hero-visual")) {
      image.loading = "eager";
      image.fetchPriority = "high";
      return;
    }

    image.loading = "lazy";
  });
}

function closeMenu() {
  if (!mobileMenu || !menuToggle) return;
  mobileMenu.classList.add("is-hidden");
  menuToggle.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  if (!mobileMenu || !menuToggle) return;
  const open = mobileMenu.classList.toggle("is-hidden");
  menuToggle.setAttribute("aria-expanded", open ? "false" : "true");
}

if (menuToggle) {
  menuToggle.addEventListener("click", toggleMenu);
}

function parseHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return { view: "home", section: "hero" };
  const [view, section] = hash.split("/");
  if (validViews.has(view)) return { view, section: section || "" };
  if (document.getElementById(view)) {
    return { view: "home", section: view };
  }
  return { view: "home", section: view };
}

function setActiveLinks(view, section) {
  const target = view === "home" && section ? `#home/${section}` : `#${view}`;
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === target);
  });
}

function getScrollOffset() {
  const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
  return headerHeight + 18;
}

function scrollToSection(sectionNode, behavior = "smooth") {
  if (!sectionNode) return;
  const targetTop = window.scrollY + sectionNode.getBoundingClientRect().top - getScrollOffset();
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior,
  });
}

function parseTargetHash(rawHash) {
  const cleanHash = rawHash.replace(/^#/, "");
  if (!cleanHash) return { view: "home", section: "hero" };
  const [view, section] = cleanHash.split("/");
  if (validViews.has(view)) {
    return { view, section: section || "" };
  }
  if (document.getElementById(view)) {
    return { view: "home", section: view };
  }
  return { view: "home", section: view };
}

function normalizeHashTarget(rawHash) {
  const { view, section } = parseTargetHash(rawHash);
  return view === "home" && section ? `#home/${section}` : `#${view}`;
}

function showView(view, section, options = {}) {
  const { skipSectionScroll = false } = options;
  const current = validViews.has(view) ? view : "home";
  views.forEach((node) => {
    node.classList.toggle("is-hidden", node.dataset.view !== current);
  });
  setActiveLinks(current, section);
  closeMenu();

  requestAnimationFrame(() => {
    syncHeaderVisualState();
    if (current === "home" && section && !skipSectionScroll) {
      const sectionNode = document.getElementById(section);
      if (sectionNode) {
        scrollToSection(sectionNode, "smooth");
        return;
      }
      if (window.location.hash) {
        history.replaceState(null, "", "#home/hero");
      }
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  });
}

function syncView() {
  const { view, section } = parseHash();
  showView(view, section);
}

function syncInitialView() {
  const { view, section } = parseHash();
  showView(view, section, { skipSectionScroll: view === "home" });
}

function applyPublicConfigAndMedia() {
  applySiteContactConfig();
  applyContactMapConfig();
  preloadReviewCardAssets();
  applyReviewCardConfig();
  applyMessengerConfig();
  initImageLoading();
}

window.addEventListener("hashchange", syncView);
window.addEventListener("load", syncInitialView);

if (brandLink) {
  brandLink.addEventListener("click", (event) => {
    event.preventDefault();
    const cleanLocation = `${window.location.pathname}${window.location.search}`;
    window.location.assign(cleanLocation);
  });
}

navLinks.forEach((link) => {
  const href = link.getAttribute("href") || "";
  if (!href.startsWith("#")) return;

  link.addEventListener("click", (event) => {
    event.preventDefault();
    const targetHash = normalizeHashTarget(href);
    const currentHash = normalizeHashTarget(window.location.hash || "#home");
    const { view, section } = parseTargetHash(targetHash);

    if (currentHash === targetHash) {
      showView(view, section);
      return;
    }

    window.location.hash = targetHash;
  });
});

function syncScrollTopButton() {
  if (!scrollTopButton) return;
  scrollTopButton.classList.toggle("is-visible", window.scrollY >= 280);
  if (siteFooter) {
    const footerRect = siteFooter.getBoundingClientRect();
    const nearFooter = footerRect.top < window.innerHeight + 120;
    scrollTopButton.classList.toggle("is-near-footer", nearFooter);
  }
}

function syncHeaderVisualState() {
  if (!siteHeader) return;
  const heroIsVisible = Boolean(heroSection) && heroSection.offsetParent !== null;
  if (!heroIsVisible) {
    siteHeader.classList.add("is-solid");
    return;
  }

  const shouldSolid = window.scrollY > 8;
  siteHeader.classList.toggle("is-solid", shouldSolid);
}

window.addEventListener("scroll", syncScrollTopButton, { passive: true });
window.addEventListener("load", syncScrollTopButton);
window.addEventListener("scroll", syncHeaderVisualState, { passive: true });
window.addEventListener("load", syncHeaderVisualState);
window.addEventListener("resize", syncHeaderVisualState);

mobileNavLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

function openOrderModal() {
  if (!orderModal) return;
  orderModal.classList.remove("is-hidden");
  orderModal.setAttribute("aria-hidden", "false");
  syncBodyScrollLock();
}

function closeOrderModal() {
  if (!orderModal) return;
  orderModal.classList.add("is-hidden");
  orderModal.setAttribute("aria-hidden", "true");
  syncBodyScrollLock();
}

function isModalOpen(element) {
  return Boolean(element) && !element.classList.contains("is-hidden");
}

function syncBodyScrollLock() {
  document.body.classList.toggle("modal-open", isModalOpen(orderModal));
}

function sanitizeInput(value) {
  return value.replace(/[<>]/g, "").trim();
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeMultilineInput(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getLeadPayloadFromForm(form) {
  const formData = new FormData(form);
  return {
    form_name: formData.get("form_name") || "",
    name: sanitizeInput(String(formData.get("name") || "")),
    phone: sanitizeInput(String(formData.get("phone") || "")),
    email: sanitizeInput(String(formData.get("email") || "")),
    service: sanitizeInput(String(formData.get("service") || "")),
    message: sanitizeMultilineInput(String(formData.get("message") || "")),
    page_url: window.location.href,
    page_title: document.title,
    submitted_at: new Date().toISOString(),
  };
}

function createLeadFingerprint(payload) {
  return [
    String(payload.name || "").toLowerCase(),
    String(payload.phone || "").replace(/\D/g, ""),
    String(payload.email || "").toLowerCase(),
    String(payload.service || "").toLowerCase(),
    String(payload.message || "").toLowerCase(),
  ].join("|");
}

function readRecentLeadCache() {
  try {
    const raw = window.localStorage.getItem(FORM_DUPLICATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch (error) {
    return {};
  }
}

function writeRecentLeadCache(cache) {
  try {
    window.localStorage.setItem(FORM_DUPLICATE_STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    // Ignore storage failures for graceful degradation.
  }
}

function hasRecentLeadDuplicate(payload) {
  const cache = readRecentLeadCache();
  const fingerprint = createLeadFingerprint(payload);
  const savedAt = Number(cache[fingerprint] || 0);
  if (!savedAt) return false;
  return Date.now() - savedAt < FORM_DUPLICATE_TTL_MS;
}

function rememberLeadSubmission(payload) {
  const cache = readRecentLeadCache();
  const now = Date.now();
  const freshCache = Object.fromEntries(
    Object.entries(cache).filter(([, savedAt]) => now - Number(savedAt) < FORM_DUPLICATE_TTL_MS),
  );
  freshCache[createLeadFingerprint(payload)] = now;
  writeRecentLeadCache(freshCache);
}

function getFormServiceConfig() {
  return siteConfig.formService || {};
}

function setFormStatus(form, state, message) {
  const statusNode = form.querySelector(".form-status");
  if (!statusNode) return;

  statusNode.className = "form-status";
  if (!message) {
    statusNode.textContent = "";
    return;
  }

  statusNode.textContent = message;
  statusNode.classList.add("is-visible");
  if (state) {
    statusNode.classList.add(`is-${state}`);
  }
}

function setFormLoading(form, isLoading) {
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return;

  submitButton.disabled = isLoading;
  submitButton.classList.toggle("is-loading", isLoading);
}

async function submitLeadForm(form) {
  const formService = getFormServiceConfig();
  const endpoint = String(formService.endpoint || "").trim();
  const method = String(formService.method || "POST").toUpperCase();
  const accept = formService.accept || "application/json";
  const provider = String(formService.provider || "").trim().toLowerCase();
  const successMessage =
    formService.successMessage || "Ваша заявка принята, ожидайте звонка, мы скоро с вами свяжемся.";
  const loadingMessage = formService.loadingMessage || "Отправляем заявку...";
  const errorMessage =
    formService.errorMessage || "Не удалось отправить заявку. Попробуйте ещё раз позже или свяжитесь с нами по телефону.";
  const missingEndpointMessage =
    formService.missingEndpointMessage || "Форма ещё не подключена к сервису заявок. Укажите endpoint в site-config.js.";
  const redirectHash = formService.redirectHash || "#thank-you";

  if (!endpoint) {
    setFormStatus(form, "error", missingEndpointMessage);
    return false;
  }

  if (form.dataset.submitting === "true") {
    setFormStatus(form, "error", "Заявка уже отправляется. Подождите несколько секунд.");
    return false;
  }

  const lastSubmittedAt = Number(form.dataset.lastSubmittedAt || 0);
  if (lastSubmittedAt && Date.now() - lastSubmittedAt < FORM_COOLDOWN_MS) {
    setFormStatus(form, "error", "Повторная отправка временно недоступна. Подождите и попробуйте ещё раз.");
    return false;
  }

  const formData = new FormData(form);
  const payload = getLeadPayloadFromForm(form);

  if (hasRecentLeadDuplicate(payload)) {
    setFormStatus(form, "error", "Похожая заявка уже была отправлена недавно. Если нужен новый запрос, подождите немного и отправьте снова.");
    return false;
  }

  setFormLoading(form, true);
  setFormStatus(form, "loading", loadingMessage);
  form.dataset.submitting = "true";
  let timeoutId = 0;

  try {
    const controller = new AbortController();
    timeoutId = window.setTimeout(() => controller.abort(), FORM_REQUEST_TIMEOUT_MS);
    const requestOptions =
      provider === "aquablesk-backend" || endpoint === "/api/leads"
        ? {
            method,
            body: JSON.stringify(payload),
            headers: {
              Accept: accept,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          }
        : {
            method,
            body: formData,
            headers: {
              Accept: accept,
            },
            signal: controller.signal,
          };

    const response = await fetch(endpoint, requestOptions);
    window.clearTimeout(timeoutId);

    let responsePayload = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      responsePayload = await response.json().catch(() => null);
    }

    if (!response.ok) {
      const providerError =
        responsePayload?.errors?.map((entry) => entry.message).join(" ") ||
        responsePayload?.error ||
        responsePayload?.message ||
        errorMessage;
      throw new Error(providerError);
    }

    setFormStatus(form, "success", successMessage);
    rememberLeadSubmission(payload);
    form.dataset.lastSubmittedAt = String(Date.now());
    form.reset();
    limitedTexts.forEach((field) => {
      const counter = field.parentElement?.querySelector(".js-char-count");
      if (counter) counter.textContent = "0";
    });
    form.dataset.startedAt = String(Date.now());

    window.setTimeout(() => {
      closeOrderModal();
      if (redirectHash) {
        window.location.hash = redirectHash;
      }
    }, 900);

    return true;
  } catch (error) {
    const resolvedMessage =
      error?.name === "AbortError"
        ? "Сервер отвечает слишком долго. Попробуйте ещё раз чуть позже."
        : (error.message || errorMessage);
    setFormStatus(form, "error", resolvedMessage);
    return false;
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    form.dataset.submitting = "false";
    setFormLoading(form, false);
  }
}

openOrderButtons.forEach((button) => {
  button.addEventListener("click", openOrderModal);
});

closeOrderButtons.forEach((button) => {
  button.addEventListener("click", closeOrderModal);
});

if (orderModal) {
  orderModal.addEventListener("click", (event) => {
    if (event.target === orderModal) {
      closeOrderModal();
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeOrderModal();
    closeCookieConsentModal(false);
  }
});

forms.forEach((form) => {
  form.dataset.startedAt = String(Date.now());
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const elapsed = Date.now() - Number(form.dataset.startedAt || Date.now());
    const honeypot = form.querySelector(".hp-field");
    const nameField = form.querySelector('input[name="name"]');
    const phoneField = form.querySelector('input[name="phone"]');
    const emailField = form.querySelector('input[name="email"]');
    const messageField = form.querySelector('textarea[name="message"]');

    setFormStatus(form, "", "");

    if (honeypot && honeypot.value.trim() !== "") {
      return;
    }

    if (elapsed < 1500) {
      alert("Пожалуйста, заполните форму чуть внимательнее.");
      return;
    }

    if (nameField) {
      nameField.value = sanitizeInput(nameField.value);
      if (nameField.value.length < 2) {
        alert("Укажите имя не короче 2 символов.");
        nameField.focus();
        return;
      }
    }

    if (phoneField) {
      phoneField.value = sanitizeInput(phoneField.value);
      if (!isValidPhone(phoneField.value)) {
        alert("Укажите корректный номер телефона.");
        phoneField.focus();
        return;
      }
    }

    if (emailField) {
      emailField.value = sanitizeInput(emailField.value);
      if (!isValidEmail(emailField.value)) {
        setFormStatus(form, "error", "Укажите корректный e-mail или оставьте поле пустым.");
        emailField.focus();
        return;
      }
    }

    if (messageField) {
      messageField.value = sanitizeInput(messageField.value);
      if (messageField.value.length > 280) {
        alert("Описание не должно превышать 280 символов.");
        messageField.focus();
        return;
      }
    }

    submitLeadForm(form);
  });
});

limitedTexts.forEach((field) => {
  const counter = field.parentElement?.querySelector(".js-char-count");
  const syncCounter = () => {
    if (counter) counter.textContent = String(field.value.length);
  };
  syncCounter();
  field.addEventListener("input", syncCounter);
});

faqItems.forEach((item) => {
  const trigger = item.querySelector(".faq-trigger");
  if (!trigger) return;

  trigger.addEventListener("click", () => {
    const isOpen = item.classList.contains("open");
    faqItems.forEach((entry) => {
      entry.classList.remove("open");
      const button = entry.querySelector(".faq-trigger");
      if (button) button.setAttribute("aria-expanded", "false");
    });
    if (!isOpen) {
      item.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    }
  });
});

document.querySelectorAll(".js-year").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

function initCompareSliders() {
  compareSliders.forEach((slider) => {
    if (slider.dataset.bound === "true") return;
    slider.dataset.bound = "true";

    const range = slider.querySelector(".compare-range");
    const overlay = slider.querySelector(".compare-overlay");
    const divider = slider.querySelector(".compare-divider");
    if (!range || !overlay || !divider) return;

    let dragging = false;

    const updateSlider = (value) => {
      const numericValue = Math.max(0, Math.min(100, Number(value || 0)));
      const safeValue = `${numericValue}%`;
      overlay.style.width = safeValue;
      divider.style.left = safeValue;
      range.value = String(numericValue);
      range.setAttribute("aria-valuenow", String(numericValue));
    };

    const updateFromClientX = (clientX) => {
      const rect = slider.getBoundingClientRect();
      if (!rect.width) return;
      const percent = ((clientX - rect.left) / rect.width) * 100;
      updateSlider(percent);
    };

    const stopDragging = () => {
      dragging = false;
      slider.classList.remove("is-dragging");
    };

    slider.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType !== "touch") return;
      dragging = true;
      slider.classList.add("is-dragging");
      if (slider.setPointerCapture) {
        slider.setPointerCapture(event.pointerId);
      }
      updateFromClientX(event.clientX);
    });

    slider.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      updateFromClientX(event.clientX);
    });

    slider.addEventListener("pointerup", stopDragging);
    slider.addEventListener("pointercancel", stopDragging);
    slider.addEventListener("lostpointercapture", stopDragging);
    range.addEventListener("input", () => updateSlider(range.value));
    range.addEventListener("change", () => updateSlider(range.value));

    updateSlider(range.value || slider.dataset.start || 50);
  });
}

function initReviewSlider() {
  if (!reviewTrack || reviewSliderBound) return;
  reviewSliderBound = true;

  const getStep = () => {
    const firstCard = reviewTrack.querySelector(".review-slide");
    if (!firstCard) return 320;
    const styles = window.getComputedStyle(reviewTrack);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "16") || 16;
    return firstCard.getBoundingClientRect().width + gap;
  };

  const syncReviewNavState = () => {
    const maxScroll = Math.max(0, reviewTrack.scrollWidth - reviewTrack.clientWidth);
    if (reviewPrev) reviewPrev.disabled = reviewTrack.scrollLeft <= 4;
    if (reviewNext) reviewNext.disabled = reviewTrack.scrollLeft >= maxScroll - 4;
  };

  const slideReviews = (direction) => {
    reviewTrack.scrollBy({
      left: getStep() * direction,
      behavior: "smooth",
    });
  };

  if (reviewPrev) {
    reviewPrev.addEventListener("click", () => slideReviews(-1));
  }

  if (reviewNext) {
    reviewNext.addEventListener("click", () => slideReviews(1));
  }

  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;

  const stopDragging = () => {
    isDragging = false;
    reviewTrack.classList.remove("is-dragging");
    syncReviewNavState();
  };

  reviewTrack.addEventListener("pointerdown", (event) => {
    isDragging = true;
    startX = event.clientX;
    startScrollLeft = reviewTrack.scrollLeft;
    reviewTrack.classList.add("is-dragging");
    reviewTrack.setPointerCapture(event.pointerId);
  });

  reviewTrack.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    reviewTrack.scrollLeft = startScrollLeft - delta;
    syncReviewNavState();
  });

  reviewTrack.addEventListener("pointerup", stopDragging);
  reviewTrack.addEventListener("pointercancel", stopDragging);
  reviewTrack.addEventListener("pointerleave", stopDragging);
  reviewTrack.addEventListener("scroll", syncReviewNavState, { passive: true });
  window.addEventListener("resize", syncReviewNavState);
  syncReviewNavState();
}

loadServerPublicConfig().finally(() => {
  applyPublicConfigAndMedia();
  initCompareSliders();
  initReviewSlider();
});

if (scrollTopButton) {
  scrollTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

if (revealSections.length || revealItems.length) {
  if (reduceMotionQuery.matches) {
    revealSections.forEach((section) => section.classList.add("is-visible"));
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          if (entry.target.classList.contains("js-reveal-section")) {
            entry.target
              .querySelectorAll(".reveal-up")
              .forEach((item) => item.classList.add("is-visible"));
          }
          revealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    revealSections.forEach((section) => revealObserver.observe(section));
    revealItems.forEach((item) => {
      if (!item.closest(".js-reveal-section")) {
        revealObserver.observe(item);
      }
    });
  }
}

let parallaxFrame = 0;

function syncParallaxPanels() {
  if (reduceMotionQuery.matches || !parallaxPanels.length) return;
  const viewportHeight = window.innerHeight || 1;
  parallaxPanels.forEach((panel) => {
    const rect = panel.getBoundingClientRect();
    const centerOffset = rect.top + rect.height / 2 - viewportHeight / 2;
    const limitedOffset = Math.max(-14, Math.min(14, centerOffset * -0.035));
    panel.style.setProperty("--parallax-offset", `${limitedOffset}px`);
  });
}

function scheduleParallaxSync() {
  if (parallaxFrame) return;
  parallaxFrame = window.requestAnimationFrame(() => {
    parallaxFrame = 0;
    syncParallaxPanels();
  });
}

if (parallaxPanels.length) {
  syncParallaxPanels();
  window.addEventListener("scroll", scheduleParallaxSync, { passive: true });
  window.addEventListener("resize", scheduleParallaxSync);
}

function bindPremiumCardEffects(cards, { tilt = false } = {}) {
  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!cards.length || reduceMotionQuery.matches || !finePointerQuery.matches) return;

  const resetCard = (card) => {
    card.style.setProperty("--pointer-x", "50%");
    card.style.setProperty("--pointer-y", "50%");
    card.style.setProperty("--fx-x", "50%");
    card.style.setProperty("--fx-y", "50%");
    if (tilt) {
      card.style.setProperty("--fx-tilt-x", "0deg");
      card.style.setProperty("--fx-tilt-y", "0deg");
    }
  };

  cards.forEach((card) => {
    resetCard(card);

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      card.style.setProperty("--pointer-x", `${(x * 100).toFixed(2)}%`);
      card.style.setProperty("--pointer-y", `${(y * 100).toFixed(2)}%`);
      card.style.setProperty("--fx-x", `${(x * 100).toFixed(2)}%`);
      card.style.setProperty("--fx-y", `${(y * 100).toFixed(2)}%`);

      if (tilt) {
        const tiltX = (0.5 - y) * 2.2;
        const tiltY = (x - 0.5) * 2.6;
        card.style.setProperty("--fx-tilt-x", `${tiltX.toFixed(2)}deg`);
        card.style.setProperty("--fx-tilt-y", `${tiltY.toFixed(2)}deg`);
      }
    });

    card.addEventListener("pointerleave", () => resetCard(card));
  });
}

bindPremiumCardEffects(formatCards, { tilt: true });
bindPremiumCardEffects(interactiveCards);

function openCookieConsentModal() {
  if (!cookieConsentModal) return;
  cookieConsentModal.classList.remove("is-hidden");
  cookieConsentModal.setAttribute("aria-hidden", "false");
}

function closeCookieConsentModal(remember = false) {
  if (!cookieConsentModal) return;
  cookieConsentModal.classList.add("is-hidden");
  cookieConsentModal.setAttribute("aria-hidden", "true");
}

function initCookieConsentModal() {
  if (!cookieConsentModal) return;

  openCookieConsentModal();

  if (cookieAcceptButton && !cookieAcceptButton.dataset.cookieBound) {
    cookieAcceptButton.dataset.cookieBound = "true";
    cookieAcceptButton.addEventListener("click", () => {
      closeCookieConsentModal(false);
    });
  }

  cookieCloseButtons.forEach((button) => {
    if (button.dataset.cookieBound) return;
    button.dataset.cookieBound = "true";
    button.addEventListener("click", () => {
      closeCookieConsentModal(false);
    });
  });

  cookieConsentLinks.forEach((link) => {
    if (link.dataset.cookieBound) return;
    link.dataset.cookieBound = "true";
    link.addEventListener("click", () => {
      closeCookieConsentModal(false);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCookieConsentModal, { once: true });
} else {
  initCookieConsentModal();
}
