// ---------- typing drill: copy the text, every letter turns green or red, on-screen keyboard shows the next key ----------

const ARABIC_LETTER = /[؀-ۿ]/;
const LATIN_LETTER = /[A-Za-z]/;
const SPEED_SAMPLE_MS = 500;
const LAYOUT_HINT_COOLDOWN_MS = 4000;

class TypingDrill {
  /**
   * @param {object} options
   * @param {string} options.text           text to copy (no tashkeel)
   * @param {boolean} [options.strict=true] wrong letter blocks until fixed
   * @param {boolean} [options.keyboard]    show the on-screen keyboard
   * @param {boolean} [options.compact]     single word mode (spelling drill)
   * @param {(stats: object) => void} options.onFinish
   */
  constructor({ text, strict = true, keyboard = true, compact = false, onFinish }) {
    this.text = text.replace(/\s+/g, " ").trim();
    this.chars = [...this.text];
    this.strict = strict;
    this.showKeyboard = keyboard;
    this.compact = compact;
    this.onFinish = onFinish;
    this.index = 0;
    this.errors = [];
    this.wrong = new Set(); // indices typed wrong at least once (lenient mode keeps them red)
    this.startedAt = 0;
    this.finished = false;
    this.timer = 0;
    this.lastLayoutHint = 0;
    this.composing = false;
  }

  mount(root) {
    this.root = root;
    root.innerHTML = `
      <div class="typing${this.compact ? " typing--compact" : ""}">
        ${this.compact ? "" : `<div class="typing__bar" aria-live="polite">
          <span>حرف <b data-pos>0</b> من <b>${this.chars.length}</b></span>
          <span>الدقة <b data-acc>100%</b></span>
          <span>السرعة <b data-cpm>0</b> <small>حرف/دقيقة</small></span>
          <span class="typing__errors">أخطاء <b data-err>0</b></span>
        </div>`}
        <div class="typing__text" dir="rtl" role="textbox" aria-label="المكان اللي بتكتب فيه" tabindex="0"></div>
        <input class="typing__input" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" aria-hidden="true" tabindex="-1">
        <p class="typing__hint" data-hint aria-live="polite"></p>
        ${this.showKeyboard ? '<div class="kbd" data-keyboard aria-hidden="true"></div>' : ""}
      </div>`;
    this.textEl = root.querySelector(".typing__text");
    this.input = root.querySelector(".typing__input");
    this.hintEl = root.querySelector("[data-hint]");
    this.renderText();
    if (this.showKeyboard) renderKeyboard(root.querySelector("[data-keyboard]"));
    this.bind();
    this.update();
    this.focus();
  }

  renderText() {
    const words = this.text.split(" ");
    let position = 0;
    this.textEl.innerHTML = words.map((word, wordIndex) => {
      const letters = [...word].map((char) => `<span class="c" data-i="${position++}">${char === " " ? "&nbsp;" : esc(char)}</span>`).join("");
      const space = wordIndex < words.length - 1 ? `<span class="c sp" data-i="${position++}">&nbsp;</span>` : "";
      return `<span class="w">${letters}</span>${space}`;
    }).join("");
    this.spans = [...this.textEl.querySelectorAll(".c")];
  }

