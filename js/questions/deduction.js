/* Deduction — multi-clue reasoning puzzles.
   Two to four clues constrain an arrangement. User must work out the
   only consistent answer. Tests working memory + logical chaining. */

const NAMES  = ["Ada", "Ben", "Cia", "Dax", "Eve", "Fin", "Gia", "Hal"];
const FRUITS = ["apple", "banana", "cherry", "date", "fig"];
const DAYS   = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const COLORS = ["red", "blue", "green", "yellow"];
const CITIES = ["Paris", "Kyoto", "Oslo", "Lima"];

/* Helper: shuffle + pick k without replacement */
function sampleK(rng, arr, k) { return rng.sample(arr, k); }

/* ─── Templates ─────────────────────────────────────────────── */

const TEMPLATES = [
  /* 1. Seating order — 3 in a row */
  {
    build(rng) {
      const [a, b, c] = sampleK(rng, NAMES, 3);
      /* Solution: [left, middle, right] = [a, b, c] */
      const premise = [
        `${a}, ${b}, and ${c} sit in a row.`,
        `${a} is to the left of ${b}.`,
        `${c} is to the right of ${b}.`,
      ].join(" ");
      const question = "Who is in the middle?";
      return {
        premise, question,
        options: rng.shuffle([b, a, c, "Cannot be determined"]),
        correctText: b,
      };
    },
  },
  /* 2. Assign attribute — 3 people, 3 fruits */
  {
    build(rng) {
      const [p1, p2, p3] = sampleK(rng, NAMES, 3);
      const [f1, f2, f3] = sampleK(rng, FRUITS, 3);
      /* Solution: p1→f1, p2→f2, p3→f3 */
      const premise = [
        `${p1}, ${p2}, and ${p3} each brought one of ${f1}, ${f2}, or ${f3}.`,
        `${p1} did not bring the ${f2} or the ${f3}.`,
        `${p3} brought the ${f3}.`,
      ].join(" ");
      const question = `Who brought the ${f2}?`;
      return {
        premise, question,
        options: rng.shuffle([p2, p1, p3, "Cannot be determined"]),
        correctText: p2,
      };
    },
  },
  /* 3. Day puzzle */
  {
    build(rng) {
      const [p1, p2, p3] = sampleK(rng, NAMES, 3);
      const day1 = rng.pick(DAYS.slice(0, 3));
      const day2Idx = DAYS.indexOf(day1) + 1;
      const day2 = DAYS[day2Idx];
      const day3 = DAYS[day2Idx + 1];
      const premise = [
        `${p1} arrived on ${day1}.`,
        `${p2} arrived the day after ${p1}.`,
        `${p3} arrived the day after ${p2}.`,
      ].join(" ");
      const question = `On what day did ${p3} arrive?`;
      return {
        premise, question,
        options: rng.shuffle([day3, day2, day1, DAYS[day2Idx + 2] || "Sunday"]),
        correctText: day3,
      };
    },
  },
  /* 4. Colour-exclusion */
  {
    build(rng) {
      const [p1, p2, p3] = sampleK(rng, NAMES, 3);
      const [c1, c2, c3] = sampleK(rng, COLORS, 3);
      /* Solution: p1→c2, p2→c1, p3→c3 */
      const premise = [
        `${p1}, ${p2}, and ${p3} wore ${c1}, ${c2}, or ${c3} — one each.`,
        `${p1} did not wear ${c1} or ${c3}.`,
        `${p3} wore ${c3}.`,
      ].join(" ");
      const question = `What did ${p2} wear?`;
      return {
        premise, question,
        options: rng.shuffle([c1, c2, c3, "Cannot be determined"]),
        correctText: c1,
      };
    },
  },
  /* 5. Circular seating (4 people) */
  {
    build(rng) {
      const [a, b, c, d] = sampleK(rng, NAMES, 4);
      /* Seating clockwise: a, b, c, d.  a opposite c, b opposite d. */
      const premise = [
        `Four people sit around a round table: ${a}, ${b}, ${c}, ${d}.`,
        `${a} sits directly across from ${c}.`,
        `${b} is immediately to ${a}'s right.`,
      ].join(" ");
      const question = `Who sits directly across from ${b}?`;
      return {
        premise, question,
        options: rng.shuffle([d, a, c, "Cannot be determined"]),
        correctText: d,
      };
    },
  },
  /* 6. Ranking with ties ruled out */
  {
    build(rng) {
      const [a, b, c, d] = sampleK(rng, NAMES, 4);
      /* Speed order: a > c > b > d */
      const premise = [
        `${a} is faster than ${b}.`,
        `${c} is slower than ${a} but faster than ${b}.`,
        `${d} is slower than ${b}.`,
      ].join(" ");
      const question = "Who is the second fastest?";
      return {
        premise, question,
        options: rng.shuffle([c, a, b, d]),
        correctText: c,
      };
    },
  },
  /* 7. City/event matching */
  {
    build(rng) {
      const [p1, p2, p3] = sampleK(rng, NAMES, 3);
      const [c1, c2, c3] = sampleK(rng, CITIES, 3);
      /* p1→c1, p2→c2, p3→c3 */
      const premise = [
        `${p1}, ${p2}, and ${p3} each visited exactly one of ${c1}, ${c2}, ${c3}.`,
        `${p2} did not visit ${c1}.`,
        `${p3} visited ${c3}.`,
        `${p1} visited ${c1}.`,
      ].join(" ");
      const question = `Which city did ${p2} visit?`;
      return {
        premise, question,
        options: rng.shuffle([c2, c1, c3, "Cannot be determined"]),
        correctText: c2,
      };
    },
  },
  /* 8. Age ordering */
  {
    build(rng) {
      const [a, b, c, d] = sampleK(rng, NAMES, 4);
      /* Ages: c > a > d > b (c oldest, b youngest) */
      const premise = [
        `${a} is older than ${d}.`,
        `${c} is older than ${a}.`,
        `${b} is younger than ${d}.`,
      ].join(" ");
      const question = "Who is the youngest?";
      return {
        premise, question,
        options: rng.shuffle([b, d, a, c]),
        correctText: b,
      };
    },
  },
  /* 9. If-then chain */
  {
    build(rng) {
      return {
        premise: [
          "If Ana went to the party, Boris went too.",
          "If Boris went, Dina stayed home.",
          "Dina did not stay home.",
        ].join(" "),
        question: "Which conclusion is valid?",
        options: rng.shuffle([
          "Ana did not go to the party.",
          "Ana went to the party.",
          "Boris went to the party.",
          "Dina went to the party.",
        ]),
        correctText: "Ana did not go to the party.",
      };
    },
  },
  /* 10. Floor puzzle */
  {
    build(rng) {
      const [a, b, c] = sampleK(rng, NAMES, 3);
      /* Floors: b=1, a=2, c=3 */
      const premise = [
        `Three people live in a 3-story building: ${a}, ${b}, ${c}.`,
        `${c} lives above ${a}.`,
        `${a} lives above ${b}.`,
      ].join(" ");
      const question = "Who lives on the top floor?";
      return {
        premise, question,
        options: rng.shuffle([c, a, b, "Cannot be determined"]),
        correctText: c,
      };
    },
  },
  /* 11. Negative constraint (exclusion resolves by elimination) */
  {
    build(rng) {
      const [p1, p2, p3] = sampleK(rng, NAMES, 3);
      const pets = rng.shuffle(["cat", "dog", "parrot"]);
      /* p1→cat, p2→dog, p3→parrot (after solving) */
      const premise = [
        `${p1}, ${p2}, and ${p3} each own one of a ${pets[0]}, ${pets[1]}, or ${pets[2]}.`,
        `${p1} is allergic to fur.`,
        `${p2} has a ${pets[1]}.`,
      ].join(" ");
      /* p1 can't own cat or dog (fur) → owns parrot (pets[2]) */
      /* But pets are randomized, so the fur one is cat + dog */
      const furPets = ["cat", "dog"];
      const p1Pet = pets.find(p => !furPets.includes(p));   /* parrot */
      const question = `What does ${p1} own?`;
      return {
        premise, question,
        options: rng.shuffle([p1Pet, pets[0], pets[1], "Cannot be determined"]),
        correctText: p1Pet,
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
    type: "deduction",
    category: "Deduction",
    prompt: "Read every clue. Only one of the choices fits all of them.",

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
