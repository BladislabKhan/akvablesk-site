const $ = (s, r = document) => r.querySelector(s);
const loginPanel = $("[data-login-panel]");
const dashboard = $("[data-dashboard]");
const loginForm = $("[data-login-form]");
const loginStatus = $("[data-login-status]");
const logoutButton = $("[data-logout]");
const exportButton = $("[data-export-excel]");
const addLeadButton = $("[data-add-lead]");
const reviewIntegrationForm = $("[data-review-integration-form]");
const reviewIntegrationStatus = $("[data-review-integration-status]");
const reviewCardsForm = $("[data-review-cards-form]");
const reviewCardsStatus = $("[data-review-cards-status]");
const qrForm = $("[data-qr-form]");
const qrStatus = $("[data-qr-status]");
const uploadBeforeStatus = $("[data-upload-before-status]");
const uploadAfterStatus = $("[data-upload-after-status]");
const uploadQrYandexStatus = $("[data-upload-qr-yandex-status]");
const uploadQrGisStatus = $("[data-upload-qr-gis-status]");
const beforeAfterForm = $("[data-before-after-form]");
const beforeAfterStatus = $("[data-before-after-status]");
const reviewForm = $("[data-review-form]");
const reviewStatus = $("[data-review-status]");
const reviewResetButton = $("[data-review-reset]");
const reviewsList = $("[data-reviews-list]");
const beforeAfterResetButton = $("[data-before-after-reset]");
const leadsTable = $("[data-leads-table]");
const beforeAfterList = $("[data-before-after-list]");
const adminViewButtons = document.querySelectorAll("[data-admin-view]");
const adminSections = document.querySelectorAll("[data-admin-section]");
const backDashboardButtons = document.querySelectorAll("[data-back-dashboard]");
const leadForm = $("[data-lead-form]");
const leadEmpty = $("[data-lead-empty]");
const leadTitle = $("[data-lead-title]");
const leadMeta = $("[data-lead-meta]");
const leadFormStatus = $("[data-lead-form-status]");
const confirmDispatchButton = $("[data-confirm-dispatch]");
const deleteLeadButton = $("[data-delete-lead]");
const crmSearchInput = $("[data-crm-search]");
const crmStatusFilter = $("[data-crm-status-filter]");

const STORAGE_KEY = "aquablesk_admin_local_store_v3";
const SESSION_KEY = "aquablesk_admin_local_session_v3";
const DEMO_DATA_VERSION = 2;
const CRM_STATUSES = ["новая", "дозвон", "согласовано", "подтверждено", "выезд", "выполнено", "отменено"];
const runtime = { backendAvailable: false };
const state = {
  stats: { leads: 0, clients: 0, reviews: 0, beforeAfter: 0 },
  leads: [],
  clients: [],
  beforeAfter: [],
  reviews: [],
  settings: {},
  selectedLeadId: "",
  selectedClientId: "",
  selectedReviewId: "",
  selectedBeforeAfterId: "",
  currentView: "leads",
  currentUser: null,
  leadDraft: null,
  filters: { search: "", status: "all", clientSearch: "" },
};

const createId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const nowIso = () => new Date().toISOString();
const escapeHtml = (v) => String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const fmt = (v) => { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(d); };
const setStatus = (node, message, stateName = "") => { if (!node) return; node.className = "status"; node.textContent = message || ""; if (stateName) node.classList.add(`is-${stateName}`); };
const toLocal = (v) => { if (!v) return ""; const d = new Date(v); if (Number.isNaN(d.getTime())) return ""; const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const fromLocal = (v) => { if (!v) return ""; const d = new Date(v); return Number.isNaN(d.getTime()) ? "" : d.toISOString(); };
const shortFileLabel = (value, fallback = "Файл не выбран") => {
  if (!value) return fallback;
  const normalized = String(value).replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).pop() || fallback;
};
const setUploadInlineStatus = (node, value, fallback = "Файл не выбран") => {
  if (!node) return;
  node.textContent = shortFileLabel(value, fallback);
};
const getLeadIdFromQuery = () => {
  try {
    return new URLSearchParams(window.location.search).get("lead") || "";
  } catch {
    return "";
  }
};
function statusOf(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (CRM_STATUSES.includes(raw)) return raw;
  if (raw === "new") return "новая";
  if (raw === "in-progress") return "дозвон";
  if (raw === "done") return "выполнено";
  if (raw === "archive") return "отменено";
  return "новая";
}
const lookupKey = (lead) => String(lead.phone || "").replace(/\D/g, "") || String(lead.email || "").trim().toLowerCase();
const historyEntry = ({ actor = "system", action = "", fromStatus = "", toStatus = "", comment = "", scheduledAt = "", confirmed = false, at = "" } = {}) => ({ id: createId(), actor, action, fromStatus, toStatus, comment, scheduledAt, confirmed: Boolean(confirmed), at: at || nowIso() });

function normalizeLead(item = {}) {
  const createdAt = item.createdAt || nowIso();
  const status = statusOf(item.status);
  const history = Array.isArray(item.history) && item.history.length
    ? item.history.map((entry) => ({ ...entry, id: entry.id || createId(), toStatus: statusOf(entry.toStatus || status), at: entry.at || createdAt }))
    : [historyEntry({ actor: "public", action: "Создана заявка", toStatus: status, comment: item.adminComment || item.comment || "", scheduledAt: item.scheduledAt || "", confirmed: item.confirmed, at: createdAt })];
  return {
    id: item.id || createId(),
    clientId: item.clientId || "",
    createdAt,
    updatedAt: item.updatedAt || createdAt,
    name: item.name || "",
    phone: item.phone || "",
    email: item.email || "",
    service: item.service || "",
    message: item.message || "",
    source: item.source || "site",
    status,
    confirmed: Boolean(item.confirmed),
    scheduledAt: item.scheduledAt || "",
    adminComment: item.adminComment ?? item.comment ?? "",
    history,
  };
}

function normalizeClient(item = {}) {
  const leadIds = Array.isArray(item.leadIds) ? item.leadIds.filter(Boolean) : [];
  return {
    id: item.id || createId(),
    lookupKey: item.lookupKey || "",
    name: item.name || "",
    phone: item.phone || "",
    email: item.email || "",
    firstLeadAt: item.firstLeadAt || "",
    lastLeadAt: item.lastLeadAt || "",
    lastService: item.lastService || "",
    leadsCount: Number(item.leadsCount || leadIds.length || 0),
    leadIds,
    lastStatus: statusOf(item.lastStatus || "новая"),
    scheduledAt: item.scheduledAt || "",
    confirmed: Boolean(item.confirmed),
    lastComment: item.lastComment || "",
    source: item.source || "site",
    lastLeadId: item.lastLeadId || "",
    createdAt: item.createdAt || nowIso(),
    updatedAt: item.updatedAt || nowIso(),
  };
}

function normalizeReview(item = {}) {
  return {
    id: item.id || createId(),
    author: item.author || "",
    source: item.source || "",
    rating: Number(item.rating || 5),
    text: item.text || "",
    published: item.published !== false,
    publishedAt: item.publishedAt || item.createdAt || nowIso(),
    link: item.link || "",
    qrBinding: item.qrBinding || "",
    createdAt: item.createdAt || nowIso(),
  };
}

