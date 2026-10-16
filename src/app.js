// ---------- app: router, component mounting, export/import, service worker ----------

const app = { drill: null, lastRoute: "" };

function parseRoute() {
  const parts = (location.hash.replace(/^#\/?/, "") || "").split("/").map(decodeURIComponent);
  return { name: parts[0] || "home", a: parts[1], b: parts[2] };
}

function render() {
  app.drill?.destroy();
  app.drill = null;
  const route = parseRoute();
  const main = document.getElementById("app");
  const views = {
    home: () => renderHome(),
    unit: () => renderUnit(route.a),
    lesson: () => renderLesson(route.a, route.b || "read"),
    practice: () => renderPractice(route.a),
    settings: () => renderSettings(),
    about: () => renderAbout(),
  };
  main.innerHTML = (views[route.name] || renderMissing)();
  document.querySelectorAll("[data-nav]").forEach((link) => link.classList.toggle("is-active", link.dataset.nav === route.name || (route.name === "lesson" && link.dataset.nav === "home")));
  mountComponents(route);
  if (route.name !== app.lastRoute || route.name === "lesson") window.scrollTo({ top: 0 });
  app.lastRoute = route.name;
}

function mountComponents(route) {
  const main = document.getElementById("app");
  main.querySelectorAll("[data-static-keyboard]").forEach((el) => {
    renderKeyboard(el);
    const row = Number(el.dataset.staticKeyboard);
    el.querySelectorAll(".kbd__row")[row]?.classList.add("is-focus-row");
  });

  const quizMount = main.querySelector("[data-mount=quiz]");
  if (quizMount) {
    const { lesson } = lessonById(route.a);
    new Quiz({
      questions: lesson.quiz,
      onFinish: ({ correct, total }) => {
        recordQuiz(lesson.id, correct, total);
        quizMount.innerHTML = `<div class="result">
          <h3>${correct === total ? "كلها صح! 🎯" : correct >= total / 2 ? "كويس، شوف الغلط وكمّل" : "ماشي، اقرأ الدرس تاني وجرب"}</h3>
          <div class="result__nums"><div><b>${correct}</b><span>من ${total}</span></div></div>
          <div class="done__actions">
            <a class="btn btn--primary" href="#/lesson/${lesson.id}/type">يلا نكتب ${ICONS.next}</a>
            <a class="btn btn--ghost" href="#/lesson/${lesson.id}/quiz" data-action="retry">${ICONS.refresh} الأسئلة تاني</a>
            ${correct < total ? `<a class="btn btn--ghost" href="#/lesson/${lesson.id}/read">اقرأ الدرس تاني</a>` : ""}
          </div></div>`;
      },
    }).mount(quizMount);
  }

  const typingMount = main.querySelector("[data-mount=typing]");
  if (typingMount) {
    const { settings } = progress();
    const isPractice = route.name === "practice";
    const text = isPractice
      ? (route.a === "hard" ? hardWordsText() : practiceTexts().find((item) => item.id === route.a).text)
      : lessonById(route.a).lesson.typing;
    const recordId = isPractice ? `${PRACTICE_PREFIX}${route.a}` : route.a;
    app.drill = new TypingDrill({
      text,
      strict: settings.strict,
      keyboard: settings.keyboard && !coarsePointer(),
      onFinish: (stats) => {
        recordTyping(recordId, stats);
        const here = location.hash;
        typingMount.insertAdjacentHTML("beforeend", typingResult(stats, {
          retryHref: here,
          nextHref: isPractice ? "#/practice" : `#/lesson/${route.a}/spell`,
          nextLabel: isPractice ? "نص تاني" : "يلا الإملاء",
          lessonId: recordId,
        }));
        typingMount.querySelector(".result")?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
    });
    app.drill.mount(typingMount);
  }

  const spellMount = main.querySelector("[data-mount=spelling]");
  if (spellMount) {
    const { lesson } = lessonById(route.a);
    new SpellingDrill({
      items: lesson.spelling,
      onFinish: (result) => {
        recordSpelling(lesson.id, result);
        location.hash = `#/lesson/${lesson.id}/done`;
      },
    }).mount(spellMount);
  }

  const info = main.querySelector("[data-muscle-info]");
  if (info) {
    main.querySelector(".bodymap--live").addEventListener("click", (event) => {
      const region = event.target.closest("[data-muscle]");
      if (!region) return;
      const key = region.dataset.muscle;
      const meta = MUSCLE_INFO[key];
      main.querySelectorAll(".bodymap--live .m.on").forEach((el) => el.classList.remove("on"));
      main.querySelectorAll(`.bodymap--live [data-muscle="${key}"]`).forEach((el) => el.classList.add("on"));
      info.innerHTML = `<b>${esc(meta.name)}</b><span>${esc(meta.where)}</span><span>${esc(meta.does)}</span>`;
    });
  }
}

// ---------- export / import: the whole site with the progress baked in ----------

const SEED_PATTERN = /(<script id="progress-seed" type="application\/json">)[\s\S]*?(<\/script>)/;

function safeFileName(name) {
  return String(name || "نسختي").replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40) || "نسختي";
}

function exportSiteCopy() {
  const json = JSON.stringify(progress()).replace(/<\//g, "<\\/");
  const html = PRISTINE_HTML.replace(SEED_PATTERN, `$1${json}$2`);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: `Popeye_Academy_${safeFileName(progress().name)}.html` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  showToast("اتنزّلت نسختك. افتحها على أي جهاز وهتلاقي تقدمك زي ما هو.");
}

function readSeedFrom(html) {
  const match = html.match(SEED_PATTERN);
  if (!match) return null;
  const raw = html.slice(match.index + match[1].length, match.index + match[0].length - match[2].length).trim();
  if (!raw || raw === "null") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function importFromFile(file) {
  if (!file) return;
  const seed = normalizeProgress(readSeedFrom(await file.text()));
  if (!seed) {
    showToast("الملف ده مش نسخة من Popeye Academy أو مفيهوش تقدم.");
    return;
  }
  const local = progress();
  const hasLocal = Object.keys(local.lessons).length > 0;
  if (hasLocal) {
    const newer = Date.parse(seed.updatedAt) > Date.parse(local.updatedAt);
    const ok = await confirmDialog({
      title: "تستبدل تقدمك؟",
      body: `النسخة دي ${newer ? "أحدث" : "أقدم"} من اللي على الجهاز (${seed.name || "بدون اسم"} · ${new Date(seed.updatedAt).toLocaleDateString("ar-EG")}). لو كملت هيتستبدل التقدم الحالي.`,
      okLabel: "استبدل",
      okIcon: "upload",
      danger: !newer,
    });
    if (!ok) return;
  }
  replaceProgress(seed);
  showToast(`رجّعنا تقدم ${seed.name || "النسخة"}.`);
  render();
}

// ---------- offline: service worker + network badge ----------

function updateNetworkBadge() {
  document.getElementById("net-badge").hidden = navigator.onLine;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
  const firstVisit = !navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || firstVisit) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register("./sw.js").then((registration) => {
    const offerUpdate = (worker) => showToast("في نسخة أحدث من الموقع", { label: "تحديث", run: () => worker.postMessage("skip-waiting") });
    if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
      });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") registration.update().catch(() => {});
    });
  }).catch(() => {});
  if (firstVisit) navigator.serviceWorker.ready.then(() => showToast("الموقع اتحفظ على جهازك — هيفتح حتى من غير نت"));
}

