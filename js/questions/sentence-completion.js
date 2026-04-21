/* Sentence Completion — pick the word that fits the blank.
   Tests reading comprehension + vocabulary + context clues. Kid-friendly
   (ages 10+): concrete sentences, everyday words, one unambiguous answer,
   three plausibly-wrong distractors (right part of speech, wrong meaning).

   Each item is ["sentence with ___", correctWord, distractor, distractor, distractor].
   Distractors are handpicked to look almost right at a glance. */

const ITEMS = [
  ["The ice cream started to ___ in the hot sun.",          "melt",        "freeze",   "grow",      "sing"],
  ["A map helps you find where a place is ___.",             "located",     "cooked",   "invented",  "tired"],
  ["The library was so ___ you could hear a pin drop.",      "quiet",       "loud",     "bright",    "soft"],
  ["Plants need sunlight and water to ___.",                 "grow",        "shrink",   "vanish",    "sleep"],
  ["She ran fast enough to ___ the bus before it left.",     "catch",       "drop",     "build",     "wash"],
  ["The detective searched for ___ that would solve the case.","clues",     "jokes",    "snacks",    "colors"],
  ["Because it was raining, we brought an ___.",             "umbrella",    "ice cube", "engine",    "envelope"],
  ["A thermometer is used to measure ___.",                  "temperature", "sound",    "distance",  "weight"],
  ["He felt ___ after eating a huge lunch.",                 "full",        "thirsty",  "curious",   "angry"],
  ["The moon looks different each night because it ___.",    "changes",     "listens",  "disappears","whispers"],
  ["Water boils when it reaches a very high ___.",           "temperature", "volume",   "color",     "price"],
  ["To cross the river, they had to build a ___.",           "bridge",      "song",     "shadow",    "question"],
  ["She whispered so her little brother wouldn't ___ up.",   "wake",        "fall",     "build",     "sell"],
  ["The bakery smelled ___ because of the fresh bread.",     "wonderful",   "empty",    "silent",    "heavy"],
  ["Without a key, you cannot ___ the door.",                "unlock",      "paint",    "remember",  "remove"],
  ["If you drop a glass, it is likely to ___.",              "break",       "float",    "grow",      "bloom"],
  ["After the storm passed, the sky was ___ again.",         "clear",       "cloudy",   "noisy",     "empty"],
  ["Most birds use their wings to ___.",                     "fly",         "dig",      "swim",      "crawl"],
  ["Because he studied, Luca was ___ for the test.",         "ready",       "late",     "confused",  "sleepy"],
  ["A doctor works mostly in a ___.",                        "hospital",    "garage",   "stadium",   "bakery"],
  ["The old bridge was so ___ that nobody dared cross it.",  "dangerous",   "colorful", "famous",    "delicious"],
  ["Snow usually falls in ___.",                             "winter",      "summer",   "autumn",    "April"],
  ["If something is transparent, you can see ___ it.",       "through",     "over",     "behind",    "above"],
  ["She was ___ when she heard the good news.",              "happy",       "hungry",   "tired",     "angry"],
  ["Volcanoes can ___ when pressure builds up inside them.", "erupt",       "whistle",  "freeze",    "shrink"],
  ["A stranger is someone you do not ___.",                  "know",        "like",     "trust",     "want"],
  ["To grow strong, your body needs ___ food.",              "healthy",     "sugary",   "crunchy",   "cold"],
  ["Because the road was icy, they drove very ___.",         "carefully",   "quickly",  "loudly",    "happily"],
  ["Most fish cannot survive out of ___.",                   "water",       "cages",    "deserts",   "shells"],
  ["She apologized because she had hurt his ___.",           "feelings",    "shoes",    "book",      "window"],
];

export function generate(rng) {
  const item = rng.pick(ITEMS);
  const [sentence, correct, d1, d2, d3] = item;

  /* Shuffle all four options so the correct answer moves around */
  const options = rng.shuffle([correct, d1, d2, d3]);
  const correctIndex = options.indexOf(correct);

  let answer = null;

  /* Render the sentence with a visible blank marker so the user knows
     what they're filling in. The "___" is visually replaced by a styled span. */
  const sentenceHtml = sentence.replace(/___/, `<span class="sc-blank">______</span>`);

  return {
    type: "sentence-completion",
    category: "Sentence Completion",
    prompt: "Pick the word that best fits the blank.",

    render() {
      const opts = options.map((word, i) => `
        <button type="button" class="option option--text reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          <span class="option__text">${word}</span>
        </button>
      `).join("");
      return `
        <div class="sc-wrap">
          <p class="sc-sentence">${sentenceHtml}</p>
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