function defaultStore() {
  const shiftIso = (days = 0, hours = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(d.getHours() + hours);
    return d.toISOString();
  };
  const demoLeads = [
    { name: "Анна Кузнецова", phone: "+7 (914) 552-18-40", email: "anna.kuznetsova@example.com", service: "Генеральная уборка", message: "Нужно убрать квартиру 54 м² перед приездом родителей.", source: "site", status: "новая", confirmed: false, scheduledAt: "", adminComment: "Перезвонить после 18:00", createdAt: shiftIso(-1, -5), updatedAt: shiftIso(-1, -5) },
    { name: "Дмитрий Орлов", phone: "+7 (924) 220-44-18", email: "orlov.office@example.com", service: "Уборка после ремонта", message: "Офис после косметического ремонта, 82 м².", source: "yandex", status: "дозвон", confirmed: false, scheduledAt: "", adminComment: "Не ответил, повторный звонок завтра в 11:00", createdAt: shiftIso(-2, -3), updatedAt: shiftIso(-1, -1) },
    { name: "Елена Соколова", phone: "+7 (914) 889-31-20", email: "sokolova.home@example.com", service: "Поддерживающая уборка", message: "Интересует раз в неделю по пятницам.", source: "max", status: "согласовано", confirmed: false, scheduledAt: shiftIso(2, 1), adminComment: "Согласована стоимость, ждёт подтверждения выезда", createdAt: shiftIso(-3, -2), updatedAt: shiftIso(-1, -4) },
    { name: "Игорь Власов", phone: "+7 (909) 811-73-55", email: "", service: "Мытьё окон", message: "3 окна и балкон, 9 этаж.", source: "2gis", status: "подтверждено", confirmed: true, scheduledAt: shiftIso(1, 3), adminComment: "Клиент подтвердил выезд, доступ к парковке открыт", createdAt: shiftIso(-4, -1), updatedAt: shiftIso(-1, 0) },
    { name: "Мария Петрова", phone: "+7 (924) 105-66-92", email: "m.petrov@example.com", service: "Уборка кухни", message: "Нужна глубокая чистка кухни и духовки.", source: "site", status: "выезд", confirmed: true, scheduledAt: shiftIso(0, 2), adminComment: "Бригада уже на объекте", createdAt: shiftIso(-5, -2), updatedAt: shiftIso(0, 1) },
    { name: "Сергей Иванов", phone: "+7 (914) 347-90-11", email: "ivanov.family@example.com", service: "Генеральная уборка", message: "Дом 120 м² после гостей.", source: "call", status: "выполнено", confirmed: true, scheduledAt: shiftIso(-2, 5), adminComment: "Клиент доволен, попросил напомнить о регулярной уборке", createdAt: shiftIso(-8, -1), updatedAt: shiftIso(-2, 1) },
    { name: "Ольга Романова", phone: "+7 (914) 601-25-70", email: "romanova@example.com", service: "Санузел", message: "Нужна срочная уборка санузла сегодня вечером.", source: "max", status: "отменено", confirmed: false, scheduledAt: shiftIso(0, 6), adminComment: "Клиент отменил заявку, уехал из города", createdAt: shiftIso(-1, -8), updatedAt: shiftIso(-1, -2) },
    { name: "Елена Соколова", phone: "+7 (914) 889-31-20", email: "sokolova.home@example.com", service: "Поддерживающая уборка", message: "Повторная запись на следующую неделю.", source: "max", status: "новая", confirmed: false, scheduledAt: "", adminComment: "Повторный клиент", createdAt: shiftIso(0, -4), updatedAt: shiftIso(0, -4) },
    { name: "Татьяна Миронова", phone: "+7 (924) 411-09-83", email: "", service: "Уборка после ремонта", message: "Студия 38 м², много строительной пыли.", source: "site", status: "согласовано", confirmed: false, scheduledAt: shiftIso(3, 4), adminComment: "Ожидает финального звонка утром", createdAt: shiftIso(-2, -6), updatedAt: shiftIso(-1, -3) },
    { name: "Алексей Новиков", phone: "+7 (914) 773-48-29", email: "novikov.shop@example.com", service: "Коммерческое помещение", message: "Нужна уборка магазина до открытия.", source: "yandex", status: "подтверждено", confirmed: true, scheduledAt: shiftIso(1, 0), adminComment: "Выезд в 07:30, нужен отчёт после уборки", createdAt: shiftIso(-3, -5), updatedAt: shiftIso(-1, -2) },
    { name: "Наталья Белова", phone: "+7 (909) 302-17-65", email: "belova@example.com", service: "Мытьё окон", message: "Частный дом, 11 окон.", source: "2gis", status: "выполнено", confirmed: true, scheduledAt: shiftIso(-6, 2), adminComment: "Повторно обратится осенью", createdAt: shiftIso(-10, -4), updatedAt: shiftIso(-6, -1) },
    { name: "Максим Фёдоров", phone: "+7 (924) 990-12-48", email: "", service: "Поддерживающая уборка", message: "Интересует договор на 2 раза в месяц.", source: "site", status: "дозвон", confirmed: false, scheduledAt: "", adminComment: "Запросил коммерческое предложение на почту", createdAt: shiftIso(-1, -10), updatedAt: shiftIso(0, -7) },
    { name: "Виктория Демина", phone: "+7 (914) 412-63-17", email: "demina@example.com", service: "Генеральная уборка", message: "Нужна уборка перед сдачей квартиры.", source: "site", status: "подтверждено", confirmed: true, scheduledAt: shiftIso(4, 2), adminComment: "Ключи передаст консьерж", createdAt: shiftIso(-4, -7), updatedAt: shiftIso(-2, -2) },
    { name: "Павел Никитин", phone: "+7 (924) 580-77-31", email: "", service: "Мытьё окон", message: "Окна в офисе, 2 этаж.", source: "call", status: "новая", confirmed: false, scheduledAt: "", adminComment: "Новый входящий звонок", createdAt: shiftIso(0, -2), updatedAt: shiftIso(0, -2) },
    { name: "Светлана Гришина", phone: "+7 (914) 745-28-64", email: "grishina@example.com", service: "Уборка кухни", message: "Кухня после праздника и жир на фасадах.", source: "yandex", status: "выполнено", confirmed: true, scheduledAt: shiftIso(-3, 3), adminComment: "Попросила отправить прайс на регулярную уборку", createdAt: shiftIso(-7, -6), updatedAt: shiftIso(-3, -1) },
    { name: "Константин Белов", phone: "+7 (909) 614-92-08", email: "belov.office@example.com", service: "Коммерческое помещение", message: "Уборка зала и санузла в шоуруме.", source: "2gis", status: "согласовано", confirmed: false, scheduledAt: shiftIso(5, 1), adminComment: "Ждёт финального подтверждения по времени", createdAt: shiftIso(-2, -9), updatedAt: shiftIso(-1, -5) },
    { name: "Алёна Сидорова", phone: "+7 (924) 300-15-40", email: "sidorova@example.com", service: "Санузел", message: "Уборка после замены плитки.", source: "max", status: "отменено", confirmed: false, scheduledAt: shiftIso(1, 6), adminComment: "Перенесла на следующий месяц", createdAt: shiftIso(-5, -3), updatedAt: shiftIso(-1, -6) },
    { name: "Роман Лебедев", phone: "+7 (914) 234-91-70", email: "", service: "Поддерживающая уборка", message: "Нужен тестовый первый выезд.", source: "site", status: "выезд", confirmed: true, scheduledAt: shiftIso(0, 5), adminComment: "Бригада едет, клиент на связи", createdAt: shiftIso(-2, -4), updatedAt: shiftIso(0, 2) },
  ].map((item) => normalizeLead({ id: createId(), ...item }));
  return {
    demoVersion: DEMO_DATA_VERSION,
    settings: {
      messenger: { url: "https://max.ru/" },
      site: { phoneDisplay: "+7 (914) 582-63-17" },
      notifications: { ownerEmail: "admin@aquablesk.local", sendClientConfirmation: false },
      reviewCards: {
        gis: { source: "2gis", sourceLabel: "2ГИС", reviewUrl: "https://2gis.ru/", placeUrl: "https://2gis.ru/", buttonUrl: "https://2gis.ru/", qrUrl: "https://2gis.ru/", rating: 4.9, reviewsCount: 48, icon: "2GIS", qrImage: "../assets/qr-2gis.svg" },
        yandex: { source: "yandex", sourceLabel: "Яндекс Карты", reviewUrl: "https://yandex.ru/maps/", placeUrl: "https://yandex.ru/maps/", buttonUrl: "https://yandex.ru/maps/", qrUrl: "https://yandex.ru/maps/", rating: 4.8, reviewsCount: 37, icon: "Я", qrImage: "../assets/qr-yandex.svg" },
      },
      reviewsIntegration: { yandexWidgetUrl: "", yandexBusinessUrl: "https://yandex.ru/maps/", gisBusinessUrl: "https://2gis.ru/" },
    },
    leads: demoLeads,
    clients: [],
    beforeAfter: [{ id: createId(), title: "Диван", before: "../assets/before-living-gray-2026.jpg", after: "../assets/after-living-gray-2026.jpg" }],
      reviews: [
        normalizeReview({ author: "Елена", source: "Яндекс Карты", rating: 5, text: "Очень аккуратно и спокойно выполнили уборку.", published: true, publishedAt: nowIso(), qrBinding: "yandex", link: "https://yandex.ru/maps/" }),
        normalizeReview({ author: "Дмитрий", source: "2ГИС", rating: 5, text: "Понравилась пунктуальность и результат.", published: true, publishedAt: nowIso(), qrBinding: "gis", link: "https://2gis.ru/" }),
      ],
    users: [
      { id: "admin", username: "admin", password: "admin", email: "admin@aquablesk.local", role: "admin" },
      { id: "moderator", username: "moderator", password: "moderator", email: "moderator@aquablesk.local", role: "moderator" },
    ],
  };
}

