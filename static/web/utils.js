/**
 * Unified Notification System for AutoMailer
 * Replaces alerts and browser confirms with glassmorphic UI components.
 */

window.showToast = function(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  
  const icon = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-msg">${message}</div>
  `;
  
  container.appendChild(toast);
  
  // Trigger entry animation
  setTimeout(() => toast.classList.add("active"), 10);
  
  // Auto-remove
  const timer = setTimeout(() => {
    toast.classList.remove("active");
    toast.classList.add("exit");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
  
  toast.onclick = () => {
    clearTimeout(timer);
    toast.classList.remove("active");
    toast.classList.add("exit");
    setTimeout(() => toast.remove(), 400);
  };
};

window.showConfirm = function(title, body, onConfirm) {
  let overlay = document.getElementById("confirm-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "confirm-overlay";
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-card">
        <div class="confirm-title" id="confirm-card-title"></div>
        <div class="confirm-body" id="confirm-card-body"></div>
        <div class="confirm-footer">
          <button class="confirm-btn confirm-cancel" id="confirm-btn-cancel">Cancel</button>
          <button class="confirm-btn confirm-ok" id="confirm-btn-ok">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const titleEl = document.getElementById("confirm-card-title");
  const bodyEl = document.getElementById("confirm-card-body");
  const cancelBtn = document.getElementById("confirm-btn-cancel");
  const okBtn = document.getElementById("confirm-btn-ok");

  titleEl.innerText = title;
  bodyEl.innerText = body;

  const close = () => overlay.classList.remove("active");

  cancelBtn.onclick = close;
  okBtn.onclick = () => {
    close();
    onConfirm();
  };

  overlay.classList.add("active");
};
