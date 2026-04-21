/* Synonyms — pick the word that means the SAME as the target word.
   Age-10+ vocabulary. Distractors are unrelated everyday words
   (not near-synonyms) so the correct choice is unambiguous. */

/* Each item is: [target, synonym, distractor, distractor, distractor]
   Everyday difficulty — no SAT-level words. The synonym is the *cleanest*
   same-meaning match; the distractors are different-meaning but common. */
const ITEMS = [
  ["brave",     "courageous",  "tired",    "silent",   "hungry"],
  ["huge",      "enormous",    "tiny",     "clever",   "broken"],
  ["happy",     "joyful",      "angry",    "calm",     "lost"],
  ["quick",     "fast",        "heavy",    "quiet",    "empty"],
  ["begin",     "start",       "finish",   "lose",     "follow"],
  ["smart",     "clever",      "kind",     "small",    "loud"],
  ["afraid",    "scared",      "pleased",  "tired",    "brave"],
  ["wet",       "damp",        "rough",    "bright",   "heavy"],
  ["shout",     "yell",        "whisper",  "listen",   "ignore"],
  ["tired",     "exhausted",   "awake",    "jealous",  "strong"],
  ["angry",     "furious",     "gentle",   "relaxed",  "clever"],
  ["sad",       "unhappy",     "excited",  "thankful", "curious"],
  ["shiny",     "glossy",      "dusty",    "broken",   "sticky"],
  ["odd",       "strange",     "normal",   "tasty",    "cheap"],
  ["easy",      "simple",      "tricky",   "painful",  "smelly"],
  ["build",     "construct",   "destroy",  "throw",    "remove"],
  ["ask",       "inquire",     "refuse",   "demand",   "answer"],
  ["end",       "finish",      "begin",    "repeat",   "replace"],
  ["choose",    "pick",        "ignore",   "repeat",   "return"],
  ["hide",      "conceal",     "reveal",   "display",  "shout"],
  ["small",     "tiny",        "wide",     "bright",   "tall"],
  ["boring",    "dull",        "exciting", "loud",     "clever"],
  ["silent",    "quiet",       "noisy",    "bright",   "dirty"],
  ["friend",    "companion",   "stranger", "enemy",    "teacher"],
  ["rich",      "wealthy",     "poor",     "silly",    "young"],
  ["difficult", "hard",        "easy",     "empty",    "soft"],
  ["tasty",     "delicious",   "bland",    "heavy",    "cold"],
  ["look",      "observe",     "ignore",   "touch",    "escape"],
  ["mistake",   "error",       "plan",     "reward",   "gift"],
  ["trip",      "journey",     "meal",     "puzzle",   "prize"],
];

function capitalize(s) { return s[0].toUpperCase() + s.slice(1); }

export function generate(rng) {
  const item = rng.pick(ITEMS);
  const [target, correct, d1, d2, d3] = item;

  const options = rng.shuffle([correct, d1, d2, d3]);
  const correctIndex = options.indexOf(correct);

  let answer = null;

  return {
    type: "synonym",
    category: "Synonyms",
    prompt: "Pick the word that means the SAME as the word in bold.",

    render() {
      const opts = options.map((word, i) => `
        <button type="button" class="option option--text reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          <span class="option__text">${word}</span>
        </button>
      `).join("");
      return `
        <div class="word-match">
          <div class="word-match__target">
            <span class="word-match__eyebrow">Word</span>
            <span class="word-match__word">${capitalize(target)}</span>
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