function shouldReseedDemoStore(store = {}) {
  const leads = Array.isArray(store.leads) ? store.leads : [];
  const hasLegacySingleDemo = leads.length <= 2 && leads.some((item) => {
    const name = String(item?.name || "").toLowerCase();
    return name.includes("тест") || name === "клиент";
  });
  return Number(store.demoVersion || 0) < DEMO_DATA_VERSION || hasLegacySingleDemo;
}

function hydrateClients(store) {
  const map = new Map(), nextClients = [];
  (Array.isArray(store.clients) ? store.clients : []).map(normalizeClient).forEach((client) => { map.set(client.id, client); if (client.lookupKey) map.set(`lookup:${client.lookupKey}`, client); });
  store.leads = store.leads.map(normalizeLead);
  store.leads.forEach((lead) => {
    const key = lookupKey(lead);
    let client = (lead.clientId && map.get(lead.clientId)) || (key && map.get(`lookup:${key}`));
    if (!client) {
      client = normalizeClient({ id: lead.clientId || createId(), lookupKey: key, createdAt: lead.createdAt });
      map.set(client.id, client);
      if (key) map.set(`lookup:${key}`, client);
    }
    if (!nextClients.find((x) => x.id === client.id)) nextClients.push(client);
    Object.assign(client, { lookupKey: key, name: lead.name, phone: lead.phone, email: lead.email, firstLeadAt: client.firstLeadAt || lead.createdAt, lastLeadAt: lead.updatedAt || lead.createdAt, lastService: lead.service, lastStatus: lead.status, scheduledAt: lead.scheduledAt || "", confirmed: Boolean(lead.confirmed), lastComment: lead.adminComment || "", source: lead.source || "site", lastLeadId: lead.id, updatedAt: nowIso() });
    if (!client.leadIds.includes(lead.id)) client.leadIds.push(lead.id);
    client.leadsCount = client.leadIds.length;
    lead.clientId = client.id;
  });
  store.clients = nextClients.map(normalizeClient).sort((a, b) => new Date(b.lastLeadAt || 0) - new Date(a.lastLeadAt || 0));
}

function loadStore() {
  try {
    const defaults = defaultStore();
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw ? JSON.parse(raw) : defaults;
    const seedBase = shouldReseedDemoStore(base) ? { ...defaults, settings: { ...(base.settings || defaults.settings) }, users: Array.isArray(base.users) && base.users.length ? base.users : defaults.users } : base;
    const store = {
      demoVersion: DEMO_DATA_VERSION,
      settings: { ...defaults.settings, ...(seedBase.settings || {}), site: { ...defaults.settings.site, ...(seedBase.settings?.site || {}) }, messenger: { ...defaults.settings.messenger, ...(seedBase.settings?.messenger || {}) }, notifications: { ...defaults.settings.notifications, ...(seedBase.settings?.notifications || {}) }, reviewCards: { gis: { ...defaults.settings.reviewCards.gis, ...(seedBase.settings?.reviewCards?.gis || {}) }, yandex: { ...defaults.settings.reviewCards.yandex, ...(seedBase.settings?.reviewCards?.yandex || {}) } }, reviewsIntegration: { ...defaults.settings.reviewsIntegration, ...(seedBase.settings?.reviewsIntegration || {}) } },
      leads: Array.isArray(seedBase.leads) && seedBase.leads.length ? seedBase.leads.map(normalizeLead) : defaults.leads,
      clients: Array.isArray(seedBase.clients) ? seedBase.clients.map(normalizeClient) : [],
      beforeAfter: Array.isArray(seedBase.beforeAfter) ? seedBase.beforeAfter : defaults.beforeAfter,
      reviews: Array.isArray(seedBase.reviews) ? seedBase.reviews.map(normalizeReview) : defaults.reviews,
      users: Array.isArray(seedBase.users) && seedBase.users.length ? seedBase.users : defaults.users,
    };
    hydrateClients(store);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  } catch {
    const store = defaultStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  }
}

let localStore = loadStore();
const saveStore = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(localStore));

async function probeBackend() {
  try {
    const response = await fetch("/api/admin/session", { method: "GET", credentials: "same-origin", headers: { Accept: "application/json" } });
    runtime.backendAvailable = response.status === 200 || response.status === 401;
  } catch {
    runtime.backendAvailable = false;
  }
}

async function liveApi(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
  if (!response.ok) throw new Error(payload.error || payload.message || "Ошибка запроса");
  return payload;
}

async function api(url, options = {}) {
  if (!runtime.backendAvailable) throw new Error("__LOCAL_MODE__");
  try {
    return await liveApi(url, options);
  } catch (error) {
    if (error instanceof TypeError || String(error.message || "").includes("Failed to fetch")) {
      runtime.backendAvailable = false;
      throw new Error("__LOCAL_MODE__");
    }
    throw error;
  }
}

