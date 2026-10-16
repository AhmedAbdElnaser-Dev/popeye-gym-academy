// ---------- progress: one localStorage record, XP / stars / streak, export seed ----------

const PROGRESS_KEY = "popeye-academy:progress:v1";
const PROGRESS_VERSION = 1;
const XP = { read: 10, quizPerCorrect: 5, typingFinish: 20, typingStar: 10, spellingFinish: 10, spellingPerfect: 10 };
const LEVELS = [
  { xp: 0, name: "مبتدئ" },
  { xp: 120, name: "لاعب" },
  { xp: 350, name: "قوي" },
  { xp: 700, name: "بطل" },
  { xp: 1200, name: "أسد" },
];
const TYPING_STAR_ACCURACY = { two: 95, three: 98 };
const TYPING_STAR_CPM = 60;

const progressState = { data: null, listeners: new Set() };

function emptyProgress() {
  return {
    v: PROGRESS_VERSION,
    name: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lessons: {},
    days: {},
    confusions: {},
    keyErrors: {},
    settings: { strict: true, keyboard: true, sound: true, bigText: false },
  };
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function normalizeProgress(raw) {
  if (!raw || typeof raw !== "object" || !raw.lessons) return null;
  const base = emptyProgress();
  return {
    ...base,
    ...raw,
    v: PROGRESS_VERSION,
    name: String(raw.name ?? "").slice(0, 40),
    lessons: raw.lessons && typeof raw.lessons === "object" ? raw.lessons : {},
    days: raw.days && typeof raw.days === "object" ? raw.days : {},
    confusions: raw.confusions && typeof raw.confusions === "object" ? raw.confusions : {},
    keyErrors: raw.keyErrors && typeof raw.keyErrors === "object" ? raw.keyErrors : {},
    settings: { ...base.settings, ...(raw.settings || {}) },
  };
}

function readLocalProgress() {
  try {
    return normalizeProgress(JSON.parse(localStorage.getItem(PROGRESS_KEY)));
  } catch {
    return null;
  }
}

function persistProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressState.data));
  } catch {
    // storage blocked or full: the session keeps working in memory
  }
}

/** Boot: local record wins unless the page carries a newer seed (a downloaded copy of the site). */
function initProgress(seed) {
  const local = readLocalProgress();
  const seeded = normalizeProgress(seed);
  let data = local || seeded || emptyProgress();
  let restoredFromSeed = false;
  if (seeded && (!local || Date.parse(seeded.updatedAt) > Date.parse(local.updatedAt))) {
    data = seeded;
    restoredFromSeed = Boolean(local) || true;
  }
  progressState.data = data;
  persistProgress();
  return { restoredFromSeed: restoredFromSeed && Boolean(seeded) };
}

function progress() {
  return progressState.data;
}

function onProgress(listener) {
  progressState.listeners.add(listener);
}

function mutateProgress(mutate) {
  mutate(progressState.data);
  progressState.data.updatedAt = new Date().toISOString();
  persistProgress();
  progressState.listeners.forEach((listener) => listener(progressState.data));
}

function replaceProgress(data) {
  progressState.data = normalizeProgress(data) || emptyProgress();
  persistProgress();
  progressState.listeners.forEach((listener) => listener(progressState.data));
}

function resetProgress() {
  const { settings, name } = progressState.data;
  replaceProgress({ ...emptyProgress(), name, settings });
}

function lessonRecord(id) {
  const data = progressState.data;
  data.lessons[id] ??= { read: null, quiz: null, typing: null, spelling: null, attempts: 0 };
  return data.lessons[id];
}

function addXp(data, amount, minutes = 0) {
  const day = (data.days[todayKey()] ??= { xp: 0, minutes: 0 });
  day.xp += amount;
  day.minutes += minutes;
}

function recordRead(id) {
  mutateProgress((data) => {
    const record = lessonRecord(id);
    if (!record.read) {
      record.read = new Date().toISOString();
      addXp(data, XP.read, 2);
    }
  });
}

function recordQuiz(id, correct, total) {
  mutateProgress((data) => {
    const record = lessonRecord(id);
    const fresh = !record.quiz;
    const improved = fresh || correct > record.quiz.best;
    const gained = improved ? (correct - (fresh ? 0 : record.quiz.best)) * XP.quizPerCorrect : 0;
    record.quiz = { best: Math.max(correct, record.quiz?.best ?? 0), total, last: correct, attempts: (record.quiz?.attempts ?? 0) + 1, at: new Date().toISOString() };
    addXp(data, gained, 2);
  });
}

