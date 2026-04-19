/* Coding-Decoding — letter/number cipher puzzles.
   User is shown a code and a plaintext example, then must apply the
   same rule to decode a new word. Tests pattern recognition over
   abstract symbol manipulation. */

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const WORDS = [
  "CAT", "DOG", "SUN", "MOON", "STAR", "FISH",
  "BIRD", "LAKE", "TREE", "WIND", "FIRE", "SALT",
  "NEST", "CORD", "PART", "HERO", "MINT", "LAMP",
];

/* Shift letter by n (wraps mod 26). Assumes uppercase letter. */
function shift(ch, n) {
  const i = ALPHA.indexOf(ch);
  return ALPHA[((i + n) % 26 + 26) % 26];
}
function encodeShift(word, n) {
  return [...word].map(c => shift(c, n)).join("");
}
function encodeReverse(word) {
  return [...word].reverse().join("");
}
function encodeAltShift(word, even, odd) {
  return [...word].map((c, i) => shift(c, i % 2 === 0 ? even : odd)).join("");
}

/* Apply a random mutation to a correct answer so distractors look similar */
function mutate(rng, word) {
  const i = rng.int(0, word.length - 1);
  const n = rng.int(1, 4) * (rng.bool() ? 1 : -1);
  return word.slice(0, i) + shift(word[i], n) + word.slice(i + 1);
}

const RULES = [
  /* Shift by +n — classic Caesar */
  {
    build(rng) {
      const n = rng.pick([1, 2, 3, 4, -1, -2, -3]);
      const example = rng.pick(WORDS);
      const target  = rng.pick(WORDS.filter(w => w !== example));
      const eCoded  = encodeShift(example, n);
      const tCoded  = encodeShift(target, n);
      const rule    = n >= 0 ? `each letter shifted ${n} forward` : `each letter shifted ${-n} back`;
      return { example, eCoded, target, tCoded, rule };
    },
  },
  /* Reverse the whole word */
  {
    build(rng) {
      const example = rng.pick(WORDS);
      const target  = rng.pick(WORDS.filter(w => w !== example));
      return {
        example, eCoded: encodeReverse(example),
        target,  tCoded: encodeReverse(target),
        rule: "letters reversed",
      };
    },
  },
  /* Alternating shift: odd positions +a, even positions +b */
  {
    build(rng) {
      const a = rng.pick([1, 2, 3]);
      const b = rng.pick([-1, -2, -3]);
      const example = rng.pick(WORDS);
      const target  = rng.pick(WORDS.filter(w => w !== example));
      return {
        example, eCoded: encodeAltShift(example, a, b),
        target,  tCoded: encodeAltShift(target, a, b),
        rule: `alternating shift (+${a} / ${b})`,
      };
    },
  },
  /* Shift then reverse */
  {
    build(rng) {
      const n = rng.pick([1, 2, 3]);
      const example = rng.pick(WORDS);
      const target  = rng.pick(WORDS.filter(w => w !== example));
      return {
        example, eCoded: encodeReverse(encodeShift(example, n)),
        target,  tCoded: encodeReverse(encodeShift(target, n)),
        rule: `shift +${n}, then reverse`,
      };
    },
  },
];

export function generate(rng) {
  const rule = rng.pick(RULES);
  const data = rule.build(rng);

  /* Build 4 distractors by tweaking the correct coded answer */
  const tried = new Set([data.tCoded]);
  const distractors = [];
  let safety = 30;
  while (distractors.length < 3 && safety-- > 0) {
    const candidate = mutate(rng, data.tCoded);
    if (!tried.has(candidate)) {
      tried.add(candidate);
      distractors.push(candidate);
    }
  }
  /* Extra fallbacks if mutation collided too often */
  while (distractors.length < 3) {
    distractors.push(encodeShift(data.tCoded, distractors.length + 2));
  }

  const options = rng.shuffle([data.tCoded, ...distractors]);
  const correctIndex = options.indexOf(data.tCoded);

  let answer = null;

  return {
    type: "coding-decoding",
    category: "Coding & Decoding",
    prompt: `If ${data.example} is written as ${data.eCoded}, how would ${data.target} be written?`,

    render() {
      const opts = options.map((text, i) => `
        <button type="button" class="option option--text option--mono reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          <span class="option__text">${text}</span>
        </button>
      `).join("");
      return `
        <div class="cipher">
          <div class="cipher__known">
            <span class="cipher__word">${data.example}</span>
            <span class="cipher__arrow">→</span>
            <span class="cipher__word cipher__word--coded">${data.eCoded}</span>
          </div>
          <div class="cipher__known cipher__known--unknown">
            <span class="cipher__word">${data.target}</span>
            <span class="cipher__arrow">→</span>
            <span class="cipher__word cipher__word--blank">???</span>
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