function fillSettings(settings) {
  if (reviewIntegrationForm) {
    reviewIntegrationForm.elements.yandexBusinessUrl.value = settings.reviewsIntegration?.yandexBusinessUrl || "";
    reviewIntegrationForm.elements.gisBusinessUrl.value = settings.reviewsIntegration?.gisBusinessUrl || "";
    reviewIntegrationForm.elements.yandexWidgetUrl.value = settings.reviewsIntegration?.yandexWidgetUrl || "";
  }
  if (reviewCardsForm) {
    reviewCardsForm.elements.gisTitle.value = settings.reviewCards?.gis?.title || "";
    reviewCardsForm.elements.gisText.value = settings.reviewCards?.gis?.text || "";
    reviewCardsForm.elements.gisButtonLabel.value = settings.reviewCards?.gis?.buttonLabel || "";
    reviewCardsForm.elements.gisSource.value = settings.reviewCards?.gis?.source || "2gis";
    reviewCardsForm.elements.gisSourceLabel.value = settings.reviewCards?.gis?.sourceLabel || "";
    reviewCardsForm.elements.gisButtonUrl.value = settings.reviewCards?.gis?.buttonUrl || "";
    reviewCardsForm.elements.gisReviewUrl.value = settings.reviewCards?.gis?.placeUrl || settings.reviewCards?.gis?.reviewUrl || "";
    reviewCardsForm.elements.gisRating.value = settings.reviewCards?.gis?.rating || "";
    reviewCardsForm.elements.gisReviewsCount.value = settings.reviewCards?.gis?.reviewsCount || "";
    reviewCardsForm.elements.gisIcon.value = settings.reviewCards?.gis?.icon || "";
    reviewCardsForm.elements.gisOpenInNewTab.checked = settings.reviewCards?.gis?.openInNewTab !== false;
    reviewCardsForm.elements.yandexTitle.value = settings.reviewCards?.yandex?.title || "";
    reviewCardsForm.elements.yandexText.value = settings.reviewCards?.yandex?.text || "";
    reviewCardsForm.elements.yandexButtonLabel.value = settings.reviewCards?.yandex?.buttonLabel || "";
    reviewCardsForm.elements.yandexSource.value = settings.reviewCards?.yandex?.source || "yandex";
    reviewCardsForm.elements.yandexSourceLabel.value = settings.reviewCards?.yandex?.sourceLabel || "";
    reviewCardsForm.elements.yandexButtonUrl.value = settings.reviewCards?.yandex?.buttonUrl || "";
    reviewCardsForm.elements.yandexReviewUrl.value = settings.reviewCards?.yandex?.placeUrl || settings.reviewCards?.yandex?.reviewUrl || "";
    reviewCardsForm.elements.yandexRating.value = settings.reviewCards?.yandex?.rating || "";
    reviewCardsForm.elements.yandexReviewsCount.value = settings.reviewCards?.yandex?.reviewsCount || "";
    reviewCardsForm.elements.yandexIcon.value = settings.reviewCards?.yandex?.icon || "";
    reviewCardsForm.elements.yandexOpenInNewTab.checked = settings.reviewCards?.yandex?.openInNewTab !== false;
  }
  if (qrForm) {
    qrForm.elements.yandexQrImage.value = settings.reviewCards?.yandex?.qrImage || "";
    qrForm.elements.gisQrImage.value = settings.reviewCards?.gis?.qrImage || "";
    setUploadInlineStatus(uploadQrYandexStatus, qrForm.elements.yandexQrImage.value);
    setUploadInlineStatus(uploadQrGisStatus, qrForm.elements.gisQrImage.value);
  }
}

function syncPayload(payload) {
  state.stats = { leads: Number(payload.stats?.leads || 0), clients: Number(payload.stats?.clients || 0), reviews: Number(payload.stats?.reviews || 0), beforeAfter: Number(payload.stats?.beforeAfter || 0) };
  state.leads = (payload.leads || []).map(normalizeLead);
  state.clients = (payload.clients || []).map(normalizeClient);
  state.beforeAfter = payload.beforeAfter || [];
  state.reviews = (payload.reviews || []).map(normalizeReview);
  state.settings = payload.settings || {};
  const queryLeadId = getLeadIdFromQuery();
  if (queryLeadId && state.leads.some((x) => x.id === queryLeadId)) {
    state.selectedLeadId = queryLeadId;
  }
  if (!state.selectedLeadId || !state.leads.some((x) => x.id === state.selectedLeadId)) state.selectedLeadId = state.leads[0]?.id || "";
  const selectedLead = state.leads.find((x) => x.id === state.selectedLeadId);
  if (selectedLead?.clientId) state.selectedClientId = selectedLead.clientId;
  if (!state.selectedClientId || !state.clients.some((x) => x.id === state.selectedClientId)) state.selectedClientId = state.clients[0]?.id || "";
  if (!state.selectedReviewId || !state.reviews.some((x) => x.id === state.selectedReviewId)) state.selectedReviewId = "";
  if (!state.selectedBeforeAfterId || !state.beforeAfter.some((x) => x.id === state.selectedBeforeAfterId)) state.selectedBeforeAfterId = "";
}

function localPayload() {
  hydrateClients(localStore);
  saveStore();
  return { stats: { leads: localStore.leads.length, clients: localStore.clients.length, reviews: localStore.reviews.length, beforeAfter: localStore.beforeAfter.length }, leads: localStore.leads, clients: localStore.clients, settings: localStore.settings, beforeAfter: localStore.beforeAfter, reviews: localStore.reviews };
}

function populateFilters() {
  if (crmStatusFilter) crmStatusFilter.innerHTML = `<option value="all">Все статусы</option>${CRM_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join("")}`;
}

function filteredLeads() {
  const search = state.filters.search.trim().toLowerCase();
  let items = [...state.leads];
  if (search) items = items.filter((item) => [item.name, item.phone, item.email, item.service, item.source, item.message, item.adminComment].join(" ").toLowerCase().includes(search));
  if (state.filters.status !== "all") items = items.filter((item) => statusOf(item.status) === state.filters.status);
  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return items;
}

function badge(status) { return `status-badge status-${statusOf(status).replace(/[^a-zа-яё0-9]+/gi, "-")}`; }
function renderStats() {}

function renderLeads() {
  const items = filteredLeads();
  if (!leadsTable) return;
  if (!items.length) { leadsTable.innerHTML = `<tr><td colspan="6"><div class="empty-state">По текущим фильтрам заявок не найдено.</div></td></tr>`; return; }
  leadsTable.innerHTML = items.map((item) => `<tr class="${item.id === state.selectedLeadId ? "is-selected" : ""}"><td>${escapeHtml(fmt(item.createdAt))}</td><td><strong>${escapeHtml(item.name || "Без имени")}</strong><div class="table-subline">${escapeHtml(item.phone || "—")}</div></td><td><strong>${escapeHtml(item.service || "—")}</strong><div class="table-subline">${escapeHtml(item.email || "")}</div></td><td><span class="${badge(item.status)}">${escapeHtml(statusOf(item.status))}</span></td><td>${escapeHtml(item.scheduledAt ? fmt(item.scheduledAt) : "—")}</td><td><div class="list-item__actions"><button class="button secondary button-sm" type="button" data-edit-lead="${item.id}">Открыть</button></div></td></tr>`).join("");
}

function renderLeadEditor() {
  if (!leadForm || !leadEmpty) return;
  const lead = state.leads.find((x) => x.id === state.selectedLeadId) || state.leadDraft;
  if (!lead) { leadForm.classList.add("is-hidden"); leadEmpty.classList.remove("is-hidden"); setStatus(leadFormStatus, ""); return; }
  leadEmpty.classList.add("is-hidden");
  leadForm.classList.remove("is-hidden");
  leadForm.elements.leadId.value = lead.id || "";
  leadForm.elements.name.value = lead.name || "";
  leadForm.elements.phone.value = lead.phone || "";
  leadForm.elements.email.value = lead.email || "";
  leadForm.elements.service.value = lead.service || "";
  leadForm.elements.status.value = statusOf(lead.status);
  leadForm.elements.scheduledAt.value = toLocal(lead.scheduledAt);
  leadForm.elements.leadInfoId.value = lead.id || "Будет присвоен после сохранения";
  leadForm.elements.confirmed.checked = Boolean(lead.confirmed);
  leadForm.elements.comment.value = lead.adminComment || "";
  leadForm.elements.message.value = lead.message || "";
  if (leadTitle) leadTitle.textContent = lead.id ? "Заявка" : "Новая заявка";
  if (leadMeta) leadMeta.innerHTML = lead.id ? `<div class="meta-chip">Дата создания: ${escapeHtml(fmt(lead.createdAt))}</div><div class="meta-chip">Дата обновления: ${escapeHtml(fmt(lead.updatedAt))}</div><div class="meta-chip">ID заявки: ${escapeHtml(lead.id || "—")}</div>` : `<div class="meta-chip">Новая заявка</div><div class="meta-chip">После сохранения появится в панели заявок</div>`;
}