  bind() {
    this.textEl.addEventListener("click", () => this.focus());
    this.textEl.addEventListener("focus", () => this.focus());
    this.input.addEventListener("compositionstart", () => { this.composing = true; });
    this.input.addEventListener("compositionend", (event) => {
      this.composing = false;
      this.input.value = "";
      for (const char of event.data || "") this.processChar(char);
    });
    this.input.addEventListener("input", () => {
      if (this.composing) return;
      const value = this.input.value;
      this.input.value = "";
      for (const char of value) this.processChar(char);
    });
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace") {
        event.preventDefault();
        this.backspace();
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
      }
    });
    this.input.addEventListener("blur", () => this.root.querySelector(".typing")?.classList.remove("is-focused"));
    this.input.addEventListener("focus", () => this.root.querySelector(".typing")?.classList.add("is-focused"));
  }

  focus() {
    if (!this.finished) this.input.focus({ preventScroll: true });
  }

  processChar(char) {
    if (this.finished || this.index >= this.chars.length) return;
    if (char === "\n" || char === "\r") return;
    const expected = this.chars[this.index];
    if (!this.startedAt) this.start();

    if (char === expected || (expected === " " && char === " ")) {
      this.index++;
      if (this.index >= this.chars.length) this.finish();
      else this.update();
      return;
    }

    this.errors.push({ expected, typed: char, at: this.index });
    this.wrong.add(this.index);
    this.flashWrong();
    if (LATIN_LETTER.test(char) && ARABIC_LETTER.test(expected)) this.layoutHint();
    if (!this.strict) {
      this.index++;
      if (this.index >= this.chars.length) this.finish();
    }
    this.update();
  }

  backspace() {
    if (this.finished || this.index === 0) return;
    this.index--;
    this.update();
  }

  start() {
    this.startedAt = performance.now();
    this.timer = setInterval(() => this.updateStats(), SPEED_SAMPLE_MS);
  }

  flashWrong() {
    const span = this.spans[this.index];
    if (!span) return;
    span.classList.remove("shake");
    void span.offsetWidth;
    span.classList.add("shake", "bad");
  }

  layoutHint() {
    const now = performance.now();
    if (now - this.lastLayoutHint < LAYOUT_HINT_COOLDOWN_MS) return;
    this.lastLayoutHint = now;
    this.hintEl.innerHTML = `<b>الكيبورد لسه على الإنجليزي</b> — دوس <kbd>Alt</kbd> + <kbd>Shift</kbd> عشان تحوّله عربي`;
    this.hintEl.classList.add("is-warning");
    setTimeout(() => {
      this.hintEl.classList.remove("is-warning");
      this.update();
    }, LAYOUT_HINT_COOLDOWN_MS);
  }

  stats() {
    const correct = this.index;
    const seconds = this.startedAt ? (performance.now() - this.startedAt) / 1000 : 0;
    const minutes = Math.max(seconds, 1) / 60;
    const errors = this.errors.length;
    const accuracy = correct + errors ? Math.round((correct / (correct + errors)) * 100) : 100;
    const cpm = seconds >= 2 ? Math.round(correct / minutes) : 0;
    return { correct, errors, accuracy, cpm, seconds };
  }

  updateStats() {
    if (this.compact) return;
    const { accuracy, cpm, errors } = this.stats();
    this.root.querySelector("[data-pos]").textContent = this.index;
    this.root.querySelector("[data-acc]").textContent = `${accuracy}%`;
    this.root.querySelector("[data-cpm]").textContent = cpm;
    this.root.querySelector("[data-err]").textContent = errors;
  }

  update() {
    this.spans.forEach((span, i) => {
      const done = i < this.index;
      const slipped = this.wrong.has(i);
      span.classList.toggle("ok", done && !slipped);
      span.classList.toggle("fixed", done && slipped && this.strict);
      span.classList.toggle("bad", done && slipped && !this.strict);
      span.classList.toggle("cur", i === this.index);
      if (i > this.index) span.classList.remove("bad");
    });
    this.spans[this.index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
    this.updateStats();
    const next = this.chars[this.index];
    if (!this.hintEl.classList.contains("is-warning")) {
      this.hintEl.textContent = next ? shiftHint(next) : "";
    }
    if (this.showKeyboard) highlightKey(this.root, next);
  }

  finish() {
    this.finished = true;
    clearInterval(this.timer);
    this.update();
    const base = this.stats();
    const words = this.text.split(" ").length;
    const stats = {
      ...base,
      wpm: base.seconds >= 2 ? Math.round(words / (Math.max(base.seconds, 1) / 60)) : 0,
      length: this.chars.length,
      errors: this.errors.map(({ expected, typed }) => ({ expected, typed })),
      at: new Date().toISOString(),
    };
    this.input.blur();
    this.root.querySelector(".typing").classList.add("is-done");
    this.onFinish?.(stats);
  }

  destroy() {
    clearInterval(this.timer);
    this.finished = true;
  }
}

// ---------- on-screen keyboard ----------

function renderKeyboard(container) {
  container.innerHTML = KEY_ROWS.map((row) => `<div class="kbd__row">${row.map(([code, base, shifted]) => {
    const width = WIDE_KEYS[code] || 1;
    const special = base.length > 1 || base === "⇧" || base === "⌫" || base === "⏎" || base === "⇥" || base === "⇪";
    const label = code === "Space" ? "مسافة" : base;
    const sub = shifted && !special && [...shifted].length === 1 && !/[ً-ْ]/.test(shifted) ? shifted : "";
    return `<span class="k${special ? " k--special" : ""}" data-code="${code}" style="--w:${width}">
      <b>${esc(label)}</b>${sub ? `<i>${esc(sub)}</i>` : ""}</span>`;
  }).join("")}</div>`).join("");
}

function highlightKey(root, char) {
  root.querySelectorAll(".k.k-next, .k.k-shift").forEach((key) => key.classList.remove("k-next", "k-shift"));
  const key = keyFor(char);
  if (!key) return;
  root.querySelector(`.k[data-code="${key.code}"]`)?.classList.add("k-next");
  if (key.shift) {
    root.querySelector(`.k[data-code="${isLeftHalf(key.code) ? "ShiftRight" : "ShiftLeft"}"]`)?.classList.add("k-shift");
  }
}
