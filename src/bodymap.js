// ---------- body map: a simple front/back figure with clickable muscle regions ----------

const MUSCLE_INFO = {
  chest: { name: "الصدر", where: "قدام الجسم، تحت الرقبة", does: "بيزق كل حاجة لقدام" },
  shoulders: { name: "الكتف", where: "فوق الدراع من الجنبين", does: "بيرفع دراعك لفوق وللجنب" },
  biceps: { name: "الباي", where: "قدام الدراع من فوق", does: "بيتني الدراع، زي ما بتشيل شنطة" },
  triceps: { name: "التراي", where: "ورا الدراع من فوق", does: "بيفرد الدراع، وبيساعد في الزق" },
  forearms: { name: "الساعد", where: "من الكوع للرسغ", does: "قبضة إيدك كلها منه" },
  abdominals: { name: "البطن", where: "قدام الجسم من تحت الصدر", does: "بيثبت جذعك وبيتني الجسم لقدام" },
  obliques: { name: "جناب البطن", where: "على جنبين البطن", does: "بيلف الجذع وبيميله" },
  lats: { name: "الظهر (اللاتس)", where: "جنبين الظهر، تحت الإبط", does: "بيسحب أي حاجة ناحيتك" },
  traps: { name: "الترابيس", where: "من الرقبة لنص الظهر", does: "بيرفع الكتف وبيثبت لوح الكتف" },
  "middle back": { name: "وسط الظهر", where: "بين لوحي الكتف", does: "بيقرب الكتفين لبعض في السحب" },
  "lower back": { name: "أسفل الظهر", where: "فوق المؤخرة على طول", does: "بيحافظ على ظهرك مستقيم" },
  glutes: { name: "المؤخرة", where: "أكبر عضلة في جسمك", does: "بتفرد الفخذ، في السكوات والديدليفت" },
  quadriceps: { name: "قدام الفخذ", where: "من الحوض للركبة من قدام", does: "بيفرد الركبة، في السكوات والليج برس" },
  hamstrings: { name: "ورا الفخذ", where: "من المؤخرة للركبة من ورا", does: "بيتني الركبة وبيساعد في الديدليفت" },
  calves: { name: "السمانة", where: "ورا الرجل من تحت", does: "بترفعك على صوابعك" },
  adductors: { name: "داخل الفخذ", where: "من جوه الفخذين", does: "بيقفل الرجلين على بعض" },
  neck: { name: "الرقبة", where: "فوق الكتفين", does: "بتحرك الراس وبتثبته" },
};
const MUSCLE_ALIASES = { abductors: "glutes", back: "lats" };

const mirrorX = (x) => 220 - x;

/** A stadium shape between two points (upper arm, thigh, …). */
function capsule(x1, y1, x2, y2, width) {
  const r = width / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * r;
  const ny = (dx / length) * r;
  return `M${x1 + nx} ${y1 + ny} L${x2 + nx} ${y2 + ny} A${r} ${r} 0 0 1 ${x2 - nx} ${y2 - ny} L${x1 - nx} ${y1 - ny} A${r} ${r} 0 0 1 ${x1 + nx} ${y1 + ny} Z`;
}

function mirrored(path) {
  // mirror a path horizontally by flipping x through 110; only M/L/A/Q/C with absolute coords are used here
  return path.replace(/([MLAQCZ])([^MLAQCZ]*)/g, (_, cmd, rest) => {
    if (cmd === "Z") return "Z";
    const nums = rest.trim().split(/[\s,]+/).map(Number);
    if (cmd === "A") {
      const out = [];
      for (let i = 0; i < nums.length; i += 7) {
        const [rx, ry, rot, large, sweep, x, y] = nums.slice(i, i + 7);
        out.push(`${rx} ${ry} ${rot} ${large} ${sweep ? 0 : 1} ${mirrorX(x)} ${y}`);
      }
      return `A${out.join(" ")}`;
    }
    const out = [];
    for (let i = 0; i < nums.length; i += 2) out.push(`${mirrorX(nums[i])} ${nums[i + 1]}`);
    return `${cmd}${out.join(" ")}`;
  });
}

const SILHOUETTE = [
  "M110 14 a24 24 0 1 1 -0.1 0 Z",
  "M98 60 h24 v20 h-24 Z",
  "M58 80 Q110 70 162 80 L156 150 Q140 190 142 232 L78 232 Q80 190 64 150 Z",
  capsule(50, 92, 36, 170, 26), capsule(36, 172, 26, 246, 20), "M24 248 a11 11 0 1 1 -0.1 0 Z",
  capsule(170, 92, 184, 170, 26), capsule(184, 172, 194, 246, 20), "M196 248 a11 11 0 1 1 -0.1 0 Z",
  capsule(92, 236, 88, 336, 40), capsule(88, 338, 86, 414, 28), "M70 418 h32 a8 8 0 0 1 0 16 h-32 a8 8 0 0 1 0 -16 Z",
  capsule(128, 236, 132, 336, 40), capsule(132, 338, 134, 414, 28), "M118 418 h32 a8 8 0 0 1 0 16 h-32 a8 8 0 0 1 0 -16 Z",
];