function renderBeforeAfter(items) {
  if (!beforeAfterList) return;
  beforeAfterList.innerHTML = items.map((item, index) => `<article class="list-item ${item.id === state.selectedBeforeAfterId ? "is-selected" : ""}"><div class="list-item__head"><strong>${escapeHtml(item.title)}</strong><div class="list-item__actions"><button class="button secondary button-sm" type="button" data-edit-before-after="${item.id}">Изменить</button><button class="button ghost button-sm" type="button" data-move-before-after="${item.id}" data-direction="-1" ${index === 0 ? "disabled" : ""}>Выше</button><button class="button ghost button-sm" type="button" data-move-before-after="${item.id}" data-direction="1" ${index === items.length - 1 ? "disabled" : ""}>Ниже</button><button class="button ghost button-sm" type="button" data-delete-before-after="${item.id}">Удалить</button></div></div><div class="list-item__meta"><div>До: ${escapeHtml(item.before)}</div><div>После: ${escapeHtml(item.after)}</div></div></article>`).join("");
}

function renderReviews() {
  if (!reviewsList) return;
  reviewsList.innerHTML = state.reviews.length ? state.reviews.map((item, index) => `<article class="list-item ${item.id === state.selectedReviewId ? "is-selected" : ""}"><div class="list-item__head"><strong>${escapeHtml(item.author || "Без имени")}</strong><div class="list-item__actions"><span class="tag">${escapeHtml(item.source || "Источник")}</span><button class="button secondary button-sm" type="button" data-edit-review="${item.id}">Изменить</button><button class="button ghost button-sm" type="button" data-toggle-review="${item.id}">${item.published ? "Скрыть" : "Показать"}</button><button class="button ghost button-sm" type="button" data-move-review="${item.id}" data-direction="-1" ${index === 0 ? "disabled" : ""}>Выше</button><button class="button ghost button-sm" type="button" data-move-review="${item.id}" data-direction="1" ${index === state.reviews.length - 1 ? "disabled" : ""}>Ниже</button><button class="button ghost button-sm" type="button" data-delete-review="${item.id}">Удалить</button></div></div><div class="list-item__meta"><div>Оценка: ${escapeHtml(String(item.rating || 5))}/5</div><div>Дата: ${escapeHtml(item.publishedAt ? fmt(item.publishedAt) : "—")}</div><div>QR: ${escapeHtml(item.qrBinding || "—")}</div><div>Статус: ${item.published ? "Опубликован" : "Скрыт"}</div><div>${escapeHtml(item.text || "")}</div></div></article>`).join("") : `<div class="empty-state">Отзывов пока нет.</div>`;
}

function fillReviewForm(item = null) {
  if (!reviewForm) return;
  reviewForm.elements.reviewId.value = item?.id || "";
  reviewForm.elements.author.value = item?.author || "";
  reviewForm.elements.source.value = item?.source || "";
  reviewForm.elements.rating.value = item?.rating || 5;
  reviewForm.elements.publishedAt.value = item?.publishedAt ? String(item.publishedAt).slice(0, 10) : "";
  reviewForm.elements.link.value = item?.link || "";
  reviewForm.elements.qrBinding.value = item?.qrBinding || "";
  reviewForm.elements.text.value = item?.text || "";
  reviewForm.elements.published.checked = item ? item.published !== false : true;
}

function fillBeforeAfterForm(item = null) {
  if (!beforeAfterForm) return;
  beforeAfterForm.elements.itemId.value = item?.id || "";
  beforeAfterForm.elements.title.value = item?.title || "";
  beforeAfterForm.elements.before.value = item?.before || "";
  beforeAfterForm.elements.after.value = item?.after || "";
  setUploadInlineStatus(uploadBeforeStatus, beforeAfterForm.elements.before.value);
  setUploadInlineStatus(uploadAfterStatus, beforeAfterForm.elements.after.value);
}

function getAdminViewFromHash() {
  const hash = String(window.location.hash || "").replace(/^#/, "");
  const match = hash.match(/^view-(leads|photos|reviews|settings)$/);
  return match ? match[1] : "leads";
}

function isAdminRole() {
  return (state.currentUser?.role || "admin") === "admin";
}

function normalizeViewForRole(view) {
  if (!isAdminRole() && view === "reviews") return "leads";
  return view;
}

function applyRoleUi() {
  dashboard?.classList.toggle("is-moderator", !isAdminRole());
}

function applyAdminView(view) {
  const safeView = normalizeViewForRole(view);
  state.currentView = safeView;
  adminViewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminView === safeView);
  });
  adminSections.forEach((section) => {
    const sectionView = section.dataset.adminSection;
    const hiddenByRole = !isAdminRole() && sectionView === "reviews";
    section.classList.toggle("is-hidden", hiddenByRole || sectionView !== safeView);
  });
}

function setAdminViewRoute(view, replace = false) {
  const safeView = normalizeViewForRole(view);
  const nextHash = `#view-${safeView}`;
  if (replace) {
    history.replaceState({ view: safeView }, "", nextHash);
  } else {
    history.pushState({ view: safeView }, "", nextHash);
  }
  applyAdminView(safeView);
}

  async function loadDashboard() {
    let payload;
    if (runtime.backendAvailable) {
      try {
        const requests = [api("/api/admin/dashboard"), api("/api/admin/leads"), api("/api/admin/clients"), api("/api/admin/before-after"), api("/api/admin/reviews")];
        if (isAdminRole()) requests.push(api("/api/admin/settings"));
        const responses = await Promise.all(requests);
        const [dashboardData, leadsData, clientsData, beforeAfterData, reviewsData, settingsData] = responses;
        payload = { stats: dashboardData.stats || {}, leads: leadsData.items || [], clients: clientsData.items || [], settings: settingsData || {}, beforeAfter: beforeAfterData.items || [], reviews: reviewsData.items || [] };
      } catch (error) {
        if (error.message !== "__LOCAL_MODE__") throw error;
        payload = localPayload();
    }
  } else {
    payload = localPayload();
  }
    syncPayload(payload);
    fillSettings(state.settings);
    populateFilters();
    renderStats();
    renderLeads();
    renderLeadEditor();
    renderBeforeAfter(state.beforeAfter);
    renderReviews();
    fillBeforeAfterForm(state.beforeAfter.find((item) => item.id === state.selectedBeforeAfterId) || null);
    applyRoleUi();
    applyAdminView(getAdminViewFromHash());
  }

async function checkSession() {
  if (runtime.backendAvailable) {
    try {
      const sessionPayload = await api("/api/admin/session", { method: "GET", headers: {} });
      state.currentUser = sessionPayload.user || null;
      loginPanel.classList.add("is-hidden");
      dashboard.classList.remove("is-hidden");
      await loadDashboard();
      return;
    } catch (error) {
      if (error.message !== "__LOCAL_MODE__") { loginPanel.classList.remove("is-hidden"); dashboard.classList.add("is-hidden"); return; }
    }
  }
  const localSession = localStorage.getItem(SESSION_KEY);
  if (localSession) {
    const localUser = (localStore.users || []).find((item) => item.username === localSession) || null;
    state.currentUser = localUser || { username: "admin", role: "admin" };
    loginPanel.classList.add("is-hidden");
    dashboard.classList.remove("is-hidden");
    await loadDashboard();
    return;
  }
  state.currentUser = null;
  loginPanel.classList.remove("is-hidden");
  dashboard.classList.add("is-hidden");
}

async function uploadFile(file) {
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Не удалось прочитать файл")); reader.readAsDataURL(file); });
  if (!runtime.backendAvailable) return dataUrl;
  try { const payload = await api("/api/admin/upload", { method: "POST", body: JSON.stringify({ fileName: file.name, dataUrl }) }); return payload.path; }
  catch (error) { if (error.message === "__LOCAL_MODE__") return dataUrl; throw error; }
}

function updateLocalLead(payload) {
  const lead = localStore.leads.find((item) => item.id === payload.leadId);
  if (!lead) return;
  const previousStatus = lead.status;
  Object.assign(lead, { name: payload.name, phone: payload.phone, email: payload.email, service: payload.service, source: payload.source || "site", status: statusOf(payload.status), scheduledAt: payload.scheduledAt, confirmed: Boolean(payload.confirmed), adminComment: payload.comment, message: payload.message, updatedAt: nowIso() });
  lead.history = [historyEntry({ actor: "admin", action: "Обновлена CRM-карточка", fromStatus: previousStatus, toStatus: lead.status, comment: lead.adminComment, scheduledAt: lead.scheduledAt, confirmed: lead.confirmed }), ...(lead.history || [])];
  hydrateClients(localStore);
  saveStore();
}

