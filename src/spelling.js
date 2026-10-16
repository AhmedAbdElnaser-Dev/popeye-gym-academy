// ---------- spelling drill (إملاء): pick the right letter, then write the word from memory ----------

const SPELLING_FLASH_MS = 2600;

class SpellingDrill {
  /**
   * @param {{items: {word: string, blank: number, choices: string[], hint?: string}[], onFinish: Function}} options
   * blank = index of the tested letter inside word; choices include the correct letter
   */
  constructor({ items, onFinish }) {
    this.items = items;
    this.onFinish = onFinish;
    this.current = 0;
    this.firstTry = 0;
    this.confusions = [];
    this.typedErrors = 0;
    this.attempted = false;
    this.voice = pickArabicVoice();
  }

  mount(root) {
    this.root = root;
    root.addEventListener("click", (event) => {
      const choice = event.target.closest("[data-choice]");
      if (choice && !choice.disabled) return this.choose(choice.dataset.choice, choice);
      if (event.target.closest("[data-speak]")) return this.speak();
      if (event.target.closest("[data-write]")) return this.write();
    });
    this.render();
  }

  item() {
    return this.items[this.current];
  }

  render() {
    const { word, blank, choices, hint } = this.item();
    const letters = [...word];
    const correct = letters[blank];
    this.attempted = false;
    this.phase = "choose";
    const shown = letters.map((letter, i) => (i === blank ? '<span class="sp-gap">؟</span>' : esc(letter))).join("");
    this.root.innerHTML = `
      <div class="spell">
        <div class="spell__head"><span>كلمة ${this.current + 1} من ${this.items.length}</span>${this.voice ? `<button type="button" class="btn btn--ghost btn--sm" data-speak>${ICONS.sound}<span>اسمعها</span></button>` : ""}</div>
        <p class="spell__ask">إيه الحرف الناقص؟</p>
        <div class="spell__word" dir="rtl">${shown}</div>
        ${hint ? `<p class="spell__hint">${esc(hint)}</p>` : ""}
        <div class="spell__choices">${shuffle(choices).map((letter) => `<button type="button" class="spell__choice" data-choice="${esc(letter)}">${esc(letter)}</button>`).join("")}</div>
        <div class="spell__feedback" data-feedback hidden></div>
        <div class="spell__write" data-writebox hidden></div>
      </div>`;
    this.correct = correct;
    this.wordEl = this.root.querySelector(".spell__word");
    if (this.voice) this.speak();
  }

  choose(letter, button) {
    const right = letter === this.correct;
    if (!this.attempted) {
      this.attempted = true;
      if (right) this.firstTry++;
      else this.confusions.push({ expected: this.correct, chosen: letter });
    }
    button.classList.add(right ? "is-right" : "is-wrong");
    if (!right) {
      button.disabled = true;
      return;
    }
    this.root.querySelectorAll(".spell__choice").forEach((choice) => { choice.disabled = true; });
    this.wordEl.innerHTML = [...this.item().word].map((ch, i) => (i === this.item().blank ? `<span class="sp-fill">${esc(ch)}</span>` : esc(ch))).join("");
    const feedback = this.root.querySelector("[data-feedback]");
    feedback.hidden = false;
    feedback.innerHTML = `<b>تمام ✔</b> بصّ على الكلمة كويس… هتختفي وتكتبها من دماغك.
      <button type="button" class="btn btn--primary" data-write>جاهز، اكتبها ${ICONS.next}</button>`;
    feedback.querySelector("[data-write]").focus();
  }

  write() {
    this.phase = "write";
    this.root.querySelector("[data-feedback]").hidden = true;
    const box = this.root.querySelector("[data-writebox]");
    box.hidden = false;
    box.innerHTML = `<p class="spell__ask">اكتب الكلمة</p><div data-drill></div>`;
    this.wordEl.classList.add("is-hidden");
    setTimeout(() => { this.wordEl.textContent = "• • •"; }, 200);
    this.drill = new TypingDrill({
      text: this.item().word,
      strict: true,
      keyboard: false,
      compact: true,
      onFinish: (stats) => {
        this.typedErrors += stats.errors.length;
        box.insertAdjacentHTML("beforeend", `<p class="spell__done">${stats.errors.length ? `كتبتها بعد ${stats.errors.length} غلطة — ماشي، المرة الجاية أحسن.` : "كتبتها صح من أول مرة! 💪"}</p>`);
        setTimeout(() => this.next(), 1300);
      },
    });
    this.drill.mount(box.querySelector("[data-drill]"));
  }

  speak() {
    if (!this.voice) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(this.item().word);
    utterance.voice = this.voice;
    utterance.lang = this.voice.lang;
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  }

  next() {
    this.drill?.destroy();
    if (this.current < this.items.length - 1) {
      this.current++;
      this.render();
      return;
    }
    this.onFinish?.({ total: this.items.length, firstTry: this.firstTry, confusions: this.confusions, typedErrors: this.typedErrors });
  }
}

function pickArabicVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang.toLowerCase().startsWith("ar-eg"))
    || voices.find((voice) => voice.lang.toLowerCase().startsWith("ar"))
    || null;
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
