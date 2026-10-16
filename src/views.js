// ---------- views: home, unit, lesson steps, free practice, settings, about ----------

const LESSON_STEPS = [
  { key: "read", label: "اقرأ", icon: "book" },
  { key: "quiz", label: "اختبر نفسك", icon: "target" },
  { key: "type", label: "اكتب", icon: "keyboard" },
  { key: "spell", label: "إملاء", icon: "pen" },
];
const PRACTICE_PREFIX = "practice:";
const HARD_WORDS_COUNT = 14;

const LESSON_INDEX = (() => {
  const map = {};
  const order = [];
  CONTENT_UNITS.forEach((unit, unitIndex) => {
    unit.lessons.forEach((lesson, index) => {
      map[lesson.id] = { lesson, unit, unitIndex, index };
      order.push(lesson.id);
    });
  });
  return { map, order };
})();

function lessonById(id) {
  return LESSON_INDEX.map[id] || null;
}

function nextLessonId() {
  return LESSON_INDEX.order.find((id) => !lessonDone(id)) || LESSON_INDEX.order.at(-1);
}

function lessonAfter(id) {
  const position = LESSON_INDEX.order.indexOf(id);
  return LESSON_INDEX.order[position + 1] || null;
}

function unitStats(unit) {
  const done = unit.lessons.filter((lesson) => lessonDone(lesson.id)).length;
  return { done, total: unit.lessons.length, ratio: unit.lessons.length ? done / unit.lessons.length : 0 };
}

function coarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}

// ---------- shared pieces ----------

function exerciseFigure(exId, { caption = "", name = "", size = "" } = {}) {
  const frames = IMAGES[exId];
  const meta = EXERCISE_INDEX[exId];
  if (!frames) return `<figure class="ex ex--missing"><div class="ex__frames"></div><figcaption>${esc(caption || name)}</figcaption></figure>`;
  const title = name || meta?.name || "";
  return `<figure class="ex ${size}">
    <div class="ex__frames" aria-hidden="true">${frames.map((src, i) => `<img src="${src}" alt="" class="f${i}" loading="lazy" decoding="async">`).join("")}</div>
    <figcaption><b>${esc(title)}</b>${meta?.name && name ? `<small dir="ltr">${esc(meta.name)}</small>` : ""}${caption ? `<span>${esc(caption)}</span>` : ""}</figcaption>
  </figure>`;
}

function progressBar(ratio, label = "") {
  const percent = Math.round(ratio * 100);
  return `<div class="bar" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"${label ? ` aria-label="${esc(label)}"` : ""}><i style="width:${percent}%"></i></div>`;
}

function statTile(icon, value, label, extra = "") {
  return `<div class="tile ${extra}"><span class="tile__icon">${ICONS[icon]}</span><b class="tile__value">${value}</b><span class="tile__label">${label}</span></div>`;
}

function dayWord(n) {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومين";
  return `${n} ${n <= 10 ? "أيام" : "يوم"}`;
}

function lessonWord(n) {
  if (n === 1) return "درس واحد";
  if (n === 2) return "درسين";
  return `${n} ${n <= 10 ? "دروس" : "درس"}`;
}

// ---------- home ----------

