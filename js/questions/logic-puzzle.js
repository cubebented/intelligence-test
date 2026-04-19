/* Logic Puzzle — sentence-based reasoning.
   A short paragraph states premises; user picks the correct conclusion
   from 4 text options. Tests verbal reasoning + deductive logic. */

/* ───────────────────────────────────────────────────────────────
   Puzzle templates.
   Each `build(rng)` returns:
     { premise:  string,
       question: string,
       options:  [string, string, string, string],
       correct:  0..3 }
   ───────────────────────────────────────────────────────────── */

const NAMES   = ["Maya", "Jonas", "Priya", "Leo", "Ava", "Noor", "Kai", "Ines", "Theo", "Zara"];
const OBJECTS = ["apples", "coins", "stickers", "marbles", "books", "pencils", "cards", "stamps"];
const COLORS_ = ["red", "blue", "green", "yellow", "black", "white"];
const ANIMALS = ["cats", "dogs", "birds", "frogs", "lizards"];
const PLACES  = ["Oslo", "Mira", "Kalea", "Verd", "Tolan"];

const TEMPLATES = [
  /* 1. Height ordering (3 people) */
  {
    build(rng) {
      const [a, b, c] = rng.sample(NAMES, 3);
      return {
        premise:  `${a} is taller than ${b}. ${b} is taller than ${c}.`,
        question: `Who is the shortest?`,
        options:  rng.shuffle([c, b, a, "Cannot be determined"]),
        correctText: c,
      };
    },
  },
  /* 2. Height ordering — reverse framing */
  {
    build(rng) {
      const [a, b, c] = rng.sample(NAMES, 3);
      return {
        premise:  `${a} is shorter than ${b}. ${c} is taller than ${b}.`,
        question: `Who is the tallest?`,
        options:  rng.shuffle([c, b, a, "Cannot be determined"]),
        correctText: c,
      };
    },
  },
  /* 3. Arithmetic word problem — doubling */
  {
    build(rng) {
      const [a, b] = rng.sample(NAMES, 2);
      const obj   = rng.pick(OBJECTS);
      const n     = rng.int(3, 9);
      const total = n + n * 2;
      return {
        premise:  `${a} has ${n} ${obj}. ${b} has twice as many.`,
        question: `How many ${obj} do they have together?`,
        options:  rng.shuffle([`${total}`, `${n * 2}`, `${n * 3 + 1}`, `${n + 2}`]),
        correctText: `${total}`,
      };
    },
  },
  /* 4. Arithmetic — gave away */
  {
    build(rng) {
      const [a, b] = rng.sample(NAMES, 2);
      const obj    = rng.pick(OBJECTS);
      const start  = rng.int(12, 24);
      const gave   = rng.int(3, 7);
      const result = start - gave;
      return {
        premise:  `${a} had ${start} ${obj} and gave ${gave} to ${b}.`,
        question: `How many ${obj} does ${a} have now?`,
        options:  rng.shuffle([`${result}`, `${start + gave}`, `${gave}`, `${start}`]),
        correctText: `${result}`,
      };
    },
  },
  /* 5. Age reasoning */
  {
    build(rng) {
      const [a, b] = rng.sample(NAMES, 2);
      const diff   = rng.int(3, 8);
      const bAge   = rng.int(10, 22);
      const aAge   = bAge + diff;
      const futureB = bAge + 5;
      const futureA = aAge + 5;
      return {
        premise:  `${a} is ${diff} years older than ${b}. ${b} is ${bAge}.`,
        question: `How old will ${a} be in 5 years?`,
        options:  rng.shuffle([`${futureA}`, `${aAge}`, `${futureB}`, `${bAge + diff + 10}`]),
        correctText: `${futureA}`,
      };
    },
  },
  /* 6. Syllogism — classic all/some */
  {
    build(rng) {
      const group = rng.pick([
        ["roses", "flowers", "plants"],
        ["sparrows", "birds", "animals"],
        ["novels", "books", "objects"],
      ]);
      const [sub, mid, sup] = group;
      return {
        premise:  `All ${sub} are ${mid}. All ${mid} are ${sup}.`,
        question: `Which statement must be true?`,
        options:  rng.shuffle([
          `All ${sub} are ${sup}.`,
          `All ${sup} are ${sub}.`,
          `Some ${sup} are not ${mid}.`,
          `No ${sub} are ${sup}.`,
        ]),
        correctText: `All ${sub} are ${sup}.`,
      };
    },
  },
  /* 7. Syllogism — negative premise */
  {
    build(rng) {
      const a = rng.pick(ANIMALS);
      const b = rng.pick(["reptiles", "insects", "fish"].filter(x => x !== a));
      return {
        premise:  `No ${a} are ${b}. All ${b} lay eggs.`,
        question: `Which statement is definitely true?`,
        options:  rng.shuffle([
          `No ${a} are ${b}.`,
          `All ${a} lay eggs.`,
          `Some ${a} are ${b}.`,
          `All ${b} are ${a}.`,
        ]),
        correctText: `No ${a} are ${b}.`,
      };
    },
  },
  /* 8. Seating / position (3 items in a row) */
  {
    build(rng) {
      const [a, b, c] = rng.sample(COLORS_, 3);
      return {
        premise:  `Three boxes sit in a row. The ${a} box is to the left of the ${b} box. The ${c} box is to the right of the ${b} box.`,
        question: `Which box is in the middle?`,
        options:  rng.shuffle([b, a, c, "Cannot be determined"]),
        correctText: b,
      };
    },
  },
  /* 9. Speed / distance */
  {
    build(rng) {
      const name  = rng.pick(NAMES);
      const mph   = rng.pick([30, 40, 50, 60]);
      const hours = rng.int(2, 5);
      const dist  = mph * hours;
      return {
        premise:  `${name} drives at ${mph} mph for ${hours} hours without stopping.`,
        question: `How many miles does ${name} travel?`,
        options:  rng.shuffle([`${dist}`, `${mph + hours}`, `${mph * (hours - 1)}`, `${dist + mph}`]),
        correctText: `${dist}`,
      };
    },
  },
  /* 10. If/then conditional */
  {
    build(rng) {
      return {
        premise:  `If it rains, the match is cancelled. The match was not cancelled.`,
        question: `Which conclusion is valid?`,
        options:  rng.shuffle([
          `It did not rain.`,
          `It rained.`,
          `The match will be cancelled tomorrow.`,
          `It might rain later.`,
        ]),
        correctText: `It did not rain.`,
      };
    },
  },
  /* 11. Inequality chain */
  {
    build(rng) {
      const [a, b, c, d] = rng.sample(NAMES, 4);
      return {
        premise:  `${a} is faster than ${b}. ${c} is faster than ${a}. ${d} is slower than ${b}.`,
        question: `Who is the slowest?`,
        options:  rng.shuffle([d, b, a, c]),
        correctText: d,
      };
    },
  },
  /* 12. Set exclusion */
  {
    build(rng) {
      const [p, q] = rng.sample(PLACES, 2);
      return {
        premise:  `Everyone in ${p} speaks Ulari. Tomek speaks only Hezan. Ulari and Hezan share no words.`,
        question: `Which must be true?`,
        options:  rng.shuffle([
          `Tomek does not live in ${p}.`,
          `Tomek speaks Ulari.`,
          `No one in ${p} speaks Hezan.`,
          `Everyone in ${q} speaks Hezan.`,
        ]),
        correctText: `Tomek does not live in ${p}.`,
      };
    },
  },
  /* 13. HARDER — only if */
  {
    build(rng) {
      return {
        premise:  `The show runs only if the lead actor arrives. The lead actor arrived yesterday.`,
        question: `Which conclusion follows?`,
        options:  rng.shuffle([
          `The show may or may not have run.`,
          `The show ran yesterday.`,
          `The show did not run.`,
          `The lead actor was ill.`,
        ]),
        correctText: `The show may or may not have run.`,
      };
    },
  },
  /* 14. Contrapositive — if P then Q, not Q ⇒ not P */
  {
    build(rng) {
      return {
        premise:  `If a book is a bestseller, it is stocked at every branch. The Foxglove Letters is not stocked at the Main Street branch.`,
        question: `Which follows?`,
        options:  rng.shuffle([
          `The Foxglove Letters is not a bestseller.`,
          `The Foxglove Letters will soon be a bestseller.`,
          `No bestsellers are sold at Main Street.`,
          `Every branch carries bestsellers except Main Street.`,
        ]),
        correctText: `The Foxglove Letters is not a bestseller.`,
      };
    },
  },
  /* 15. Nested conditional */
  {
    build(rng) {
      return {
        premise:  `If it rains, Dina stays home. If Dina stays home, she reads a novel. Dina did not read a novel yesterday.`,
        question: `Which conclusion is valid?`,
        options:  rng.shuffle([
          `It did not rain yesterday.`,
          `It rained yesterday.`,
          `Dina went to work yesterday.`,
          `Dina dislikes novels.`,
        ]),
        correctText: `It did not rain yesterday.`,
      };
    },
  },
  /* 16. Quantifier trap — "some" doesn't imply "all" */
  {
    build(rng) {
      return {
        premise:  `All composers are musicians. Some musicians play the cello.`,
        question: `Which MUST be true?`,
        options:  rng.shuffle([
          `Some composers may play the cello.`,
          `All composers play the cello.`,
          `No composer plays the cello.`,
          `Every cellist is a composer.`,
        ]),
        correctText: `Some composers may play the cello.`,
      };
    },
  },
  /* 17. Multi-step syllogism */
  {
    build(rng) {
      return {
        premise:  `All surgeons are doctors. No doctors are poets. Mira is a surgeon.`,
        question: `Which must be true?`,
        options:  rng.shuffle([
          `Mira is not a poet.`,
          `Mira is a poet.`,
          `Some surgeons are poets.`,
          `All poets are doctors.`,
        ]),
        correctText: `Mira is not a poet.`,
      };
    },
  },
  /* 18. Bidirectional inequality — harder chain */
  {
    build(rng) {
      const [a, b, c, d, e] = rng.sample(NAMES, 5);
      return {
        premise:  `${a} earns more than ${b}. ${c} earns less than ${d}, but more than ${a}. ${e} earns less than ${b}.`,
        question: `Who earns the most?`,
        options:  rng.shuffle([d, c, a, e]),
        correctText: d,
      };
    },
  },
  /* 19. Either/or exclusion */
  {
    build(rng) {
      return {
        premise:  `Every file is either encrypted or backed up, but not both. Folder X contains no backed-up files.`,
        question: `Which must be true of folder X?`,
        options:  rng.shuffle([
          `Every file in folder X is encrypted.`,
          `Some files in folder X are neither encrypted nor backed up.`,
          `Folder X contains both types.`,
          `Folder X is empty.`,
        ]),
        correctText: `Every file in folder X is encrypted.`,
      };
    },
  },
  /* 20. Percentage reversal */
  {
    build(rng) {
      const price = rng.pick([80, 120, 160, 200]);
      const off   = rng.pick([20, 25, 40]);
      const sale  = price * (1 - off / 100);
      return {
        premise:  `A jacket is marked down ${off}% to $${sale}.`,
        question: `What was the original price?`,
        options:  rng.shuffle([`$${price}`, `$${price + off}`, `$${sale + off}`, `$${Math.round(sale * 100 / (100 - off) + 5)}`]),
        correctText: `$${price}`,
      };
    },
  },
  /* 21. Harder distance/meeting */
  {
    build(rng) {
      const [a, b] = rng.sample(NAMES, 2);
      const d = rng.pick([60, 80, 120, 150]);
      const v1 = rng.pick([20, 30, 40]);
      const v2 = rng.pick([10, 20, 30]);
      while (v1 === v2) {/* ensure distinct */}
      const meetHours = d / (v1 + v2);
      const meetRound = Math.round(meetHours * 10) / 10;
      return {
        premise:  `${a} and ${b} start ${d} miles apart and walk toward each other. ${a} walks at ${v1} mph; ${b} at ${v2} mph.`,
        question: `After how many hours do they meet?`,
        options:  rng.shuffle([
          `${meetRound}`, `${d / v1}`.slice(0, 4), `${d / v2}`.slice(0, 4), `${Math.round(d / Math.min(v1, v2))}`,
        ]),
        correctText: `${meetRound}`,
      };
    },
  },
  /* 22. Set cardinality */
  {
    build(rng) {
      return {
        premise:  `Of 30 students, 18 study biology, 14 study chemistry, and 8 study both.`,
        question: `How many study neither?`,
        options:  rng.shuffle(["6", "8", "10", "12"]),
        correctText: "6",
      };
    },
  },
  /* 23. Truth-teller / liar (one-step) */
  {
    build(rng) {
      return {
        premise:  `Anil always lies. Bao always tells the truth. Anil says, "Bao did not take the key."`,
        question: `Who took the key?`,
        options:  rng.shuffle(["Bao", "Anil", "Someone else", "Cannot be determined"]),
        correctText: "Bao",
      };
    },
  },
  /* 24. Dates / weekdays */
  {
    build(rng) {
      return {
        premise:  `Today is Thursday. What day will it be 100 days from now?`,
        question: `Select the day.`,
        /* 100 mod 7 = 2 → Thursday + 2 = Saturday */
        options:  rng.shuffle(["Saturday", "Friday", "Sunday", "Thursday"]),
        correctText: "Saturday",
      };
    },
  },
];

