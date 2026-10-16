# Popeye Academy — content contract

Audience: a 16-year-old from an Egyptian village, new to the gym, weak at spelling and slow at typing.
Goal of every lesson: one gym idea he can use tomorrow, written so simply he never has to reread, and a
short typing + spelling drill built from the same words so the gym vocabulary and the spelling stick together.

## Voice (عامية مصرية بسيطة)

- اكتب بالعامية المصرية البسيطة. جمل قصيرة. كلمة واحدة سهلة أحسن من كلمتين صعبين.
- خاطبه بـ«إنت». زي ما كابتن في الجيم بيشرح لولد لسه داخل.
- المعلومة لازم تكون صح وآمنة للمبتدئين (أرقام مبتدئين: إحماء 5-10 دقايق، 8-12 عدة للتضخيم، راحة 60-90 ثانية،
  2-3 دقايق للتمارين التقيلة، زفير مع المجهود، الفورم قبل الوزن، مية، نوم 7-9 ساعات، بروتين في كل أكلة).
- ممنوع التشكيل. اكتب الهمزات والتاء المربوطة والألف المقصورة صح دايمًا — الولد بيتعلم الإملاء من نصوصك.
  (إنت، إيه، ليه، علشان، دلوقتي، كده، كتير، شوية، حاجة، لازم، ممكن، بس، برضه، أوي، خالص، جامد، تمام، ظهر — مش ضهر).
- أسماء التمارين زي ما بتتقال في الجيم المصري بحروف عربية: بنش برس، سكوات، ديدليفت، لات بول داون، سيتد رو، شولدر برس،
  لاترال ريز، بار كيرل، تراي بوش داون، ليج برس، ليج كيرل، كاف ريز. الإنجليزي بيظهر لوحده صغير من قاعدة الصور — ما تكتبهوش.
- ما تذكرش ماركات ولا مكملات ولا أدوية ولا رجيم قاسي. لو حاجة خطر قول «اسأل الكابتن».

## Lesson shape (JS object, see the example below)

```js
{
  id: "u1-chest",                       // unique, kebab-case, starts with the unit prefix
  title: "الصدر",                        // short
  subtitle: "العضلة اللي بتزق",           // ≤ 40 chars
  minutes: 4,                            // reading time
  muscles: ["chest"],                    // body-map keys to light up (may be [])
  hero: { ex: "Barbell_Bench_Press_-_Medium_Grip", caption: "بنش برس — أشهر تمرين للصدر" },
  sections: [
    { h: "هي فين؟", p: "..." },
    { h: "بتعمل إيه؟", p: "...", list: ["...", "..."] },
    { h: "تمارينها", exercises: [{ ex: "Pushups", name: "بوش أب", note: "من غير أي أدوات" }] },
    { h: "غلطات بتحصل كتير", list: ["...", "..."] },
    { kv: [["المجموعات", "3"], ["العدات", "8-12"]] },     // optional facts strip
    { tip: "..." },                                      // «نصيحة الكابتن» callout
    { warn: "..." }                                      // safety callout, optional
  ],
  quiz: [ { q: "...", options: ["...", "...", "..."], answer: 0, why: "..." } ],   // exactly 3 questions, 3 options each
  typing: "...",                          // 140-230 chars, 2-3 sentences from the lesson
  spelling: [ { word: "عضلة", blank: 3, choices: ["ة", "ه"], hint: "آخر حرف: تاء مربوطة ولا هاء؟" } ]  // 4-5 items
}
```

Rules the build enforces:
- `ex` ids must come from the exercise list given to you (assets/exercises/index.json).
- `typing` may contain only Arabic letters, spaces, digits, `،` `.` `؟` `:` `؛` and `-` between digits. No tashkeel, no Latin, no brackets, no quotes.
- `spelling[i].blank` is the 0-based index of the tested letter in `word`; `choices` (2-3) must include that letter and be distinct.
  Test the letters he actually confuses: ة/ه at word end, ى/ي, أ/ا/إ, ض/ظ, ذ/ز, ث/س, ص/س, ق/ك, ئ/ء/ؤ. Words come from the lesson.