function typingStars(stats) {
  if (!stats) return 0;
  if (stats.accuracy >= TYPING_STAR_ACCURACY.three && stats.cpm >= TYPING_STAR_CPM) return 3;
  if (stats.accuracy >= TYPING_STAR_ACCURACY.two) return 2;
  return 1;
}

function recordTyping(id, stats) {
  mutateProgress((data) => {
    const record = lessonRecord(id);
    const previousBest = record.typing?.best;
    const better = !previousBest || stats.accuracy > previousBest.accuracy || (stats.accuracy === previousBest.accuracy && stats.cpm > previousBest.cpm);
    const stars = typingStars(stats);
    const previousStars = typingStars(previousBest);
    record.typing = {
      best: better ? stats : previousBest,
      last: stats,
      attempts: (record.typing?.attempts ?? 0) + 1,
      at: new Date().toISOString(),
    };
    addXp(data, (record.typing.attempts === 1 ? XP.typingFinish : 0) + Math.max(0, stars - previousStars) * XP.typingStar, Math.max(1, Math.round(stats.seconds / 60)));
    for (const { expected, typed } of stats.errors) {
      data.keyErrors[expected] = (data.keyErrors[expected] || 0) + 1;
      if (typed && /[؀-ۿ]/.test(typed)) {
        const pair = `${expected}→${typed}`;
        data.confusions[pair] = (data.confusions[pair] || 0) + 1;
      }
    }
  });
}

function recordSpelling(id, result) {
  mutateProgress((data) => {
    const record = lessonRecord(id);
    const perfect = result.firstTry === result.total;
    const fresh = !record.spelling;
    record.spelling = {
      best: Math.max(result.firstTry, record.spelling?.best ?? 0),
      total: result.total,
      attempts: (record.spelling?.attempts ?? 0) + 1,
      at: new Date().toISOString(),
    };
    addXp(data, (fresh ? XP.spellingFinish : 0) + (perfect && (fresh || record.spelling.best < result.total) ? XP.spellingPerfect : 0), 2);
    for (const { expected, chosen } of result.confusions) {
      const pair = `${expected}→${chosen}`;
      data.confusions[pair] = (data.confusions[pair] || 0) + 1;
    }
  });
}

function recordSettings(patch) {
  mutateProgress((data) => Object.assign(data.settings, patch));
}

function recordName(name) {
  mutateProgress((data) => {
    data.name = String(name).trim().slice(0, 40);
  });
}

// ---------- derived numbers ----------

function lessonStars(id) {
  const record = progressState.data.lessons[id];
  if (!record || !record.read) return 0;
  if (!record.quiz) return 0;
  const quizFull = record.quiz.best === record.quiz.total;
  if (!record.typing) return 1;
  const typing = record.typing.best;
  if (quizFull && typing.accuracy >= 97 && record.spelling) return 3;
  return 2;
}

function lessonDone(id) {
  return lessonStars(id) >= 2;
}

function totalXp() {
  return Object.values(progressState.data.days).reduce((sum, day) => sum + day.xp, 0);
}

function levelFor(xp) {
  let current = LEVELS[0];
  for (const level of LEVELS) if (xp >= level.xp) current = level;
  const next = LEVELS[LEVELS.indexOf(current) + 1] || null;
  return { ...current, next, ratio: next ? (xp - current.xp) / (next.xp - current.xp) : 1 };
}

function streakDays() {
  const days = progressState.data.days;
  let count = 0;
  const cursor = new Date();
  // today counts if practised; otherwise the streak is measured up to yesterday
  if (!days[todayKey()]) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (!days[key] || days[key].xp <= 0) break;
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function bestTyping() {
  const records = Object.values(progressState.data.lessons).map((record) => record.typing?.best).filter(Boolean);
  if (!records.length) return null;
  return {
    cpm: Math.max(...records.map((stats) => stats.cpm)),
    accuracy: Math.round(records.reduce((sum, stats) => sum + stats.accuracy, 0) / records.length),
  };
}

function recentTyping(limit = 12) {
  return Object.values(progressState.data.lessons)
    .map((record) => record.typing?.last)
    .filter(Boolean)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(-limit);
}

function worstConfusions(limit = 5) {
  return Object.entries(progressState.data.confusions).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function totalMinutes() {
  return Object.values(progressState.data.days).reduce((sum, day) => sum + day.minutes, 0);
}
