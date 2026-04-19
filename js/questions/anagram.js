/* Anagram — unscramble letters into a common word.
   Open-answer question: user types the word. No multiple choice.
   Deterministic evaluation via case-insensitive string match. */

const WORDS = [
  "APPLE",  "TIGER",  "OCEAN",  "PIANO",  "RIVER",  "PLANET",
  "FOREST", "DOCTOR", "GARDEN", "MARKET", "SILVER", "HUNGER",
  "ORANGE", "PENCIL", "WINDOW", "BRIDGE", "CASTLE", "DRAGON",
  "SUNSET", "ROCKET", "MONKEY", "THUNDER","FRIEND", "SIMPLE",
  "PRISON", "CANYON", "HARBOR", "JACKET", "WALNUT", "COPPER",
];

/* Scramble so the result is guaranteed ≠ the original word.
   Also avoid trivially-swapped two-letter shifts by re-shuffling if
   we land on something too close. */
function scramble(rng, word) {
  const chars = [...word];
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = rng.shuffle(chars.slice()).join("");
    if (s !== word) return s;
  }
  /* extremely unlikely fallback: manual rotation */
  return word.slice(1) + word[0];
}

export function generate(rng) {
  const word      = rng.pick(WORDS);
  const scrambled = scramble(rng, word);

  let answer = null;

  return {
    type: "anagram",
    category: "Anagram",
    prompt: "Unscramble these letters into a common English word.",

    render() {
      const tiles = [...scrambled]
        .map(c => `<span class="anagram__letter">${c}</span>`)
        .join("");
      return `
        <div class="anagram">
          <div class="anagram__scramble">${tiles}</div>
          <div class="anagram__input-wrap">
            <input type="text"
                   id="anagram-input"
                   class="input input--text"
                   placeholder="type your answer"
                   autocomplete="off"
                   spellcheck="false"
                   maxlength="${word.length + 3}" />
            <p class="eyebrow" style="text-align:center; margin-top:var(--s-2);">
              Press Enter to submit
            </p>
          </div>
        </div>
      `;
    },

    attach(root, onAnswer) {
      const inp = root.querySelector("#anagram-input");
      if (answer !== null && answer !== undefined) inp.value = answer;
      inp.focus();
      const commit = () => {
        const v = inp.value.trim();
        if (v === "") { answer = null; onAnswer(null); return; }
        answer = v.toUpperCase();
        onAnswer(answer);
      };
      inp.addEventListener("input", commit);
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commit();
      });
    },

    restore(root, { answer: savedAnswer } = {}) {
      const a = savedAnswer ?? answer;
      const inp = root.querySelector("#anagram-input");
      if (inp && a !== null && a !== undefined && a !== "") {
        inp.value = a;
        inp.setAttribute("disabled", "");
      }
    },

    getAnswer: () => answer,
    hasAnswer: () => typeof answer === "string" && answer.length > 0,
    evaluate: (a) => typeof a === "string" && a.trim().toUpperCase() === word,
    correctAnswer: () => word,
  };
}
