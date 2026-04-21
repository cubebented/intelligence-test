/* Antonyms — pick the word that means the OPPOSITE of the target word.
   Age-10+ vocabulary. Distractors include one word *similar in meaning*
   to the target (a classic trap) plus unrelated words. */

/* Each item is: [target, opposite, distractor, distractor, distractor]
   The 3rd entry (d1) is deliberately a near-SYNONYM of the target — the
   most common wrong-answer pull — so the item genuinely measures whether
   the child knows what "opposite" means in each case. */
const ITEMS = [
  ["early",     "late",      "soon",      "ready",    "bright"],
  ["full",      "empty",     "packed",    "heavy",    "small"],
  ["bright",    "dim",       "shiny",     "warm",     "steep"],
  ["heavy",     "light",     "solid",     "narrow",   "rough"],
  ["begin",     "end",       "start",     "try",      "allow"],
  ["cheap",     "expensive", "free",      "rare",     "broken"],
  ["strong",    "weak",      "tough",     "fast",     "loud"],
  ["tight",     "loose",     "firm",      "damp",     "sweet"],
  ["accept",    "reject",    "approve",   "remember", "prepare"],
  ["win",       "lose",      "beat",      "play",     "try"],
  ["laugh",     "cry",       "giggle",    "whisper",  "dance"],
  ["near",      "far",       "close",     "inside",   "safe"],
  ["cold",      "hot",       "chilly",    "damp",     "soft"],
  ["kind",      "cruel",     "friendly",  "quiet",    "rich"],
  ["brave",     "cowardly",  "bold",      "honest",   "active"],
  ["clean",     "dirty",     "spotless",  "shiny",    "cold"],
  ["cheap",     "costly",    "bargain",   "broken",   "simple"],
  ["slow",      "fast",      "gradual",   "steady",   "gentle"],
  ["truth",     "lie",       "fact",      "story",    "rumor"],
  ["high",      "low",       "tall",      "above",    "wide"],
  ["wet",       "dry",       "damp",      "soft",     "cold"],
  ["open",      "closed",    "unlocked",  "wide",     "empty"],
  ["rough",     "smooth",    "bumpy",     "hard",     "loud"],
  ["give",      "take",      "offer",     "send",     "keep"],
  ["allow",     "forbid",    "permit",    "accept",   "ignore"],
  ["ancient",   "modern",    "old",       "rare",     "plain"],
  ["gather",    "scatter",   "collect",   "build",    "mark"],
  ["entrance",  "exit",      "doorway",   "lobby",    "window"],
  ["expand",    "shrink",    "grow",      "swell",    "stretch"],
  ["rise",      "fall",      "climb",     "float",    "lean"],
];

function capitalize(s) { return s[0].toUpperCase() + s.slice(1); }

export function generate(rng) {
  const item = rng.pick(ITEMS);
  const [target, correct, d1, d2, d3] = item;

  const options = rng.shuffle([correct, d1, d2, d3]);
  const correctIndex = options.indexOf(correct);

  let answer = null;

  return {
    type: "antonym",
    category: "Antonyms",
    prompt: "Pick the word that means the OPPOSITE of the word in bold.",

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