// ---------- events ----------

function bindEvents() {
  window.addEventListener("hashchange", render);

  document.addEventListener("click", async (event) => {
    const el = event.target.closest("[data-action]");
    if (!el) return;
    const { action } = el.dataset;
    if (action === "mark-read") recordRead(el.dataset.id);
    if (action === "export") exportSiteCopy();
    if (action === "import") document.getElementById("file-input").click();
    if (action === "retry") {
      event.preventDefault();
      render();
    }
    if (action === "reset") {
      const ok = await confirmDialog({ title: "تمسح كل تقدمك؟", body: "كل النجوم والنقط والإحصائيات على الجهاز ده هتتمسح. مفيش تراجع.", okLabel: "امسح", okIcon: "refresh" });
      if (!ok) return;
      resetProgress();
      showToast("اتمسح التقدم. يلا من الأول 💪");
      location.hash = "#/";
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.dataset.form !== "name") return;
    event.preventDefault();
    recordName(new FormData(event.target).get("name"));
    showToast(`أهلًا يا ${progress().name || "بطل"}!`);
    render();
  });

  document.addEventListener("change", (event) => {
    const el = event.target;
    if (el.dataset.setting) {
      recordSettings({ [el.dataset.setting]: el.checked });
      applySettings();
    }
  });

  document.getElementById("file-input").addEventListener("change", (event) => {
    importFromFile(event.target.files[0]);
    event.target.value = "";
  });

  window.addEventListener("online", updateNetworkBadge);
  window.addEventListener("offline", updateNetworkBadge);
}

function applySettings() {
  document.documentElement.classList.toggle("big-text", Boolean(progress().settings.bigText));
}

function readSeedScript() {
  try {
    return JSON.parse(document.getElementById("progress-seed").textContent || "null");
  } catch {
    return null;
  }
}

async function loadFonts() {
  const faces = Object.entries(FONT_DATA).map(([key, data]) => {
    const [family, weight] = { cairo400: ["Cairo", 400], cairo600: ["Cairo", 600], cairo700: ["Cairo", 700], cairo800: ["Cairo", 800], lalezar: ["Lalezar", 400] }[key];
    const bytes = Uint8Array.from(atob(data), (ch) => ch.charCodeAt(0));
    return new FontFace(family, bytes, { weight: String(weight) });
  });
  faces.forEach((face) => document.fonts.add(face));
  await Promise.all(faces.map((face) => face.load()));
}

async function boot() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.outerHTML = ICONS[el.dataset.icon];
  });
  document.getElementById("brand-logo").src = BANNER_SRC;
  await loadFonts();
  const { restoredFromSeed } = initProgress(readSeedScript());
  applySettings();
  bindEvents();
  render();
  updateNetworkBadge();
  registerServiceWorker();
  if (restoredFromSeed) showToast(`رجّعنا تقدمك من النسخة اللي فتحتها${progress().name ? ` يا ${progress().name}` : ""} 👋`);
  if ("speechSynthesis" in window) speechSynthesis.getVoices();
}

boot();
