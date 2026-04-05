const STORAGE_KEY = "aquablesk_admin_local_store_v3";
const SESSION_KEY = "aquablesk_admin_local_session_v3";

const form = document.querySelector("[data-site-settings-form]");
const statusNode = document.querySelector("[data-site-settings-status]");
const runtime = { backendAvailable: false };
let currentSettings = {};

function setStatus(message, state = "") {
  if (!statusNode) return;
  statusNode.className = "status";
  statusNode.textContent = message || "";
  if (state) statusNode.classList.add(`is-${state}`);
}

function loadLocalStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLocalStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getDefaultSettings() {
  return {
    site: {
      phoneDisplay: "+7 (914) 582-63-17",
      phoneHref: "tel:+79145826317",
      city: "Хабаровск",
      hours: "Ежедневно 09:00–22:00",
      address: "Хабаровск, центр города",
    },
    messenger: {
      name: "MAX",
      url: "https://max.ru/",
      heroLabel: "Написать в MAX",
      contactsLabel: "Перейти в MAX",
      ariaLabel: "Перейти в MAX",
      openInNewTab: true,
    },
    contactMap: {
      title: "АкваБлеск в Хабаровске",
      note: "Откройте карту, посмотрите точку и постройте маршрут.",
      address: "Хабаровск, центр города",
      routeUrl: "https://www.google.com/maps",
      lat: 48.480223,
      lng: 135.071917,
      zoom: 15,
    },
    notifications: {
      ownerEmail: "admin@aquablesk.local",
      sendClientConfirmation: false,
    },
  };
}

function mergeSettings(base = {}, incoming = {}) {
  return {
    ...base,
    ...incoming,
    site: {
      ...(base.site || {}),
      ...(incoming.site || {}),
    },
    messenger: {
      ...(base.messenger || {}),
      ...(incoming.messenger || {}),
    },
    contactMap: {
      ...(base.contactMap || {}),
      ...(incoming.contactMap || {}),
    },
    notifications: {
      ...(base.notifications || {}),
      ...(incoming.notifications || {}),
    },
  };
}

function normalizePhoneHref(phoneDisplay) {
  const digits = String(phoneDisplay || "").replace(/\D/g, "");
  return digits ? `tel:+${digits}` : "";
}

async function probeBackend() {
  try {
    const response = await fetch("/api/admin/session", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    runtime.backendAvailable = response.status === 200 || response.status === 401;
    return runtime.backendAvailable;
  } catch {
    runtime.backendAvailable = false;
    return false;
  }
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Ошибка запроса");
  }
  return payload;
}

function applySettings(settings = {}) {
  const merged = mergeSettings(getDefaultSettings(), settings);
  currentSettings = merged;
  form.elements.phoneDisplay.value = merged.site?.phoneDisplay || "";
  form.elements.messengerUrl.value = merged.messenger?.url || "";
  form.elements.city.value = merged.site?.city || "";
  form.elements.hours.value = merged.site?.hours || "";
  form.elements.address.value = merged.site?.address || "";
  form.elements.mapTitle.value = merged.contactMap?.title || "";
  form.elements.mapNote.value = merged.contactMap?.note || "";
  form.elements.mapRouteUrl.value = merged.contactMap?.routeUrl || "";
  form.elements.ownerEmail.value = merged.notifications?.ownerEmail || "";
  form.elements.sendClientConfirmation.checked = Boolean(merged.notifications?.sendClientConfirmation);
}

function buildPayloadFromForm() {
  const phoneDisplay = form.elements.phoneDisplay.value.trim();
  const messengerUrl = form.elements.messengerUrl.value.trim();
  const city = form.elements.city.value.trim();
  const hours = form.elements.hours.value.trim();
  const address = form.elements.address.value.trim();
  const mapTitle = form.elements.mapTitle.value.trim();
  const mapNote = form.elements.mapNote.value.trim();
  const mapRouteUrl = form.elements.mapRouteUrl.value.trim();
  const ownerEmail = form.elements.ownerEmail.value.trim();
  const sendClientConfirmation = Boolean(form.elements.sendClientConfirmation.checked);

  return mergeSettings(currentSettings, {
    site: {
      phoneDisplay,
      phoneHref: normalizePhoneHref(phoneDisplay),
      city,
      hours,
      address,
    },
    messenger: {
      url: messengerUrl,
    },
    contactMap: {
      title: mapTitle,
      note: mapNote,
      address,
      routeUrl: mapRouteUrl,
    },
    notifications: {
      ownerEmail,
      sendClientConfirmation,
    },
  });
}

function validatePayload(payload) {
  if (!payload.site?.phoneDisplay || !payload.messenger?.url) {
    return "Заполните телефон и ссылку на MAX";
  }
  if (!payload.site?.city || !payload.site?.hours || !payload.site?.address) {
    return "Заполните город, режим работы и адрес";
  }
  if (!payload.contactMap?.title) {
    return "Заполните заголовок карты";
  }
  if (!payload.notifications?.ownerEmail) {
    return "Заполните рабочий e-mail владельца";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.notifications.ownerEmail)) {
    return "Укажите корректный e-mail владельца";
  }
  return "";
}

async function initPage() {
  const backendAvailable = await probeBackend();

  if (backendAvailable) {
    try {
      const sessionPayload = await api("/api/admin/session", { method: "GET" });
      if ((sessionPayload.user?.role || "admin") !== "admin") {
        window.location.href = "./index.html";
        return;
      }
      const settings = await api("/api/admin/settings", { method: "GET" });
      applySettings(settings);
      return;
    } catch {
      window.location.href = "./index.html";
      return;
    }
  }

  const currentUsername = localStorage.getItem(SESSION_KEY);
  const localStore = loadLocalStore();
  const currentUser = (localStore.users || []).find((item) => item.username === currentUsername);
  if (!currentUser || currentUser.role !== "admin") {
    window.location.href = "./index.html";
    return;
  }

  applySettings(localStore.settings || {});
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Сохраняем...");

  const payload = buildPayloadFromForm();
  const validationMessage = validatePayload(payload);
  if (validationMessage) {
    setStatus(validationMessage, "error");
    return;
  }

  if (runtime.backendAvailable) {
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      currentSettings = payload;
      setStatus("Данные сайта сохранены", "success");
      return;
    } catch (error) {
      setStatus(error.message, "error");
      return;
    }
  }

  const localStore = loadLocalStore();
  localStore.settings = mergeSettings(localStore.settings || getDefaultSettings(), payload);
  saveLocalStore(localStore);
  currentSettings = localStore.settings;
  setStatus("Данные сайта сохранены", "success");
});

initPage();