export function generate(rng) {
  const tpl  = rng.pick(TEMPLATES);
  const data = tpl.build(rng);
  const correctIndex = data.options.indexOf(data.correctText);

  let answer = null;

  return {
    type: "logic-puzzle",
    category: "Logic Puzzle",
    prompt: "Read the statement. Pick the answer that logically follows.",

    render() {
      const opts = data.options.map((text, i) => `
        <button type="button" class="option option--text reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          <span class="option__text">${text}</span>
        </button>
      `).join("");
      return `
        <div class="logic-puzzle">
          <div class="logic-puzzle__card">
            <p class="logic-puzzle__premise">${data.premise}</p>
            <p class="logic-puzzle__question">${data.question}</p>
          </div>
          <div class="options options--stack">${opts}</div>
        </div>
      `;
    },

    attach(root, onAnswer) {
      root.querySelectorAll(".option").forEach(btn => {
        btn.addEventListener("click", () => {
          root.querySelectorAll(".option").forEach(b => b.classList.remove("option--selected"));
          btn.classList.add("option--selected");
          answer = Number(btn.dataset.idx);
          onAnswer(answer);
        });
      });
    },

    restore(root, { answer: savedAnswer } = {}) {
      const a = savedAnswer ?? answer;
      if (a === null || a === undefined) return;
      const btn = root.querySelector(`.option[data-idx="${a}"]`);
      if (btn) btn.classList.add("option--selected");
    },

    getAnswer: () => answer,
    hasAnswer: () => answer !== null,
    evaluate: (a) => a === correctIndex,
    correctAnswer: () => correctIndex,
  };
}