function deleteLocalLead(leadId) {
  localStore.leads = localStore.leads.filter((item) => item.id !== leadId);
  hydrateClients(localStore);
  saveStore();
}

function buildLeadPayload() {
  const existingLead = state.leads.find((item) => item.id === leadForm.elements.leadId.value) || state.leadDraft;
  return { leadId: leadForm.elements.leadId.value, name: leadForm.elements.name.value.trim(), phone: leadForm.elements.phone.value.trim(), email: leadForm.elements.email.value.trim(), service: leadForm.elements.service.value.trim(), source: existingLead?.source || "site", status: leadForm.elements.status.value, scheduledAt: fromLocal(leadForm.elements.scheduledAt.value), confirmed: leadForm.elements.confirmed.checked, comment: leadForm.elements.comment.value.trim(), message: leadForm.elements.message.value.trim() };
}

function createEmptyLeadDraft() {
  return {
    id: "",
    name: "",
    phone: "",
    email: "",
    service: "",
    source: "site",
    status: "новая",
    confirmed: false,
    scheduledAt: "",
    adminComment: "",
    message: "",
    createdAt: "",
    updatedAt: "",
    history: [],
  };
}

async function persistLead(payload) {
  if (!payload.leadId) {
    if (runtime.backendAvailable) {
      try {
        const created = await api("/api/admin/leads", { method: "POST", body: JSON.stringify({ name: payload.name, phone: payload.phone, email: payload.email, service: payload.service, source: payload.source, status: payload.status, scheduledAt: payload.scheduledAt, confirmed: payload.confirmed, comment: payload.comment, message: payload.message }) });
        state.leadDraft = null;
        await loadDashboard();
        if (created.item?.id) {
          state.selectedLeadId = created.item.id;
        }
        return;
      } catch (error) {
        if (error.message !== "__LOCAL_MODE__") throw error;
      }
    }
    const createdLead = normalizeLead({ id: createId(), name: payload.name, phone: payload.phone, email: payload.email, service: payload.service, source: payload.source, status: payload.status, scheduledAt: payload.scheduledAt, confirmed: payload.confirmed, adminComment: payload.comment, message: payload.message, createdAt: nowIso(), updatedAt: nowIso() });
    createdLead.history = [historyEntry({ actor: "admin", action: "Создана заявка вручную", toStatus: createdLead.status, comment: createdLead.adminComment, scheduledAt: createdLead.scheduledAt, confirmed: createdLead.confirmed })];
    localStore.leads = [createdLead, ...localStore.leads];
    hydrateClients(localStore);
    saveStore();
    state.leadDraft = null;
    await loadDashboard();
    state.selectedLeadId = createdLead.id;
    return;
  }
  if (runtime.backendAvailable) {
    try {
      await api(`/api/admin/leads/${payload.leadId}`, { method: "PATCH", body: JSON.stringify({ name: payload.name, phone: payload.phone, email: payload.email, service: payload.service, source: payload.source, status: payload.status, scheduledAt: payload.scheduledAt, confirmed: payload.confirmed, comment: payload.comment, message: payload.message }) });
      await loadDashboard();
      return;
    } catch (error) {
      if (error.message !== "__LOCAL_MODE__") throw error;
    }
  }
  updateLocalLead(payload);
  await loadDashboard();
}

async function saveLead(successText = "Карточка заявки сохранена") {
  const payload = buildLeadPayload();
  if (!payload.name || !payload.phone) { setStatus(leadFormStatus, "Укажите имя и телефон для заявки", "error"); return; }
  setStatus(leadFormStatus, "Сохраняем...");
  try {
    await persistLead(payload);
    const activeLeadId = payload.leadId || state.selectedLeadId;
    const updatedLead = state.leads.find((item) => item.id === activeLeadId);
    state.selectedLeadId = updatedLead?.id || activeLeadId;
    if (updatedLead?.clientId) state.selectedClientId = updatedLead.clientId;
    renderLeads();
    renderLeadEditor();
    setStatus(leadFormStatus, successText, "success");
  } catch (error) {
    setStatus(leadFormStatus, error.message, "error");
  }
}

async function deleteLead(leadId = "") {
  const targetId = leadId || leadForm?.elements.leadId.value || state.selectedLeadId;
  if (!targetId) return;
  const targetLead = state.leads.find((item) => item.id === targetId);
  const confirmed = window.confirm(`Удалить заявку${targetLead?.name ? ` «${targetLead.name}»` : ""}?`);
  if (!confirmed) return;
  setStatus(leadFormStatus, "Удаляем...");

  if (runtime.backendAvailable) {
    try {
      await api(`/api/admin/leads/${targetId}`, { method: "DELETE" });
      state.selectedLeadId = "";
      state.leadDraft = null;
      await loadDashboard();
      renderLeads();
      renderLeadEditor();
      setStatus(leadFormStatus, "Заявка удалена", "success");
      return;
    } catch (error) {
      if (error.message !== "__LOCAL_MODE__") {
        setStatus(leadFormStatus, error.message, "error");
        return;
      }
    }
  }

  deleteLocalLead(targetId);
  state.selectedLeadId = "";
  state.leadDraft = null;
  await loadDashboard();
  renderLeads();
  renderLeadEditor();
  setStatus(leadFormStatus, "Заявка удалена", "success");
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(loginStatus, "Проверяем доступ...");
  const username = loginForm.elements.username.value.trim();
  const password = loginForm.elements.password.value;
  if (runtime.backendAvailable) {
    try {
      const loginPayload = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ username, password }) });
      state.currentUser = loginPayload.user || null;
      setStatus(loginStatus, "Вход выполнен", "success");
      await checkSession();
      return;
    } catch (error) {
      if (error.message !== "__LOCAL_MODE__") { setStatus(loginStatus, error.message, "error"); return; }
    }
  }
  const localUser = (localStore.users || []).find((item) => item.username === username && item.password === password);
  if (localUser) {
    localStorage.setItem(SESSION_KEY, localUser.username);
    state.currentUser = localUser;
    setStatus(loginStatus, "Вход выполнен", "success");
    await checkSession();
    return;
  }
  setStatus(loginStatus, "Неверный логин или пароль", "error");
});

logoutButton?.addEventListener("click", async () => {
  if (runtime.backendAvailable) { try { await api("/api/admin/logout", { method: "POST", body: "{}" }); } catch (error) { if (error.message !== "__LOCAL_MODE__") alert(error.message); } }
  localStorage.removeItem(SESSION_KEY);
  state.currentUser = null;
  await checkSession();
});

exportButton?.addEventListener("click", () => { if (!runtime.backendAvailable) { setStatus(leadFormStatus, "Excel-экспорт доступен при работающем backend.", "error"); return; } window.location.href = "/api/admin/export.xlsx"; });
adminViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const view = normalizeViewForRole(button.dataset.adminView || "leads");
    setAdminViewRoute(view);
  });
});
window.addEventListener("popstate", () => applyAdminView(getAdminViewFromHash()));
backDashboardButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAdminViewRoute("leads");
  });
});
crmSearchInput?.addEventListener("input", (e) => { state.filters.search = e.target.value || ""; renderLeads(); });
crmStatusFilter?.addEventListener("change", (e) => { state.filters.status = e.target.value; renderLeads(); });

leadsTable?.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-lead]");
  if (editButton) {
    state.leadDraft = null;
    state.selectedLeadId = editButton.dataset.editLead;
    const lead = state.leads.find((item) => item.id === state.selectedLeadId);
    if (lead?.clientId) state.selectedClientId = lead.clientId;
    renderLeads();
    renderLeadEditor();
    return;
  }
});

