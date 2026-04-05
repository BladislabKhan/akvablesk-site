const form = document.querySelector("[data-forgot-form]");
const statusNode = document.querySelector("[data-forgot-status]");

function setStatus(message, state = "") {
  if (!statusNode) return;
  statusNode.className = "status";
  statusNode.textContent = message || "";
  if (state) statusNode.classList.add(`is-${state}`);
}

async function requestReset(email) {
  const response = await fetch("/api/admin/password/request-reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Не удалось отправить ссылку");
  }
  return payload;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Отправляем ссылку...");

  const email = form.elements.email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus("Укажите корректный e-mail", "error");
    return;
  }

  try {
    const payload = await requestReset(email);
    setStatus(payload.message || "Если e-mail найден, ссылка отправлена.", "success");
    form.reset();
  } catch (error) {
    setStatus(error.message, "error");
  }
});
