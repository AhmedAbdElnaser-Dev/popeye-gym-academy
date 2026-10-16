// ---------- Arabic (101) keyboard: physical key → [unshifted, shifted], finger per key ----------

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

// finger per key: hand + finger, colour-coded on screen
const FINGERS = {
  "l-pinky": { hand: "الشمال", finger: "الصباع الصغير", keys: ["Backquote", "Digit1", "Tab", "KeyQ", "CapsLock", "KeyA", "ShiftLeft", "KeyZ"] },
  "l-ring": { hand: "الشمال", finger: "البنصر", keys: ["Digit2", "KeyW", "KeyS", "KeyX"] },
  "l-middle": { hand: "الشمال", finger: "الوسطى", keys: ["Digit3", "KeyE", "KeyD", "KeyC"] },
  "l-index": { hand: "الشمال", finger: "السبابة", keys: ["Digit4", "Digit5", "KeyR", "KeyT", "KeyF", "KeyG", "KeyV", "KeyB"] },
  "r-index": { hand: "اليمين", finger: "السبابة", keys: ["Digit6", "Digit7", "KeyY", "KeyU", "KeyH", "KeyJ", "KeyN", "KeyM"] },
  "r-middle": { hand: "اليمين", finger: "الوسطى", keys: ["Digit8", "KeyI", "KeyK", "Comma"] },
  "r-ring": { hand: "اليمين", finger: "البنصر", keys: ["Digit9", "KeyO", "KeyL", "Period"] },
  "r-pinky": { hand: "اليمين", finger: "الصباع الصغير", keys: ["Digit0", "Minus", "Equal", "Backspace", "KeyP", "BracketLeft", "BracketRight", "Backslash", "Semicolon", "Quote", "Enter", "Slash", "ShiftRight"] },
  thumb: { hand: "أي إيد", finger: "الإبهام", keys: ["Space"] },
};

const FINGER_OF_KEY = Object.fromEntries(Object.entries(FINGERS).flatMap(([id, group]) => group.keys.map((code) => [code, id])));
const HOME_ROW_KEYS = new Set(["KeyA", "KeyS", "KeyD", "KeyF", "KeyJ", "KeyK", "KeyL", "Semicolon"]);

/** character → { code, shift } for everything the layout can type with one key */
const KEY_INDEX = (() => {
  const index = {};
  for (const row of KEY_ROWS) {
    for (const [code, base, shifted] of row) {
      if ([...base].length === 1 && !(base in index)) index[base] = { code, shift: false };
      if ([...shifted].length === 1 && !(shifted in index)) index[shifted] = { code, shift: true };
    }
  }
  index[" "] = index[" "];
  return index;
})();

function keyFor(char) {
  return KEY_INDEX[char] || null;
}

function fingerHint(char) {
  const key = keyFor(char);
  if (!key) return "";
  const finger = FINGERS[FINGER_OF_KEY[key.code]];
  if (!finger) return "";
  const shift = key.shift ? " + Shift" : "";
  return `${finger.hand} · ${finger.finger}${shift}`;
}
