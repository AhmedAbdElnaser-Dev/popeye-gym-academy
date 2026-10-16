// Validates content/unit*.js against the rules build.py enforces. Usage: node tools/check_content.mjs [files...]
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(join(ROOT, "content")).filter((f) => /^unit.*\.js$/.test(f)).sort().map((f) => join(ROOT, "content", f));
const exerciseIds = new Set(Object.keys(JSON.parse(readFileSync(join(ROOT, "assets/exercises/index.json"), "utf8"))));
const MUSCLES = new Set(["chest", "shoulders", "biceps", "triceps", "forearms", "abdominals", "obliques", "lats", "traps", "middle back", "lower back", "glutes", "quadriceps", "hamstrings", "calves", "adductors", "neck", "abductors"]);
const TYPING = /^[ء-ي0-9 ،.؟:؛\-]+$/;
const TASHKEEL = /[ً-ْ]/;

const CONTENT_UNITS = [];
const source = files.map((f) => readFileSync(f, "utf8")).join("\n");
try {
  new Function("CONTENT_UNITS", source)(CONTENT_UNITS);
} catch (error) {
  console.error("content does not evaluate:", error.message);
  process.exit(1);
}

const problems = [];
const seen = new Set();
for (const unit of CONTENT_UNITS) {
  if (!unit.id || !unit.title || !unit.subtitle || !unit.icon || !Array.isArray(unit.lessons)) problems.push(`unit ${unit.id}: needs id/title/subtitle/icon/lessons`);
  for (const lesson of unit.lessons || []) {
    const where = `${unit.id}/${lesson.id}`;
    if (!lesson.id || seen.has(lesson.id)) problems.push(`${where}: duplicate or missing id`);
    seen.add(lesson.id);
    for (const key of ["title", "subtitle", "minutes", "sections", "quiz", "typing", "spelling"]) if (!(key in lesson)) problems.push(`${where}: missing ${key}`);
    for (const m of lesson.muscles || []) if (!MUSCLES.has(m)) problems.push(`${where}: unknown muscle key "${m}"`);
    const refs = [];
    if (lesson.hero) refs.push(lesson.hero.ex);
    for (const s of lesson.sections || []) for (const e of s.exercises || []) refs.push(e.ex);
    for (const ref of refs) if (!exerciseIds.has(ref)) problems.push(`${where}: unknown exercise image id "${ref}"`);
    const typing = lesson.typing || "";
    if (!TYPING.test(typing)) problems.push(`${where}: typing text has untypeable characters: ${[...new Set([...typing].filter((c) => !TYPING.test(c)))].join(" ")}`);
    if (typing.length < 60 || typing.length > 420) problems.push(`${where}: typing text length ${typing.length} (want 60-420)`);
    for (const s of lesson.sections || []) {
      const text = [s.h, s.p, s.tip, s.warn, ...(s.list || [])].filter(Boolean).join(" ");
      if (TASHKEEL.test(text)) problems.push(`${where}: section text contains tashkeel`);
      if (/[A-Za-z]/.test(text)) problems.push(`${where}: section text contains Latin letters: "${text.match(/[A-Za-z][A-Za-z ]*/)[0]}"`);
    }
    if ((lesson.quiz || []).length !== 3) problems.push(`${where}: quiz has ${(lesson.quiz || []).length} questions (want 3)`);
    (lesson.quiz || []).forEach((q, i) => {
      if (!Array.isArray(q.options) || q.options.length !== 3) problems.push(`${where}: quiz #${i + 1} needs 3 options`);
      if (!(q.answer >= 0 && q.answer < (q.options || []).length)) problems.push(`${where}: quiz #${i + 1} answer out of range`);
      if (!q.why) problems.push(`${where}: quiz #${i + 1} missing why`);
    });
    const spelling = lesson.spelling || [];
    if (spelling.length < 3 || spelling.length > 6) problems.push(`${where}: spelling has ${spelling.length} items (want 3-6)`);
    spelling.forEach((item, i) => {
      const letters = [...(item.word || "")];
      if (!(item.blank >= 0 && item.blank < letters.length)) problems.push(`${where}: spelling #${i + 1} blank out of range`);
      else if (!(item.choices || []).includes(letters[item.blank])) problems.push(`${where}: spelling #${i + 1} choices [${item.choices}] miss "${letters[item.blank]}" of ${item.word}`);
      if (!item.choices || new Set(item.choices).size !== item.choices.length || item.choices.length < 2 || item.choices.length > 3) problems.push(`${where}: spelling #${i + 1} choices must be 2-3 distinct letters`);
      if (TASHKEEL.test(item.word || "")) problems.push(`${where}: spelling #${i + 1} word has tashkeel`);
      if (/\s/.test(item.word || "")) problems.push(`${where}: spelling #${i + 1} word must be a single word`);
    });
  }
}
if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`OK — ${CONTENT_UNITS.length} unit(s), ${seen.size} lesson(s)`);