leadForm?.addEventListener("submit", async (event) => { event.preventDefault(); await saveLead(); });
confirmDispatchButton?.addEventListener("click", async () => {
  if (!leadForm) return;
  leadForm.elements.confirmed.checked = true;
  if (CRM_STATUSES.indexOf(statusOf(leadForm.elements.status.value)) < CRM_STATUSES.indexOf("подтверждено")) leadForm.elements.status.value = "подтверждено";
  await saveLead("Согласие на выезд зафиксировано");
});

deleteLeadButton?.addEventListener("click", async () => {
  await deleteLead();
});

addLeadButton?.addEventListener("click", () => {
  state.selectedLeadId = "";
  state.leadDraft = createEmptyLeadDraft();
  renderLeads();
  renderLeadEditor();
  setStatus(leadFormStatus, "");
});

reviewIntegrationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(reviewIntegrationStatus, "Сохраняем...");
  const nextSettings = JSON.parse(JSON.stringify(localStore.settings));
  nextSettings.reviewsIntegration.yandexBusinessUrl = reviewIntegrationForm.elements.yandexBusinessUrl.value.trim();
  nextSettings.reviewsIntegration.gisBusinessUrl = reviewIntegrationForm.elements.gisBusinessUrl.value.trim();
  nextSettings.reviewsIntegration.yandexWidgetUrl = reviewIntegrationForm.elements.yandexWidgetUrl.value.trim();
  nextSettings.reviewCards.yandex.reviewUrl = nextSettings.reviewsIntegration.yandexBusinessUrl;
  nextSettings.reviewCards.yandex.buttonUrl = nextSettings.reviewsIntegration.yandexBusinessUrl;
  nextSettings.reviewCards.yandex.qrUrl = nextSettings.reviewsIntegration.yandexBusinessUrl;
  nextSettings.reviewCards.gis.reviewUrl = nextSettings.reviewsIntegration.gisBusinessUrl;
  nextSettings.reviewCards.gis.buttonUrl = nextSettings.reviewsIntegration.gisBusinessUrl;
  nextSettings.reviewCards.gis.qrUrl = nextSettings.reviewsIntegration.gisBusinessUrl;
  if (runtime.backendAvailable) { try { await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(nextSettings) }); } catch (error) { if (error.message !== "__LOCAL_MODE__") { setStatus(reviewIntegrationStatus, error.message, "error"); return; } } }
  localStore.settings = nextSettings; saveStore(); state.settings = nextSettings; setStatus(reviewIntegrationStatus, "Ссылки на отзывы сохранены", "success");
});

reviewCardsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(reviewCardsStatus, "Сохраняем...");
  const nextSettings = JSON.parse(JSON.stringify(localStore.settings));
  nextSettings.reviewCards.gis.title = reviewCardsForm.elements.gisTitle.value.trim();
  nextSettings.reviewCards.gis.text = reviewCardsForm.elements.gisText.value.trim();
  nextSettings.reviewCards.gis.buttonLabel = reviewCardsForm.elements.gisButtonLabel.value.trim();
  nextSettings.reviewCards.gis.source = reviewCardsForm.elements.gisSource.value;
  nextSettings.reviewCards.gis.sourceLabel = reviewCardsForm.elements.gisSourceLabel.value.trim();
  nextSettings.reviewCards.gis.buttonUrl = reviewCardsForm.elements.gisButtonUrl.value.trim();
  nextSettings.reviewCards.gis.reviewUrl = reviewCardsForm.elements.gisReviewUrl.value.trim();
  nextSettings.reviewCards.gis.placeUrl = reviewCardsForm.elements.gisReviewUrl.value.trim();
  nextSettings.reviewCards.gis.rating = Number(reviewCardsForm.elements.gisRating.value || 0);
  nextSettings.reviewCards.gis.reviewsCount = Number(reviewCardsForm.elements.gisReviewsCount.value || 0);
  nextSettings.reviewCards.gis.icon = reviewCardsForm.elements.gisIcon.value.trim();
  nextSettings.reviewCards.gis.openInNewTab = reviewCardsForm.elements.gisOpenInNewTab.checked;
  nextSettings.reviewCards.gis.qrUrl = nextSettings.reviewCards.gis.placeUrl || nextSettings.reviewCards.gis.buttonUrl;

  nextSettings.reviewCards.yandex.title = reviewCardsForm.elements.yandexTitle.value.trim();
  nextSettings.reviewCards.yandex.text = reviewCardsForm.elements.yandexText.value.trim();
  nextSettings.reviewCards.yandex.buttonLabel = reviewCardsForm.elements.yandexButtonLabel.value.trim();
  nextSettings.reviewCards.yandex.source = reviewCardsForm.elements.yandexSource.value;
  nextSettings.reviewCards.yandex.sourceLabel = reviewCardsForm.elements.yandexSourceLabel.value.trim();
  nextSettings.reviewCards.yandex.buttonUrl = reviewCardsForm.elements.yandexButtonUrl.value.trim();
  nextSettings.reviewCards.yandex.reviewUrl = reviewCardsForm.elements.yandexReviewUrl.value.trim();
  nextSettings.reviewCards.yandex.placeUrl = reviewCardsForm.elements.yandexReviewUrl.value.trim();
  nextSettings.reviewCards.yandex.rating = Number(reviewCardsForm.elements.yandexRating.value || 0);
  nextSettings.reviewCards.yandex.reviewsCount = Number(reviewCardsForm.elements.yandexReviewsCount.value || 0);
  nextSettings.reviewCards.yandex.icon = reviewCardsForm.elements.yandexIcon.value.trim();
  nextSettings.reviewCards.yandex.openInNewTab = reviewCardsForm.elements.yandexOpenInNewTab.checked;
  nextSettings.reviewCards.yandex.qrUrl = nextSettings.reviewCards.yandex.placeUrl || nextSettings.reviewCards.yandex.buttonUrl;

  if (runtime.backendAvailable) {
    try {
      await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(nextSettings) });
    } catch (error) {
      if (error.message !== "__LOCAL_MODE__") {
        setStatus(reviewCardsStatus, error.message, "error");
        return;
      }
    }
  }

  localStore.settings = nextSettings;
  saveStore();
  state.settings = nextSettings;
  setStatus(reviewCardsStatus, "Карточки отзывов сохранены", "success");
});

reviewForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(reviewStatus, "Сохраняем...");
  const payload = {
    id: reviewForm.elements.reviewId.value || "",
    author: reviewForm.elements.author.value.trim(),
    source: reviewForm.elements.source.value.trim(),
    rating: Number(reviewForm.elements.rating.value || 5),
    publishedAt: reviewForm.elements.publishedAt.value ? `${reviewForm.elements.publishedAt.value}T12:00:00.000Z` : nowIso(),
    link: reviewForm.elements.link.value.trim(),
    qrBinding: reviewForm.elements.qrBinding.value,
    text: reviewForm.elements.text.value.trim(),
    published: reviewForm.elements.published.checked,
  };
  try {
    if (runtime.backendAvailable) {
      if (payload.id) {
        await api(`/api/admin/reviews/${payload.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/api/admin/reviews", { method: "POST", body: JSON.stringify(payload) });
      }
      await loadDashboard();
    } else {
      if (payload.id) {
        const target = localStore.reviews.find((item) => item.id === payload.id);
        if (target) Object.assign(target, payload);
      } else {
        localStore.reviews.unshift(normalizeReview({ ...payload, id: createId(), createdAt: nowIso() }));
      }
      saveStore();
      await loadDashboard();
    }
    state.selectedReviewId = payload.id || state.reviews[0]?.id || "";
    fillReviewForm();
    setStatus(reviewStatus, "Отзыв сохранён", "success");
  } catch (error) {
    setStatus(reviewStatus, error.message, "error");
  }
});

reviewResetButton?.addEventListener("click", () => {
  state.selectedReviewId = "";
  fillReviewForm();
  setStatus(reviewStatus, "");
});

qrForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(qrStatus, "Сохраняем...");
  const nextSettings = JSON.parse(JSON.stringify(localStore.settings));
  nextSettings.reviewCards.yandex.qrImage = qrForm.elements.yandexQrImage.value.trim();
  nextSettings.reviewCards.gis.qrImage = qrForm.elements.gisQrImage.value.trim();
  if (runtime.backendAvailable) { try { await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(nextSettings) }); } catch (error) { if (error.message !== "__LOCAL_MODE__") { setStatus(qrStatus, error.message, "error"); return; } } }
  localStore.settings = nextSettings; saveStore(); state.settings = nextSettings; setStatus(qrStatus, "QR-коды сохранены", "success");
});

beforeAfterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(beforeAfterStatus, "Сохраняем...");
  const item = { id: beforeAfterForm.elements.itemId.value || createId(), title: beforeAfterForm.elements.title.value.trim(), before: beforeAfterForm.elements.before.value.trim(), after: beforeAfterForm.elements.after.value.trim() };
  if (!item.before || !item.after) {
    setStatus(beforeAfterStatus, "Сначала загрузите фото «До» и «После».", "error");
    return;
  }
  try {
    if (runtime.backendAvailable) {
      if (beforeAfterForm.elements.itemId.value) {
        await api(`/api/admin/before-after/${item.id}`, { method: "PUT", body: JSON.stringify({ ...item, published: true }) });
      } else {
        await api("/api/admin/before-after", { method: "POST", body: JSON.stringify({ ...item, published: true }) });
      }
      await loadDashboard();
    } else {
      const existing = localStore.beforeAfter.find((entry) => entry.id === item.id);
      if (existing) Object.assign(existing, item);
      else localStore.beforeAfter.unshift(item);
      saveStore();
      await loadDashboard();
    }
    state.selectedBeforeAfterId = item.id;
    fillBeforeAfterForm();
    setStatus(beforeAfterStatus, "Пара сохранена", "success");
  } catch (error) {
    setStatus(beforeAfterStatus, error.message, "error");
  }
});

beforeAfterResetButton?.addEventListener("click", () => {
  state.selectedBeforeAfterId = "";
  fillBeforeAfterForm();
  setStatus(beforeAfterStatus, "");
});

beforeAfterList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-before-after]");
  const editButton = event.target.closest("[data-edit-before-after]");
  const moveButton = event.target.closest("[data-move-before-after]");
  if (editButton) {
    state.selectedBeforeAfterId = editButton.dataset.editBeforeAfter;
    fillBeforeAfterForm(state.beforeAfter.find((item) => item.id === state.selectedBeforeAfterId) || null);
    return;
  }
  if (moveButton) {
    const id = moveButton.dataset.moveBeforeAfter;
    const direction = Number(moveButton.dataset.direction || 0);
    const items = runtime.backendAvailable ? [...state.beforeAfter] : [...localStore.beforeAfter];
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    if (!runtime.backendAvailable) {
      localStore.beforeAfter = items;
      saveStore();
      await loadDashboard();
    } else {
      await api("/api/admin/before-after/reorder", {
        method: "POST",
        body: JSON.stringify({ ids: items.map((entry) => entry.id) }),
      });
      await loadDashboard();
    }
    return;
  }
  if (!button || !confirm("Удалить пару before/after?")) return;
  if (runtime.backendAvailable) { try { await api(`/api/admin/before-after/${button.dataset.deleteBeforeAfter}`, { method: "DELETE" }); } catch (error) { if (error.message !== "__LOCAL_MODE__") { alert(error.message); return; } } }
  localStore.beforeAfter = localStore.beforeAfter.filter((item) => item.id !== button.dataset.deleteBeforeAfter); saveStore(); await loadDashboard();
});

reviewsList?.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-review]");
  const deleteButton = event.target.closest("[data-delete-review]");
  const toggleButton = event.target.closest("[data-toggle-review]");
  const moveButton = event.target.closest("[data-move-review]");
  if (editButton) {
    state.selectedReviewId = editButton.dataset.editReview;
    fillReviewForm(state.reviews.find((item) => item.id === state.selectedReviewId) || null);
    return;
  }
  if (toggleButton) {
    const reviewId = toggleButton.dataset.toggleReview;
    const review = state.reviews.find((item) => item.id === reviewId);
    if (!review) return;
    const payload = { ...review, published: !review.published };
    try {
      if (runtime.backendAvailable) {
        await api(`/api/admin/reviews/${reviewId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        const target = localStore.reviews.find((item) => item.id === reviewId);
        if (target) target.published = !target.published;
        saveStore();
      }
      await loadDashboard();
      fillReviewForm(state.reviews.find((item) => item.id === state.selectedReviewId) || null);
    } catch (error) {
      setStatus(reviewStatus, error.message, "error");
    }
    return;
  }
  if (moveButton) {
    const reviewId = moveButton.dataset.moveReview;
    const direction = Number(moveButton.dataset.direction || 0);
    const items = runtime.backendAvailable ? [...state.reviews] : [...(localStore.reviews || []).map(normalizeReview)];
    const index = items.findIndex((item) => item.id === reviewId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    try {
      if (runtime.backendAvailable) {
        await api("/api/admin/reviews/reorder", { method: "POST", body: JSON.stringify({ ids: reordered.map((item) => item.id) }) });
      } else {
        localStore.reviews = reordered;
        saveStore();
      }
      await loadDashboard();
      fillReviewForm(state.reviews.find((item) => item.id === state.selectedReviewId) || null);
    } catch (error) {
      setStatus(reviewStatus, error.message, "error");
    }
    return;
  }
  if (!deleteButton || !confirm("Удалить отзыв?")) return;
  const reviewId = deleteButton.dataset.deleteReview;
  try {
    if (runtime.backendAvailable) {
      await api(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
    } else {
      localStore.reviews = localStore.reviews.filter((item) => item.id !== reviewId);
      saveStore();
    }
    if (state.selectedReviewId === reviewId) state.selectedReviewId = "";
    await loadDashboard();
    fillReviewForm();
  } catch (error) {
    setStatus(reviewStatus, error.message, "error");
  }
});

$("[data-upload-before]")?.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    beforeAfterForm.elements.before.value = await uploadFile(file);
    setUploadInlineStatus(uploadBeforeStatus, file.name, "Файл не выбран");
    setStatus(beforeAfterStatus, "Фото «До» загружено", "success");
  } catch (error) {
    setStatus(beforeAfterStatus, error.message, "error");
  }
});
$("[data-upload-after]")?.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    beforeAfterForm.elements.after.value = await uploadFile(file);
    setUploadInlineStatus(uploadAfterStatus, file.name, "Файл не выбран");
    setStatus(beforeAfterStatus, "Фото «После» загружено", "success");
  } catch (error) {
    setStatus(beforeAfterStatus, error.message, "error");
  }
});
$("[data-upload-qr-yandex]")?.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    qrForm.elements.yandexQrImage.value = await uploadFile(file);
    setUploadInlineStatus(uploadQrYandexStatus, file.name, "Файл не выбран");
    setStatus(qrStatus, "QR Яндекс загружен", "success");
  } catch (error) {
    setStatus(qrStatus, error.message, "error");
  }
});
$("[data-upload-qr-gis]")?.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    qrForm.elements.gisQrImage.value = await uploadFile(file);
    setUploadInlineStatus(uploadQrGisStatus, file.name, "Файл не выбран");
    setStatus(qrStatus, "QR 2ГИС загружен", "success");
  } catch (error) {
    setStatus(qrStatus, error.message, "error");
  }
});

(async function initAdmin() {
  await probeBackend();
  setAdminViewRoute(getAdminViewFromHash(), true);
  await checkSession();
})().catch(() => {
  loginPanel?.classList.remove("is-hidden");
  dashboard?.classList.add("is-hidden");
});
