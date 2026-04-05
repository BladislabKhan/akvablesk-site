const form = document.querySelector("[data-reset-form]");
const statusNode = document.querySelector("[data-reset-status]");
const params = new URLSearchParams(window.location.search);
const token = params.get("token") || "";

function setStatus(message, state = "") {
  if (!statusNode) return;
  statusNode.className = "status";
  statusNode.textContent = message || "";
  if (state) statusNode.classList.add(`is-${state}`);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
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

async function initResetPage() {
  if (!token) {
    setStatus("Ссылка для сброса недействительна.", "error");
    if (form) form.classList.add("is-hidden");
    return;
  }

  try {
    const payload = await api(`/api/admin/password/reset-check?token=${encodeURIComponent(token)}`, {
      method: "GET",
      headers: {},
    });
    form.elements.username.value = payload.user?.username || "";
  } catch (error) {
    setStatus(error.message, "error");
    if (form) form.classList.add("is-hidden");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Сохраняем новый доступ...");

  const username = form.elements.username.value.trim();
  const newPassword = form.elements.newPassword.value;

  if (username.length < 3) {
    setStatus("Логин должен быть не короче 3 символов", "error");
    return;
  }

  if (newPassword.trim().length < 8) {
    setStatus("Пароль должен быть не короче 8 символов", "error");
    return;
  }

  try {
    const payload = await api("/api/admin/password/reset", {
      method: "POST",
      body: JSON.stringify({
        token,
        username,
        newPassword,
      }),
    });
    setStatus(payload.message || "Доступ обновлён", "success");
    window.setTimeout(() => {
      window.location.href = "./index.html";
    }, 1000);
  } catch (error) {
    setStatus(error.message, "error");
  }
});

initResetPage();
