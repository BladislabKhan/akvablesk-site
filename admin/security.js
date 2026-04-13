const STORAGE_KEY = "aquablesk_admin_local_store_v3";
const SESSION_KEY = "aquablesk_admin_local_session_v3";

const form = document.querySelector("[data-security-form]");
const statusNode = document.querySelector("[data-security-status]");

const runtime = { backendAvailable: false };

function setStatus(message, state = "") {
  if (!statusNode) return;
  statusNode.className = "status";
  statusNode.textContent = message || "";
  if (state) statusNode.classList.add(`is-${state}`);
}

function loadLocalStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function saveLocalStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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
  } catch (error) {
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

async function initPage() {
  const backendAvailable = await probeBackend();

  if (backendAvailable) {
    try {
      const payload = await api("/api/admin/session", { method: "GET" });
      if ((payload.user?.role || "admin") !== "admin") {
        window.location.href = "./index.html";
        return;
      }
      form.elements.username.value = payload.user?.username || "";
      form.elements.nextUsername.value = payload.user?.username || "";
      form.elements.email.value = payload.user?.email || "";
      return;
    } catch (error) {
      window.location.href = "./index.html";
      return;
    }
  }

  const currentUsername = localStorage.getItem(SESSION_KEY);
  if (!currentUsername) {
    window.location.href = "./index.html";
    return;
  }

  const localStore = loadLocalStore();
  const currentUser = (localStore.users || []).find((item) => item.username === currentUsername);
  if (!currentUser || currentUser.role !== "admin") {
    window.location.href = "./index.html";
    return;
  }
  form.elements.username.value = currentUser.username || "";
  form.elements.nextUsername.value = currentUser.username || "";
  form.elements.email.value = currentUser.email || "";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Сохраняем...");

  const username = form.elements.username.value.trim();
  const email = form.elements.email.value.trim();
  const currentPassword = form.elements.currentPassword.value;
  const nextUsername = form.elements.nextUsername.value.trim();
  const newPassword = form.elements.newPassword.value;

  if (runtime.backendAvailable) {
    try {
      await api("/api/admin/password", {
        method: "POST",
        body: JSON.stringify({
          username: nextUsername,
          email,
          currentPassword,
          newPassword,
        }),
      });
      localStorage.removeItem(SESSION_KEY);
      setStatus("Данные обновлены. Выполните вход заново.", "success");
      window.setTimeout(() => {
        window.location.href = "./index.html";
      }, 900);
      return;
    } catch (error) {
      setStatus(error.message, "error");
      return;
    }
  }

  const localStore = loadLocalStore();
  const currentUser = (localStore.users || []).find((item) => item.username === username);
  if (!currentUser || currentUser.password !== currentPassword) {
    setStatus("Текущий логин или пароль неверный", "error");
    return;
  }

  if (nextUsername.length < 3) {
    setStatus("Новый логин должен быть не короче 3 символов", "error");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus("Укажите корректный e-mail", "error");
    return;
  }

  if (newPassword.trim().length < 8) {
    setStatus("Новый пароль должен быть не короче 8 символов", "error");
    return;
  }

  currentUser.username = nextUsername;
  currentUser.email = email;
  currentUser.password = newPassword;
  saveLocalStore(localStore);
  localStorage.removeItem(SESSION_KEY);
  setStatus("Данные обновлены. Выполните вход заново.", "success");
  window.setTimeout(() => {
    window.location.href = "./index.html";
  }, 900);
});

initPage();
