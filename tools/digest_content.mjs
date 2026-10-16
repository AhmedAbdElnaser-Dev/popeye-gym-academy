// Prints a compact reading digest of content/unit*.js for review. Usage: node tools/digest_content.mjs [unitId]
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const only = process.argv[2];
const files = readdirSync(join(ROOT, "content")).filter((f) => /^unit.*\.js$/.test(f)).sort();
const CONTENT_UNITS = [];
new Function("CONTENT_UNITS", files.map((f) => readFileSync(join(ROOT, "content", f), "utf8")).join("\n"))(CONTENT_UNITS);

for (const unit of CONTENT_UNITS) {
  if (only && unit.id !== only) continue;
  console.log(`\n==== ${unit.id} ${unit.title} — ${unit.subtitle} (${unit.lessons.length} lessons)`);
  for (const lesson of unit.lessons) {
    console.log(`\n--- ${lesson.id} | ${lesson.title} — ${lesson.subtitle} | ${lesson.minutes} min | muscles: ${(lesson.muscles || []).join(",")} | hero: ${lesson.hero?.ex ?? "-"}`);
    for (const s of lesson.sections) {
      if (s.tip) console.log(`  💡 ${s.tip}`);
      else if (s.warn) console.log(`  ⚠ ${s.warn}`);
      else if (s.kv) console.log(`  [kv] ${s.kv.map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
      else if (s.table) console.log(`  [table ${s.table.head.join("|")}] ${s.table.rows.map((r) => r.join("|")).join(" / ")}`);
      else {
        console.log(`  # ${s.h ?? ""}${s.p ? `\n    ${s.p}` : ""}`);
        for (const li of s.list || []) console.log(`    • ${li}`);
        for (const e of s.exercises || []) console.log(`    [img ${e.ex}] ${e.name} — ${e.note ?? ""}`);
      }
    }
    lesson.quiz.forEach((q, i) => console.log(`  Q${i + 1}: ${q.q} → ${q.options.map((o, j) => (j === q.answer ? `[${o}]` : o)).join(" / ")}  (${q.why})`));
    console.log(`  ⌨ (${lesson.typing.length}) ${lesson.typing}`);
    console.log(`  ✎ ${lesson.spelling.map((s) => `${s.word}[${s.blank}:${[...s.word][s.blank]}|${s.choices.join("")}]`).join("  ")}`);
  }
}