function renderHome() {
  const data = progress();
  const xp = totalXp();
  const level = levelFor(xp);
  const streak = streakDays();
  const best = bestTyping();
  const nextId = nextLessonId();
  const next = lessonById(nextId);
  const started = Object.keys(data.lessons).length > 0;
  const doneCount = LESSON_INDEX.order.filter((id) => lessonDone(id)).length;
  const confusions = worstConfusions(4);
  const chars = charsToday();

  return `
  <section class="hero">
    <div class="hero__text">
      <p class="hero__hi">${data.name ? `أهلًا يا ${esc(data.name)} 👋` : "أهلًا يا بطل 👋"}</p>
      <h1>اتعلم الجيم، واكتب صح</h1>
      <p class="hero__sub">دروس قصيرة عن العضلات والأجهزة والتمارين، وبعد كل درس تكتب اللي اتعلمته على الكيبورد وتظبط إملاءك.</p>
      ${data.name ? "" : `<form class="namebox" data-form="name"><label class="fld__label" for="name-in">اسمك إيه؟</label><div class="inline"><input id="name-in" class="in" name="name" maxlength="40" placeholder="اكتب اسمك" autocomplete="off"><button class="btn btn--primary">حفظ</button></div></form>`}
    </div>
    <div class="hero__card">
      <span class="hero__kicker">${started ? "واقف عند" : "ابدأ من هنا"}</span>
      <b class="hero__lesson">${esc(next.lesson.title)}</b>
      <span class="hero__unit">${esc(next.unit.title)} · الدرس ${next.index + 1} من ${next.unit.lessons.length}</span>
      <a class="btn btn--primary btn--lg" href="#/lesson/${next.lesson.id}/${firstOpenStep(next.lesson.id)}">${started ? "كمّل" : "يلا نبدأ"} ${ICONS.next}</a>
    </div>
  </section>

  <section class="tiles">
    ${statTile("trophy", `${xp}`, `نقطة · مستوى ${esc(level.name)}`, "tile--level")}
    ${statTile("flame", `${streak}`, streak === 1 ? "يوم ورا بعض" : "أيام ورا بعض")}
    ${statTile("book", `${doneCount}<small>/${LESSON_INDEX.order.length}</small>`, "درس خلصته")}
    ${statTile("keyboard", best ? `${best.cpm}` : "—", best ? `حرف/دقيقة · دقة ${best.accuracy}%` : "لسه ما كتبتش")}
  </section>
  <div class="level">
    <span>مستوى <b>${esc(level.name)}</b></span>
    ${progressBar(level.ratio, "التقدم للمستوى الجاي")}
    <span>${level.next ? `${level.next.xp - xp} نقطة على <b>${esc(level.next.name)}</b>` : "أعلى مستوى 🦁"}</span>
  </div>
  <div class="level level--daily">
    <span>كتبت النهارده <b>${chars}</b> حرف</span>
    ${progressBar(Math.min(1, chars / DAILY_CHARS_TARGET), "هدف النهارده")}
    <span>${chars >= DAILY_CHARS_TARGET ? "الهدف اتحقق 🔥 كمّل براحتك" : `الهدف <b>${DAILY_CHARS_TARGET}</b> حرف`}</span>
  </div>

  <section class="units">
    <h2 class="h2">الوحدات</h2>
    <div class="units__grid">${CONTENT_UNITS.map((unit, i) => {
      const { done, total, ratio } = unitStats(unit);
      return `<a class="unit" href="#/unit/${unit.id}">
        <span class="unit__icon">${ICONS[unit.icon] || ICONS.book}</span>
        <span class="unit__num">الوحدة ${i}</span>
        <b class="unit__title">${esc(unit.title)}</b>
        <span class="unit__sub">${esc(unit.subtitle)}</span>
        ${progressBar(ratio, unit.title)}
        <span class="unit__count">${done} من ${total}</span>
      </a>`;
    }).join("")}</div>
  </section>

  <section class="home__row">
    <div class="card">
      <h2 class="h2">${ICONS.keyboard} تدريب حر</h2>
      <p>نصوص ورقتك وكل الدروس، نص ورا نص. الهدف ${DAILY_CHARS_TARGET} حرف كل يوم.</p>
      <a class="btn btn--ghost" href="#/practice">افتح التدريب الحر ${ICONS.next}</a>
    </div>
    <div class="card">
      <h2 class="h2">${ICONS.pen} الحروف اللي بتلخبطك</h2>
      ${confusions.length ? `<ul class="confusions">${confusions.map(([pair, count]) => {
        const [expected, typed] = pair.split("→");
        return `<li><b>${esc(expected)}</b><span>بتكتبها</span><b class="bad">${esc(typed)}</b><small>${count} ${count === 1 ? "مرة" : count === 2 ? "مرتين" : "مرات"}</small></li>`;
      }).join("")}</ul><a class="btn btn--ghost btn--sm" href="#/practice/hard">تدرب عليها ${ICONS.next}</a>` : "<p>لسه مفيش. أول ما تكتب شوية هنعرف إيه اللي محتاج تدريب.</p>"}
    </div>
    <div class="card">
      <h2 class="h2">${ICONS.download} نسختك</h2>
      <p>نزّل الموقع كله بتقدمك في ملف واحد، وافتحه على أي جهاز تاني وكمّل من مكانك.</p>
      <button type="button" class="btn btn--ghost" data-action="export">نزّل نسختك ${ICONS.download}</button>
    </div>
  </section>`;
}

