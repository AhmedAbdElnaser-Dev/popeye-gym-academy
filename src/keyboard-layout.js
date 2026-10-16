// ---------- Arabic (101) keyboard: physical key → [unshifted, shifted] ----------

const KEY_ROWS = [
  [["Backquote", "ذ", "ّ"], ["Digit1", "1", "!"], ["Digit2", "2", "@"], ["Digit3", "3", "#"], ["Digit4", "4", "$"], ["Digit5", "5", "%"],
    ["Digit6", "6", "^"], ["Digit7", "7", "&"], ["Digit8", "8", "*"], ["Digit9", "9", ")"], ["Digit0", "0", "("], ["Minus", "-", "_"],
    ["Equal", "=", "+"], ["Backspace", "⌫", ""]],
  [["Tab", "⇥", ""], ["KeyQ", "ض", "َ"], ["KeyW", "ص", "ً"], ["KeyE", "ث", "ُ"], ["KeyR", "ق", "ٌ"], ["KeyT", "ف", "لإ"], ["KeyY", "غ", "إ"],
    ["KeyU", "ع", "‘"], ["KeyI", "ه", "÷"], ["KeyO", "خ", "×"], ["KeyP", "ح", "؛"], ["BracketLeft", "ج", "<"], ["BracketRight", "د", ">"],
    ["Backslash", "\\", "|"]],
  [["CapsLock", "⇪", ""], ["KeyA", "ش", "ِ"], ["KeyS", "س", "ٍ"], ["KeyD", "ي", "]"], ["KeyF", "ب", "["], ["KeyG", "ل", "لأ"], ["KeyH", "ا", "أ"],
    ["KeyJ", "ت", "ـ"], ["KeyK", "ن", "،"], ["KeyL", "م", "/"], ["Semicolon", "ك", ":"], ["Quote", "ط", "\""], ["Enter", "⏎", ""]],
  [["ShiftLeft", "⇧", ""], ["KeyZ", "ئ", "~"], ["KeyX", "ء", "ْ"], ["KeyC", "ؤ", "}"], ["KeyV", "ر", "{"], ["KeyB", "لا", "لآ"], ["KeyN", "ى", "آ"],
    ["KeyM", "ة", "’"], ["Comma", "و", ","], ["Period", "ز", "."], ["Slash", "ظ", "؟"], ["ShiftRight", "⇧", ""]],
  [["Space", " ", ""]],
];

const WIDE_KEYS = { Backspace: 2, Tab: 1.5, Backslash: 1.5, CapsLock: 1.8, Enter: 2.2, ShiftLeft: 2.4, ShiftRight: 2.6, Space: 7 };

/** character → { code, shift } for everything the layout can type with one key */
const KEY_INDEX = (() => {
  const index = {};
  for (const row of KEY_ROWS) {
    for (const [code, base, shifted] of row) {
      if ([...base].length === 1 && !(base in index)) index[base] = { code, shift: false };
      if ([...shifted].length === 1 && !(shifted in index)) index[shifted] = { code, shift: true };
    }
  }
  return index;
})();

// keys on the left half of their row: the comfortable Shift for them is the right one
const LEFT_HALF_KEYS = new Set(KEY_ROWS.flatMap((row) => row.slice(0, Math.ceil(row.length / 2)).map(([code]) => code)));

function keyFor(char) {
  return KEY_INDEX[char] || null;
}

function isLeftHalf(code) {
  return LEFT_HALF_KEYS.has(code);
}

/** "شيفت ⇧ + ا" for characters that need Shift, empty otherwise */
function shiftHint(char) {
  const key = keyFor(char);
  if (!key?.shift) return "";
  const base = KEY_ROWS.flat().find(([code]) => code === key.code)?.[1] ?? "";
  return `شيفت ⇧ + ${base}`;
}
