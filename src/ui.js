// ---------- small UI kit: escaping, icons, toast, dialogs ----------

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

const svg = (body, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS = {
  home: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/><path d="M8 7h7M8 11h5"/>'),
  keyboard: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/>'),
  muscle: svg('<path d="M6 7l2-3 3 1 1 4-2 2"/><path d="M18 7l-2-3-3 1-1 4 2 2"/><path d="M7 11c-1 3-1 6 1 9h8c2-3 2-6 1-9"/><path d="M9 20v1M15 20v1"/>'),
  dumbbell: svg('<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>'),
  run: svg('<circle cx="15" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2v4M6 11l3-3 4 1 2 3 3 1M11 15l-1-4"/>'),
  trophy: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8 21h8M10 17h4"/>'),
  flame: svg('<path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3 .5 1.5 1.5 2 2 2 0-3-1-5 1-8z"/>'),
  star: svg('<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>'),
  starFill: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/></svg>',
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  next: svg('<path d="M15 5l-7 7 7 7"/>'),
  back: svg('<path d="M9 5l7 7-7 7"/>'),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>'),
  upload: svg('<path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 5h16"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  play: svg('<path d="M7 4l12 8-12 8z"/>'),
  pause: svg('<path d="M7 5v14M17 5v14"/>'),
  sound: svg('<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>'),
  warn: svg('<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17.5v.5"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  pen: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  refresh: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  heart: svg('<path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>'),
  wifiOff: svg('<path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0M12 19h.01"/><path d="M3 3l18 18"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
};

function stars(count, max = 3) {
  return `<span class="stars" aria-label="${count} من ${max} نجوم">${Array.from({ length: max }, (_, i) => `<span class="${i < count ? "on" : ""}">${ICONS.starFill}</span>`).join("")}</span>`;
}

// ---------- toast ----------

let toastTimer = 0;

function showToast(message, action) {
  const toast = document.getElementById("toast");
  toast.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button" class="toast__action">${esc(action.label)}</button>` : ""}`;
  toast.classList.add("is-visible");
  if (action) {
    toast.querySelector(".toast__action").addEventListener("click", () => {
      action.run();
      hideToast();
    }, { once: true });
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 7000 : 3200);
}

function hideToast() {
  document.getElementById("toast").classList.remove("is-visible");
}

// ---------- dialogs: native <dialog>, resolved by the button that closed it ----------

function openDialog({ title, body, actions, danger = false, onOpen }) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("dialog");
    const ordered = [...actions.filter((action) => action.primary), ...actions.filter((action) => !action.primary)];
    dialog.innerHTML = `
      <form method="dialog" class="dlg">
        <h2 class="dlg__title" id="dialog-title">${esc(title)}</h2>
        <div class="dlg__body">${body}</div>
        <div class="dlg__actions">${ordered.map((action) =>
          `<button class="btn ${action.primary ? (danger ? "btn--danger-solid" : "btn--primary") : "btn--ghost"}" value="${esc(action.value)}"${action.autofocus ? " autofocus" : ""}>${action.icon ? ICONS[action.icon] : ""}<span>${esc(action.label)}</span></button>`).join("")}
        </div>
      </form>`;
    dialog.setAttribute("aria-labelledby", "dialog-title");
    const done = () => {
      dialog.removeEventListener("close", done);
      resolve({ value: dialog.returnValue || "cancel", form: dialog.querySelector("form") });
    };
    dialog.addEventListener("close", done);
    dialog.returnValue = "";
    dialog.showModal();
    onOpen?.(dialog);
  });
}

function confirmDialog({ title, body, okLabel, okIcon, danger = true }) {
  return openDialog({
    title,
    body: `<p>${body}</p>`,
    danger,
    actions: [
      { value: "cancel", label: "إلغاء", autofocus: true },
      { value: "ok", label: okLabel, icon: okIcon, primary: true },
    ],
  }).then((result) => result.value === "ok");
}