- `quiz[i].answer` is a valid index; `why` explains in one friendly line.
- Muscle keys: chest, shoulders, biceps, triceps, forearms, abdominals, obliques, lats, traps, "middle back", "lower back",
  glutes, quadriceps, hamstrings, calves, adductors, neck.

## Example lesson (write every lesson at this level)

```js
{
  id: "u1-chest",
  title: "الصدر",
  subtitle: "العضلة اللي بتزق",
  minutes: 4,
  muscles: ["chest"],
  hero: { ex: "Barbell_Bench_Press_-_Medium_Grip", caption: "بنش برس — أشهر تمرين للصدر" },
  sections: [
    { h: "هي فين؟", p: "الصدر عضلة كبيرة في قدام جسمك، من تحت الرقبة لحد فوق البطن. حط إيدك على صدرك وازق الحيطة، هتحس بيها بتشد." },
    { h: "بتعمل إيه؟", p: "كل حاجة فيها زق لقدام: تزق باب تقيل، تعمل بوش أب، ترفع بار وإنت نايم على البنش.", list: ["بتقرب دراعك لقدام جسمك", "بتساعد الكتف والتراي في كل تمارين الزق"] },
    { h: "تمارينها", exercises: [
      { ex: "Barbell_Bench_Press_-_Medium_Grip", name: "بنش برس بالبار", note: "نايم على البنش، البار ينزل لنص صدرك ويطلع" },
      { ex: "Incline_Dumbbell_Press", name: "إنكلاين دمبل برس", note: "البنش مايل شوية علشان فوق الصدر" },
      { ex: "Pushups", name: "بوش أب", note: "من غير أي أدوات، تنفع في البيت" },
      { ex: "Dumbbell_Flyes", name: "دمبل فلاي", note: "بتفتح دراعك وتقفله زي ما تكون بتحضن" }
    ] },
    { h: "غلطات بتحصل كتير", list: ["تنزل البار بسرعة على صدرك", "ترفع ظهرك عن البنش علشان ترفع وزن أتقل", "تنسى تاخد نفس: شهيق وإنت بتنزل، زفير وإنت بتزق"] },
    { kv: [["المجموعات", "3"], ["العدات", "8-12"], ["الراحة", "60-90 ثانية"]] },
    { tip: "قبل ما تفكر في الوزن، فكر في الحركة: نزول بهدوء، لمسة خفيفة على الصدر، وزق بقوة. اللي بيعمل كده صدره بيكبر أسرع من اللي بيرفع تقيل بفورم وحش." }
  ],
  quiz: [
    { q: "عضلة الصدر مكانها فين؟", options: ["في قدام الجسم تحت الرقبة", "في ورا الجسم عند الكتف", "في الدراع من تحت"], answer: 0, why: "الصدر في قدام، وبتحس بيه لما تزق أي حاجة بعيد عنك." },
    { q: "إمتى بتاخد الزفير في البنش برس؟", options: ["وإنت بتنزل البار", "وإنت بتزق البار لفوق", "ما بتاخدش نفس خالص"], answer: 1, why: "الزفير مع المجهود: وإنت بتزق. والشهيق وإنت بتنزل." },
    { q: "تمرين صدر ينفع في البيت من غير أدوات؟", options: ["بنش برس", "بوش أب", "دمبل فلاي"], answer: 1, why: "البوش أب محتاج أرض بس، وبيشغل الصدر والتراي والكتف." }
  ],
  typing: "الصدر عضلة كبيرة في قدام الجسم. بتشتغل لما تزق حاجة بعيد عنك، زي البنش برس والبوش أب. انزل بهدوء وازق بقوة، وخد الزفير وإنت بتزق.",
  spelling: [
    { word: "عضلة", blank: 3, choices: ["ة", "ه"], hint: "آخر حرف: تاء مربوطة ولا هاء؟" },
    { word: "الصدر", blank: 2, choices: ["ص", "س"], hint: "صاد تقيلة ولا سين خفيفة؟" },
    { word: "بهدوء", blank: 4, choices: ["ء", "ئ"], hint: "همزة في الآخر بعد واو" },
    { word: "أدوات", blank: 0, choices: ["أ", "ا"], hint: "الكلمة بتبدأ بهمزة قطع" },
    { word: "الزفير", blank: 2, choices: ["ز", "ذ"], hint: "زين ولا ذال؟" }
  ]
}
```