function firstOpenStep(id) {
  const record = progress().lessons[id];
  if (!record?.read) return "read";
  if (!record.quiz) return "quiz";
  if (!record.typing) return "type";
  if (!record.spelling) return "spell";
  return "read";
}

// ---------- unit ----------

function renderUnit(unitId) {
  const unitIndex = CONTENT_UNITS.findIndex((unit) => unit.id === unitId);
  const unit = CONTENT_UNITS[unitIndex];
  if (!unit) return renderMissing();
  const { done, total, ratio } = unitStats(unit);
  return `
  <nav class="crumbs"><a href="#/">${ICONS.home} الرئيسية</a><span>›</span><span>الوحدة ${unitIndex}</span></nav>
  <header class="unit-head">
    <span class="unit__icon unit__icon--big">${ICONS[unit.icon] || ICONS.book}</span>
    <div><h1>${esc(unit.title)}</h1><p>${esc(unit.subtitle)}</p></div>
    <div class="unit-head__progress">${progressBar(ratio, unit.title)}<span>${done} من ${total} ${total === 1 ? "درس" : "دروس"}</span></div>
  </header>
  <ol class="lessons">${unit.lessons.map((lesson, i) => {
    const count = lessonStars(lesson.id);
    const record = progress().lessons[lesson.id];
    const state = count >= 2 ? "تم" : record ? "كمّل" : "ابدأ";
    return `<li class="lesson-row${count >= 2 ? " is-done" : ""}">
      <span class="lesson-row__num">${i + 1}</span>
      <div class="lesson-row__text"><b>${esc(lesson.title)}</b><span>${esc(lesson.subtitle)} · ${lesson.minutes} دقايق</span></div>
      ${stars(count)}
      <a class="btn ${count >= 2 ? "btn--ghost" : "btn--primary"} btn--sm" href="#/lesson/${lesson.id}/${firstOpenStep(lesson.id)}">${state}</a>
    </li>`;
  }).join("")}</ol>`;
}

// ---------- lesson ----------

function renderLesson(id, step) {
  const found = lessonById(id);
  if (!found) return renderMissing();
  const { lesson, unit, index } = found;
  const record = progress().lessons[id] || {};
  const stepIndex = LESSON_STEPS.findIndex((item) => item.key === step);
  const stepper = `<ol class="stepper">${LESSON_STEPS.map((item, i) => {
    const done = (item.key === "read" && record.read) || (item.key === "quiz" && record.quiz) || (item.key === "type" && record.typing) || (item.key === "spell" && record.spelling);
    return `<li class="${i === stepIndex ? "is-current" : ""}${done ? " is-done" : ""}"><a href="#/lesson/${id}/${item.key}">${done && i !== stepIndex ? ICONS.check : ICONS[item.icon]}<span>${item.label}</span></a></li>`;
  }).join("")}</ol>`;

  const body = {
    read: renderReadStep,
    quiz: renderQuizStep,
    type: renderTypeStep,
    spell: renderSpellStep,
    done: renderDoneStep,
  }[step]?.(lesson, unit) ?? renderReadStep(lesson, unit);

  return `
  <nav class="crumbs"><a href="#/">${ICONS.home}</a><span>›</span><a href="#/unit/${unit.id}">${esc(unit.title)}</a><span>›</span><span>الدرس ${index + 1}</span></nav>
  <header class="lesson-head"><h1>${esc(lesson.title)}</h1><p>${esc(lesson.subtitle)}</p></header>
  ${step === "done" ? "" : stepper}
  <section class="step" data-step="${step}">${body}</section>`;
}

