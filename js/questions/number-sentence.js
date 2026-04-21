/* Number Sentence — verbal quantitative reasoning.
   Sentence-framed number puzzles that require translating words into
   arithmetic. Distinct from Number Series (cell-based); this one is
   genuinely reading-comprehension + math. */

const NAMES = ["Maya", "Jonas", "Priya", "Leo", "Ava", "Noor", "Kai", "Ines"];

/* Small int helpers */
function pickInt(rng, lo, hi) { return rng.int(lo, hi); }

const TEMPLATES = [
  /* 1. Compound percentage */
  {
    build(rng) {
      const base   = pickInt(rng, 40, 80) * 10;           // 400..800
      const off1   = rng.pick([10, 20, 25]);
      const off2   = rng.pick([10, 20]);
      const after  = Math.round(base * (1 - off1 / 100) * (1 - off2 / 100));
      return {
        premise: `An item priced at $${base} is first discounted ${off1}%, then the new price is discounted another ${off2}%.`,
        question: `What is the final price?`,
        correct: `$${after}`,
        distractors: [
          `$${base - base * (off1 + off2) / 100}`,      // naive sum
          `$${Math.round(base * (1 - (off1 + off2) / 100))}`,
          `$${Math.round(base * (off1 / 100) * (off2 / 100))}`,
        ].map(s => s.replace(/\.0+$/, "")),
      };
    },
  },
  /* 2. Average reversal */
  {
    build(rng) {
      const avgN   = pickInt(rng, 5, 9);
      const avg    = pickInt(rng, 12, 25);
      const total  = avgN * avg;
      const missN  = avgN - 1;
      const missing = pickInt(rng, 10, avg + 5);
      const others = total - missing;
      const newAvg = Math.round((others / missN) * 10) / 10;
      return {
        premise: `The average of ${avgN} numbers is ${avg}. One of them is ${missing}.`,
        question: `What is the average of the remaining ${missN} numbers?`,
        correct: `${newAvg}`,
        distractors: [`${avg}`, `${avg - 1}`, `${Math.round(others / avgN * 10) / 10}`],
      };
    },
  },
  /* 3. Ratio split */
  {
    build(rng) {
      const a = pickInt(rng, 2, 5);
      const b = pickInt(rng, 2, 5);
      while (a === b) { /* avoid trivial 1:1 */ }
      const total = (a + b) * pickInt(rng, 6, 12);
      const share = (total / (a + b)) * a;
      return {
        premise: `${total} candies are split between two children in a ${a}:${b} ratio.`,
        question: `How many does the first child get?`,
        correct: `${share}`,
        distractors: [`${total - share}`, `${Math.round(total * a / 10)}`, `${Math.round(total / (a + b))}`],
      };
    },
  },
  /* 4. Multi-step rate */
  {
    build(rng) {
      const name  = rng.pick(NAMES);
      const rate1 = pickInt(rng, 3, 8);
      const rate2 = pickInt(rng, 2, 6);
      const t     = pickInt(rng, 3, 6);
      const total = rate1 * t + rate2 * t;
      return {
        premise: `${name} and a friend fold paper cranes. ${name} folds ${rate1} per hour; the friend folds ${rate2} per hour. They work together for ${t} hours.`,
        question: `How many cranes do they fold in total?`,
        correct: `${total}`,
        distractors: [`${rate1 * t}`, `${(rate1 + rate2) * (t - 1)}`, `${rate1 * rate2 * t}`],
      };
    },
  },
  /* 5. Age difference conditional */
  {
    build(rng) {
      const [a, b] = rng.sample(NAMES, 2);
      const diff   = pickInt(rng, 4, 10);
      const bAge   = pickInt(rng, 12, 25);
      const aAge   = bAge + diff;
      const yearsAgo = pickInt(rng, 2, 5);
      const aThen = aAge - yearsAgo;
      return {
        premise: `${a} is ${diff} years older than ${b}. ${b} is now ${bAge}.`,
        question: `How old was ${a} ${yearsAgo} years ago?`,
        correct: `${aThen}`,
        distractors: [`${bAge - yearsAgo}`, `${aAge}`, `${aAge + yearsAgo}`],
      };
    },
  },
  /* 6. Number series described in words */
  {
    build(rng) {
      const start = pickInt(rng, 2, 6);
      const step  = pickInt(rng, 2, 5);
      const seq   = [start, start + step, start + 2 * step, start + 3 * step];
      const next  = start + 4 * step;
      return {
        premise: `A sequence starts at ${start}, and each term is ${step} more than the previous. The first four terms are ${seq.join(", ")}.`,
        question: `What is the sixth term?`,
        correct: `${start + 5 * step}`,
        distractors: [`${next}`, `${start + 6 * step}`, `${seq[3] + 1}`],
      };
    },
  },
  /* 7. Probability basic */
  {
    build(rng) {
      const r = pickInt(rng, 2, 6);
      const b = pickInt(rng, 2, 6);
      const total = r + b;
      return {
        premise: `A jar contains ${r} red marbles and ${b} blue marbles. You draw one at random.`,
        question: `What is the probability it is red? (closest answer)`,
        correct: `${Math.round((r / total) * 100)}%`,
        distractors: [
          `${Math.round((b / total) * 100)}%`,
          `${Math.round((r / (r + b + 2)) * 100)}%`,
          `50%`,
        ].filter((x, i, arr) => arr.indexOf(x) === i),
      };
    },
  },
  /* 8. Work together — pipe filling a tank */
  {
    build(rng) {
      const a = pickInt(rng, 4, 8);
      const b = pickInt(rng, 6, 12);
      /* combined rate = 1/a + 1/b = (a+b)/(ab), time = ab/(a+b) */
      const time = Math.round((a * b * 10) / (a + b)) / 10;
      return {
        premise: `Pipe A alone fills a tank in ${a} hours. Pipe B alone fills it in ${b} hours.`,
        question: `If both pipes open together, about how many hours to fill the tank?`,
        correct: `${time}`,
        distractors: [`${Math.round((a + b) / 2)}`, `${Math.round(Math.min(a, b) - 1)}`, `${a + b}`],
      };
    },
  },
  /* 9. Distance with return */
  {
    build(rng) {
      const d = pickInt(rng, 30, 90);
      const v1 = pickInt(rng, 20, 40);
      const v2 = pickInt(rng, 30, 60);
      while (v1 === v2) { /* skip trivial */ }
      /* Average speed = 2d / (d/v1 + d/v2) = 2*v1*v2/(v1+v2) */
      const avg = Math.round((2 * v1 * v2) / (v1 + v2));
      return {
        premise: `A driver goes ${d} miles out at ${v1} mph and returns the same ${d} miles at ${v2} mph.`,
        question: `What is the average speed for the whole trip (closest answer)?`,
        correct: `${avg} mph`,
        distractors: [`${Math.round((v1 + v2) / 2)} mph`, `${v1} mph`, `${v2} mph`],
      };
    },
  },
  /* 10. Set overlap */
  {
    build(rng) {
      const total = pickInt(rng, 40, 60);
      const a     = pickInt(rng, 20, 30);
      const b     = pickInt(rng, 15, 25);
      const none  = pickInt(rng, 2, 6);
      /* |A∪B| = total - none; |A∩B| = a + b - (total - none) */
      const both  = a + b - (total - none);
      if (both < 1 || both > Math.min(a, b)) return null;
      return {
        premise: `In a class of ${total} students, ${a} study Spanish, ${b} study French, and ${none} study neither.`,
        question: `How many study both languages?`,
        correct: `${both}`,
        distractors: [`${a + b - total}`, `${a - both}`, `${total - a - b}`],
      };
    },
  },
];

export function generate(rng) {
  /* Some templates can produce invalid configurations; retry a few times. */
  let data = null;
  for (let i = 0; i < 8 && !data; i++) {
    const tpl = rng.pick(TEMPLATES);
    data = tpl.build(rng);
  }
  if (!data) data = TEMPLATES[0].build(rng);

  /* Ensure distractors are distinct strings */
  const seen = new Set([data.correct]);
  const distractors = data.distractors.filter(d => {
    if (seen.has(d)) return false;
    seen.add(d);
    return true;
  });
  while (distractors.length < 3) distractors.push(`${pickInt(rng, 5, 999)}`);

  const options = rng.shuffle([data.correct, ...distractors.slice(0, 3)]);
  const correctIndex = options.indexOf(data.correct);

  let answer = null;

  return {
    type: "number-sentence",
    category: "Word Problems",
    prompt: "Read the word problem. Work out the answer.",

    render() {
      const opts = options.map((text, i) => `
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
          <div class="options options--4 options--text-grid">${opts}</div>
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
