(() => {
  const STORAGE_KEY = "aquablesk_accessibility_mode";
  const ROOT_CLASS = "accessibility-mode";
  const ACTIVE_LABEL = "Обычная версия";
  const INACTIVE_LABEL = "Версия для слабовидящих";

  function canUseStorage() {
    try {
      const probeKey = "__aq_a11y_probe__";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  const storageEnabled = canUseStorage();

  function readStoredState() {
    if (!storageEnabled) return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  }

  function saveStoredState(enabled) {
    if (!storageEnabled) return;
    window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  }

  function applyState(enabled) {
    document.documentElement.classList.toggle(ROOT_CLASS, enabled);
    if (document.body) {
      document.body.classList.toggle(ROOT_CLASS, enabled);
    }

    document.querySelectorAll("[data-accessibility-toggle]").forEach((button) => {
      const label = enabled ? ACTIVE_LABEL : INACTIVE_LABEL;
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.setAttribute("data-tooltip", label);
    });
  }

  let currentState = readStoredState();
  document.documentElement.classList.toggle(ROOT_CLASS, currentState);

  function toggleState() {
    currentState = !currentState;
    saveStoredState(currentState);
    applyState(currentState);
  }

  function bindToggles() {
    document.querySelectorAll("[data-accessibility-toggle]").forEach((button) => {
      if (button.dataset.a11yBound === "true") return;
      button.dataset.a11yBound = "true";
      button.addEventListener("click", toggleState);
    });
  }

  function initAccessibilityMode() {
    currentState = readStoredState();
    applyState(currentState);
    bindToggles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccessibilityMode, { once: true });
  } else {
    initAccessibilityMode();
  }
})();