function renderSection(section) {
  if (section.tip) return `<aside class="callout callout--tip"><b>نصيحة الكابتن</b><p>${esc(section.tip)}</p></aside>`;
  if (section.warn) return `<aside class="callout callout--warn"><b>${ICONS.warn} خلي بالك</b><p>${esc(section.warn)}</p></aside>`;
  if (section.kv) return `<dl class="facts">${section.kv.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`;
  const parts = [];
  if (section.h) parts.push(`<h2>${esc(section.h)}</h2>`);
  if (section.p) parts.push(`<p>${esc(section.p)}</p>`);
  if (section.list) parts.push(`<ul>${section.list.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`);
  if (section.exercises) parts.push(`<div class="ex-grid">${section.exercises.map((item) => exerciseFigure(item.ex, { name: item.name, caption: item.note })).join("")}</div>`);
  if (section.table) {
    parts.push(`<table class="tbl"><thead><tr>${section.table.head.map((cell) => `<th>${esc(cell)}</th>`).join("")}</tr></thead><tbody>${section.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
  }
  return `<div class="sec">${parts.join("")}</div>`;
}

function renderReadStep(lesson) {
  const hero = lesson.hero ? exerciseFigure(lesson.hero.ex, { caption: lesson.hero.caption, size: "ex--hero" }) : "";
  const map = lesson.muscles?.length ? `<div class="sec sec--map"><h2>مكانها في جسمك</h2>${renderBodyMap(lesson.muscles)}</div>` : "";
  const keyboard = lesson.keyboardRow !== undefined ? `<div class="sec"><h2>شوف الحروف على الكيبورد</h2><div class="kbd kbd--static" data-static-keyboard="${lesson.keyboardRow}"></div></div>` : "";
  const liveMap = lesson.bodyMap ? `<div class="sec sec--map"><h2>دوس على أي عضلة</h2>${renderBodyMap([], { interactive: true })}<div class="muscle-info" data-muscle-info><b>دوس على عضلة في الرسمة</b><span>هنقولك اسمها ومكانها وبتعمل إيه.</span></div></div>` : "";
  return `
    <article class="read">
      ${hero}
      ${liveMap}
      ${map}
      ${keyboard}
      ${lesson.sections.map(renderSection).join("")}
    </article>
    <div class="step__nav"><a class="btn btn--primary btn--lg" href="#/lesson/${lesson.id}/quiz" data-action="mark-read" data-id="${lesson.id}">فهمت، يلا نختبر ${ICONS.next}</a></div>`;
}

function renderQuizStep(lesson) {
  return `<p class="step__intro">${lesson.quiz.length} أسئلة سريعة عن اللي قريته. ما تخافش من الغلط، كل سؤال بيقولك ليه.</p><div data-mount="quiz"></div>`;
}

function renderTypeStep(lesson) {
  const mobile = coarsePointer();
  return `
    <p class="step__intro">اقرا الكلام ده الأول، وبعدين اكتبه زي ما هو. الحرف الصح بيبقى <b class="ok-word">أخضر</b> والغلط <b class="bad-word">أحمر</b>${progress().settings.strict ? "، ومش هتعدي غير لما تصلحه" : ""}. وتحت النص هتشوف الجملة اللي كتبتها على بعضها.</p>
    ${mobile ? `<p class="note">${ICONS.info} التدريب ده أحسن على كمبيوتر بكيبورد حقيقي. على الموبايل الكيبورد اللي على الشاشة مش هيظهر.</p>` : ""}
    <div data-mount="typing"></div>`;
}

function renderSpellStep(lesson) {
  return `<p class="step__intro">إملاء: اختار الحرف الناقص، وبعدين الكلمة هتختفي وتكتبها من دماغك.</p><div data-mount="spelling"></div>`;
}

function renderDoneStep(lesson, unit) {
  const count = lessonStars(lesson.id);
  const record = progress().lessons[lesson.id] || {};
  const next = lessonAfter(lesson.id);
  const nextFound = next && lessonById(next);
  const typing = record.typing?.best;
  return `
    <div class="done">
      <div class="done__stars">${stars(count)}</div>
      <h2>${count === 3 ? "ممتاز يا أسد! 🦁" : count === 2 ? "جامد! 💪" : "تمام، كمّل الخطوات الباقية"}</h2>
      <p>خلصت درس <b>${esc(lesson.title)}</b>.</p>
      <dl class="facts">
        <div><dt>الأسئلة</dt><dd>${record.quiz ? `${record.quiz.best} من ${record.quiz.total}` : "—"}</dd></div>
        <div><dt>الكتابة</dt><dd>${typing ? `دقة ${typing.accuracy}% · ${typing.cpm} حرف/د` : "—"}</dd></div>
        <div><dt>الإملاء</dt><dd>${record.spelling ? `${record.spelling.best} من ${record.spelling.total}` : "—"}</dd></div>
      </dl>
      ${count < 3 ? `<p class="done__hint">النجمة التالتة: كل الأسئلة صح + دقة كتابة 97% + الإملاء.</p>` : ""}
      <div class="done__actions">
        ${nextFound ? `<a class="btn btn--primary btn--lg" href="#/lesson/${next}/${firstOpenStep(next)}">الدرس الجاي: ${esc(nextFound.lesson.title)} ${ICONS.next}</a>` : `<a class="btn btn--primary btn--lg" href="#/">خلصت كل الدروس! 🏆</a>`}
        <a class="btn btn--ghost" href="#/lesson/${lesson.id}/type">اكتب تاني</a>
        <a class="btn btn--ghost" href="#/unit/${unit.id}">رجوع للوحدة</a>
      </div>
    </div>`;
}

function typingResult(stats, { retryHref, nextHref, nextLabel, lessonId }) {
  const count = typingStars(stats);
  const missed = Object.entries(stats.errors.reduce((acc, { expected }) => ({ ...acc, [expected]: (acc[expected] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return `
    <div class="result">
      <div class="done__stars">${stars(count)}</div>
      <h3>${count === 3 ? "سرعة ودقة! 🔥" : count === 2 ? "دقة حلوة، كمّل كده" : "خلصتها! التاني هيبقى أحسن"}</h3>
      <div class="result__nums">
        <div><b>${stats.accuracy}%</b><span>الدقة</span></div>
        <div><b>${stats.cpm}</b><span>حرف/دقيقة</span></div>
        <div><b>${stats.errors.length}</b><span>${stats.errors.length === 1 ? "غلطة" : "أخطاء"}</span></div>
        <div><b>${Math.round(stats.seconds)}</b><span>ثانية</span></div>
      </div>
      ${missed.length ? `<p class="result__missed">الحروف اللي وقفتك: ${missed.map(([char, n]) => `<kbd>${esc(char)}</kbd>${n > 1 ? `<small>×${n}</small>` : ""}`).join(" ")}</p>` : ""}
      <div class="done__actions">
        <a class="btn btn--primary" href="${nextHref}">${nextLabel} ${ICONS.next}</a>
        <a class="btn btn--ghost" href="${retryHref}" data-action="retry">${ICONS.refresh} تاني</a>
      </div>
    </div>`;
}

// ---------- practice ----------

function practiceTexts() {
  const own = PRACTICE_TEXTS.map((item) => ({ ...item, group: "ورقة التدريب" }));
  const lessons = LESSON_INDEX.order.map((id) => {
    const { lesson, unit } = lessonById(id);
    return { id: `lesson-${id}`, title: lesson.title, group: unit.title, text: lesson.typing };
  });
  return [...own, ...lessons];
}

function hardWordsText() {
  const letters = new Set(worstConfusions(6).map(([pair]) => pair.split("→")[0]));
  const pool = LESSON_INDEX.order.flatMap((id) => lessonById(id).lesson.spelling.map((item) => item.word));
  const picked = pool.filter((word, i) => pool.indexOf(word) === i && [...word].some((ch) => letters.has(ch)));
  const words = (picked.length >= 6 ? picked : pool.filter((word, i) => pool.indexOf(word) === i)).slice(0, HARD_WORDS_COUNT);
  return words.join(" ");
}

function renderPractice(textId) {
  const texts = practiceTexts();
  const groups = [...new Set(texts.map((item) => item.group))];
  const picked = textId === "hard" ? { id: "hard", title: "كلمات بتلخبطك", text: hardWordsText() } : texts.find((item) => item.id === textId);
  if (!picked) {
    return `
    <nav class="crumbs"><a href="#/">${ICONS.home} الرئيسية</a><span>›</span><span>تدريب حر</span></nav>
    <header class="lesson-head"><h1>تدريب حر</h1><p>اختار نص واكتبه، ولما تخلص دوس على النص اللي بعده. كل حرف بيتحسب في هدف النهارده.</p></header>
    <div class="practice-pick">
      <a class="pick pick--hard" href="#/practice/hard"><b>كلمات بتلخبطك</b><span>كلمات فيها الحروف اللي بتغلط فيها أكتر</span></a>
      ${groups.map((group) => `<h2 class="h2">${esc(group)}</h2><div class="pick-grid">${texts.filter((item) => item.group === group).map((item) => {
        const best = progress().lessons[`${PRACTICE_PREFIX}${item.id}`]?.typing?.best;
        return `<a class="pick" href="#/practice/${item.id}"><b>${esc(item.title)}</b><span>${item.text.length} حرف${best ? ` · أحسن مرة ${best.cpm} حرف/د بدقة ${best.accuracy}%` : ""}</span></a>`;
      }).join("")}</div>`).join("")}
    </div>`;
  }
  return `
    <nav class="crumbs"><a href="#/">${ICONS.home}</a><span>›</span><a href="#/practice">تدريب حر</a><span>›</span><span>${esc(picked.title)}</span></nav>
    <header class="lesson-head"><h1>${esc(picked.title)}</h1></header>
    <section class="step" data-step="type"><div data-mount="typing" data-text-id="${esc(picked.id)}"></div></section>`;
}

// ---------- settings / about ----------

function renderSettings() {
  const { settings, name } = progress();
  const toggle = (key, label, hint) => `<label class="switch"><input type="checkbox" data-setting="${key}"${settings[key] ? " checked" : ""}><span class="switch__track"></span><span class="switch__text"><b>${label}</b><small>${hint}</small></span></label>`;
  return `
  <nav class="crumbs"><a href="#/">${ICONS.home} الرئيسية</a><span>›</span><span>الإعدادات</span></nav>
  <header class="lesson-head"><h1>الإعدادات</h1></header>
  <div class="settings">
    <section class="card">
      <h2 class="h2">اسمك</h2>
      <form class="inline" data-form="name"><input class="in" name="name" value="${esc(name)}" maxlength="40" placeholder="اكتب اسمك" autocomplete="off"><button class="btn btn--primary">حفظ</button></form>
    </section>
    <section class="card">
      <h2 class="h2">الكتابة</h2>
      ${toggle("strict", "ما تعديش الغلط", "الحرف الغلط بيوقفك لحد ما تصلحه. أحسن للإملاء.")}
      ${toggle("keyboard", "اعرض الكيبورد على الشاشة", "بيوريك الزرار الجاي بالأحمر، وإمتى تدوس شيفت.")}
      ${toggle("sound", "اسمع الكلمة في الإملاء", "لو جهازك فيه صوت عربي.")}
      ${toggle("bigText", "خط أكبر", "لكل الموقع.")}
    </section>
    <section class="card">
      <h2 class="h2">نسختك وتقدمك</h2>
      <p>التقدم محفوظ على الجهاز ده. عشان تنقله لجهاز تاني، نزّل نسخة من الموقع بتقدمك جواها وافتحها هناك.</p>
      <div class="btn-row">
        <button type="button" class="btn btn--primary" data-action="export">${ICONS.download} نزّل نسختك</button>
        <button type="button" class="btn btn--ghost" data-action="import">${ICONS.upload} استورد تقدم من نسخة</button>
      </div>
    </section>
    <section class="card card--danger">
      <h2 class="h2">ابدأ من الأول</h2>
      <p>بيمسح كل التقدم على الجهاز ده. النسخ اللي نزّلتها قبل كده مش بتتأثر.</p>
      <button type="button" class="btn btn--danger" data-action="reset">${ICONS.refresh} امسح التقدم</button>
    </section>
    <p class="about-link"><a href="#/about">${ICONS.info} عن الموقع والمصادر</a></p>
  </div>`;
}

function renderAbout() {
  return `
  <nav class="crumbs"><a href="#/">${ICONS.home} الرئيسية</a><span>›</span><span>عن الموقع</span></nav>
  <header class="lesson-head"><h1>عن Popeye Academy</h1></header>
  <div class="card prose">
    <p>موقع تعليمي صغير من Popeye Gym: دروس بسيطة عن الجيم بالعامية، وبعد كل درس تدريب كتابة على الكيبورد وإملاء. بيشتغل من غير نت بعد أول فتحة، وتقدمك محفوظ على جهازك بس.</p>
    <h2>المصادر</h2>
    <ul>
      <li>صور التمارين من مشروع <span dir="ltr">free-exercise-db</span> (ملكية عامة، رخصة Unlicense).</li>
      <li>الخطوط: Cairo و Lalezar من Google Fonts (رخصة SIL Open Font License).</li>
      <li>المعلومات معلومات مبتدئين عامة. لو عندك إصابة أو مرض، اسأل الكابتن أو الدكتور قبل أي تمرين.</li>
    </ul>
  </div>`;
}

function renderMissing() {
  return `<div class="card"><h2>الصفحة دي مش موجودة</h2><a class="btn btn--primary" href="#/">${ICONS.home} الرئيسية</a></div>`;
}