const LEFT_PEC = "M70 94 Q110 86 110 122 Q104 136 80 130 Q62 120 70 94 Z";
const LEFT_LAT = "M66 108 Q96 136 104 160 L104 206 Q84 200 74 182 Q62 150 66 108 Z";

const FRONT_REGIONS = {
  neck: ["M98 60 h24 v20 h-24 Z"],
  chest: [LEFT_PEC, mirrored(LEFT_PEC)],
  shoulders: ["M44 82 a13 16 0 1 1 -0.1 0 Z", "M176 82 a13 16 0 1 1 -0.1 0 Z"],
  biceps: [capsule(48, 110, 41, 160, 16), capsule(172, 110, 179, 160, 16)],
  forearms: [capsule(36, 182, 28, 236, 14), capsule(184, 182, 192, 236, 14)],
  abdominals: ["M92 130 h36 a8 8 0 0 1 8 8 v58 a8 8 0 0 1 -8 8 h-36 a8 8 0 0 1 -8 -8 v-58 a8 8 0 0 1 8 -8 Z"],
  obliques: [capsule(82, 142, 80, 200, 9), capsule(138, 142, 140, 200, 9)],
  quadriceps: [capsule(92, 244, 88, 330, 30), capsule(128, 244, 132, 330, 30)],
  adductors: [capsule(106, 246, 102, 300, 9), capsule(114, 246, 118, 300, 9)],
};

const BACK_REGIONS = {
  neck: ["M98 60 h24 v20 h-24 Z"],
  traps: ["M110 68 L152 92 L120 148 L100 148 L68 92 Z"],
  shoulders: ["M44 82 a13 16 0 1 1 -0.1 0 Z", "M176 82 a13 16 0 1 1 -0.1 0 Z"],
  triceps: [capsule(48, 110, 41, 160, 16), capsule(172, 110, 179, 160, 16)],
  forearms: [capsule(36, 182, 28, 236, 14), capsule(184, 182, 192, 236, 14)],
  lats: [LEFT_LAT, mirrored(LEFT_LAT)],
  "middle back": ["M96 118 h28 a6 6 0 0 1 6 6 v36 a6 6 0 0 1 -6 6 h-28 a6 6 0 0 1 -6 -6 v-36 a6 6 0 0 1 6 -6 Z"],
  "lower back": ["M96 196 h28 a6 6 0 0 1 6 6 v24 a6 6 0 0 1 -6 6 h-28 a6 6 0 0 1 -6 -6 v-24 a6 6 0 0 1 6 -6 Z"],
  glutes: ["M94 250 a20 22 0 1 1 -0.1 0 Z", "M126 250 a20 22 0 1 1 -0.1 0 Z"],
  hamstrings: [capsule(90, 282, 88, 334, 28), capsule(130, 282, 132, 334, 28)],
  calves: [capsule(86, 348, 84, 404, 22), capsule(134, 348, 136, 404, 22)],
};

function normalizeMuscleKey(key) {
  return MUSCLE_ALIASES[key] || key;
}

// detail lines drawn over the muscles: abs blocks, pec split, glute split
const FRONT_LINES = ["M110 134 V200", "M94 152 H126", "M94 174 H126", "M110 90 V124"];
const BACK_LINES = ["M110 70 V148", "M110 230 V272"];

function bodyFigure(regions, lines, active, label) {
  const paths = Object.entries(regions).map(([key, shapes]) => shapes.map((d) =>
    `<path class="m${active.has(key) ? " on" : ""}" data-muscle="${key}" d="${d}"><title>${MUSCLE_INFO[key]?.name ?? key}</title></path>`).join("")).join("");
  return `<svg class="body" viewBox="0 0 220 440" role="img" aria-label="${label}">
    <g class="body__skin">${SILHOUETTE.map((d) => `<path d="${d}"/>`).join("")}</g>
    <g class="body__muscles">${paths}</g>
    <g class="body__lines">${lines.map((d) => `<path d="${d}"/>`).join("")}</g>
    <text class="body__label" x="110" y="438" text-anchor="middle">${label}</text>
  </svg>`;
}

/** Both figures; `keys` light up. Interactive maps answer clicks through [data-muscle]. */
function renderBodyMap(keys = [], { interactive = false } = {}) {
  const active = new Set(keys.map(normalizeMuscleKey));
  return `<div class="bodymap${interactive ? " bodymap--live" : ""}">
    ${bodyFigure(FRONT_REGIONS, FRONT_LINES, active, "من قدام")}
    ${bodyFigure(BACK_REGIONS, BACK_LINES, active, "من ورا")}
  </div>`;
}
