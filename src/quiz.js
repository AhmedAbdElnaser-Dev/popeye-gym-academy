// ---------- quiz: one question at a time, instant feedback with the reason ----------

class Quiz {
  /** @param {{questions: {q: string, options: string[], answer: number, why: string}[], onFinish: Function}} options */
  constructor({ questions, onFinish }) {
    this.questions = questions;
    this.onFinish = onFinish;
    this.current = 0;
    this.correct = 0;
    this.answered = false;
  }

  mount(root) {
    this.root = root;
    root.addEventListener("click", (event) => {
      const option = event.target.closest("[data-option]");
      if (option && !this.answered) return this.answer(Number(option.dataset.option));
      if (event.target.closest("[data-next]")) return this.next();
    });
    this.render();
  }

  render() {
    const question = this.questions[this.current];
    this.answered = false;
    this.root.innerHTML = `
      <div class="quiz">
        <div class="quiz__head">
          <span class="quiz__count">سؤال ${this.current + 1} من ${this.questions.length}</span>
          <span class="quiz__score">${ICONS.check} <b>${this.correct}</b> صح</span>
        </div>
        <h3 class="quiz__q">${esc(question.q)}</h3>
        <div class="quiz__options">${question.options.map((option, i) =>
          `<button type="button" class="quiz__opt" data-option="${i}"><span class="quiz__letter">${["أ", "ب", "ج", "د"][i]}</span><span>${esc(option)}</span></button>`).join("")}</div>
        <div class="quiz__feedback" data-feedback hidden></div>
      </div>`;
  }

  answer(choice) {
    const question = this.questions[this.current];
    this.answered = true;
    const right = choice === question.answer;
    if (right) this.correct++;
    this.root.querySelectorAll(".quiz__opt").forEach((button, i) => {
      button.disabled = true;
      if (i === question.answer) button.classList.add("is-right");
      else if (i === choice) button.classList.add("is-wrong");
    });
    const feedback = this.root.querySelector("[data-feedback]");
    feedback.hidden = false;
    feedback.className = `quiz__feedback ${right ? "is-right" : "is-wrong"}`;
    const last = this.current === this.questions.length - 1;
    feedback.innerHTML = `<b>${right ? "صح! 👏" : "مش صح"}</b><p>${esc(question.why)}</p>
      <button type="button" class="btn btn--primary" data-next>${last ? "شوف النتيجة" : "السؤال الجاي"} ${ICONS.next}</button>`;
    feedback.querySelector("[data-next]").focus();
    this.root.querySelector(".quiz__score b").textContent = this.correct;
  }

  next() {
    if (this.current < this.questions.length - 1) {
      this.current++;
      this.render();
      return;
    }
    this.onFinish?.({ correct: this.correct, total: this.questions.length });
  }
}
