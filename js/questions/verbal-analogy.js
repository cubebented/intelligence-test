/* Verbal Analogy — classic "A is to B as C is to ?".
   Tests relational reasoning over words. User picks the option that
   preserves the same relationship. */

/* Each analogy is a chain of relationships of the same category, so we
   can generate fresh pairs from a relationship table and produce plausible
   wrong answers that violate the relation. */

const RELATIONS = [
  {
    /* young-of */
    name: "young-of",
    pairs: [
      ["dog", "puppy"], ["cat", "kitten"], ["cow", "calf"],
      ["horse", "foal"], ["sheep", "lamb"], ["frog", "tadpole"],
      ["bird", "chick"], ["deer", "fawn"],
    ],
  },
  {
    /* tool → profession user */
    name: "tool-user",
    pairs: [
      ["hammer", "carpenter"], ["scalpel", "surgeon"], ["brush", "painter"],
      ["camera", "photographer"], ["rake", "gardener"], ["baton", "conductor"],
    ],
  },
  {
    /* opposite */
    name: "opposite",
    pairs: [
      ["hot", "cold"], ["up", "down"], ["bright", "dim"], ["loud", "quiet"],
      ["tight", "loose"], ["wet", "dry"], ["fast", "slow"], ["hard", "soft"],
      ["full", "empty"], ["rough", "smooth"],
    ],
  },
  {
    /* part → whole */
    name: "part-whole",
    pairs: [
      ["petal", "flower"], ["wheel", "car"], ["page", "book"],
      ["key", "keyboard"], ["string", "guitar"], ["leaf", "tree"],
      ["room", "house"], ["chapter", "novel"],
    ],
  },
  {
    /* category → member */
    name: "category-member",
    pairs: [
      ["fruit", "apple"], ["metal", "copper"], ["planet", "Mars"],
      ["gas", "helium"], ["ocean", "Pacific"], ["instrument", "violin"],
    ],
  },
  {
    /* item → habitat */
    name: "habitat",
    pairs: [
      ["fish", "water"], ["bird", "sky"], ["mole", "burrow"],
      ["bee", "hive"], ["bear", "den"], ["spider", "web"],
    ],
  },
  {
    /* degree: small → large equivalent */
    name: "degree",
    pairs: [
      ["warm", "hot"], ["cool", "cold"], ["glance", "stare"],
      ["sip", "gulp"], ["trickle", "flood"], ["smile", "laugh"],
      ["breeze", "gale"], ["jog", "sprint"],
    ],
  },
  {
    /* worker → output */
    name: "output",
    pairs: [
      ["baker", "bread"], ["author", "book"], ["composer", "symphony"],
      ["farmer", "crops"], ["jeweler", "ring"], ["architect", "blueprint"],
    ],
  },
];

function capitalize(s) { return s[0].toUpperCase() + s.slice(1); }

export function generate(rng) {
  const rel = rng.pick(RELATIONS);
  const [pairA, pairC] = rng.sample(rel.pairs, 2);
  const [a, b] = pairA;
  const [c, d_correct] = pairC;

  /* Distractors: pick B-side words from OTHER relations so they don't fit */
  const otherRels = RELATIONS.filter(r => r.name !== rel.name);
  const distractors = [];
  const used = new Set([b, d_correct, a, c]);

  while (distractors.length < 3) {
    const r = rng.pick(otherRels);
    const p = rng.pick(r.pairs);
    const cand = rng.bool() ? p[0] : p[1];
    if (!used.has(cand)) {
      distractors.push(cand);
      used.add(cand);
    }
  }

  const options = rng.shuffle([d_correct, ...distractors]);
  const correctIndex = options.indexOf(d_correct);

  let answer = null;

  return {
    type: "verbal-analogy",
    category: "Verbal Analogy",
    prompt: "Pick the word that completes the analogy.",

    render() {
      const opts = options.map((word, i) => `
        <button type="button" class="option option--text reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          <span class="option__text">${word}</span>
        </button>
      `).join("");
      return `
        <div class="v-analogy">
          <div class="v-analogy__equation">
            <span class="v-analogy__word">${capitalize(a)}</span>
            <span class="v-analogy__rel">is to</span>
            <span class="v-analogy__word">${b}</span>
            <span class="v-analogy__sep">::</span>
            <span class="v-analogy__word">${capitalize(c)}</span>
            <span class="v-analogy__rel">is to</span>
            <span class="v-analogy__word v-analogy__word--blank">?</span>
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
