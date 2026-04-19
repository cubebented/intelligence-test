/* Relationships — classic "blood relation" puzzles.
   A short narrative describes a chain of relationships; the user must
   name the final relationship. Tests sequential inference + bookkeeping
   in natural language. */

const M = ["Arjun", "Luca", "Remi", "Noah", "Felix"];
const F = ["Maya", "Sara", "Imra", "Zoe", "Nia"];

const TEMPLATES = [
  /* 1. Mother's brother = uncle */
  {
    build(rng) {
      const speaker = rng.pick(F);
      const uncle   = rng.pick(M);
      return {
        premise: `Pointing at ${uncle}, ${speaker} says, "He is my mother's brother."`,
        question: `What is ${uncle} to ${speaker}?`,
        correct: "Uncle",
        options: ["Uncle", "Father", "Cousin", "Brother"],
      };
    },
  },
  /* 2. Father's sister = aunt */
  {
    build(rng) {
      const speaker = rng.pick(M);
      const aunt    = rng.pick(F);
      return {
        premise: `Pointing at ${aunt}, ${speaker} says, "She is my father's sister."`,
        question: `What is ${aunt} to ${speaker}?`,
        correct: "Aunt",
        options: ["Aunt", "Mother", "Sister", "Cousin"],
      };
    },
  },
  /* 3. Sister's son = nephew */
  {
    build(rng) {
      const speaker = rng.pick(F);
      const nephew  = rng.pick(M);
      return {
        premise: `${speaker} says about ${nephew}: "He is my sister's son."`,
        question: `What is ${nephew} to ${speaker}?`,
        correct: "Nephew",
        options: ["Nephew", "Son", "Brother", "Cousin"],
      };
    },
  },
  /* 4. Brother's daughter = niece */
  {
    build(rng) {
      const speaker = rng.pick(M);
      const niece   = rng.pick(F);
      return {
        premise: `${speaker} says about ${niece}: "She is my brother's daughter."`,
        question: `What is ${niece} to ${speaker}?`,
        correct: "Niece",
        options: ["Niece", "Daughter", "Sister", "Cousin"],
      };
    },
  },
  /* 5. Mother's mother = grandmother */
  {
    build(rng) {
      const speaker = rng.pick([...M, ...F]);
      const gm      = rng.pick(F);
      return {
        premise: `${gm} is the mother of ${speaker}'s mother.`,
        question: `What is ${gm} to ${speaker}?`,
        correct: "Grandmother",
        options: ["Grandmother", "Mother", "Aunt", "Cousin"],
      };
    },
  },
  /* 6. Father's father = grandfather */
  {
    build(rng) {
      const speaker = rng.pick([...M, ...F]);
      const gp      = rng.pick(M);
      return {
        premise: `${gp} is the father of ${speaker}'s father.`,
        question: `What is ${gp} to ${speaker}?`,
        correct: "Grandfather",
        options: ["Grandfather", "Father", "Uncle", "Cousin"],
      };
    },
  },
  /* 7. Two-step: father's brother's son = cousin */
  {
    build(rng) {
      const speaker = rng.pick([...M, ...F]);
      const cousin  = rng.pick(M);
      return {
        premise: `${cousin} is the son of ${speaker}'s father's brother.`,
        question: `What is ${cousin} to ${speaker}?`,
        correct: "Cousin",
        options: ["Cousin", "Brother", "Uncle", "Nephew"],
      };
    },
  },
  /* 8. Daughter's husband = son-in-law */
  {
    build(rng) {
      const speaker = rng.pick([...M, ...F]);
      const sil     = rng.pick(M);
      return {
        premise: `${sil} is married to ${speaker}'s daughter.`,
        question: `What is ${sil} to ${speaker}?`,
        correct: "Son-in-law",
        options: ["Son-in-law", "Son", "Brother-in-law", "Father-in-law"],
      };
    },
  },
  /* 9. Son's wife = daughter-in-law */
  {
    build(rng) {
      const speaker = rng.pick([...M, ...F]);
      const dil     = rng.pick(F);
      return {
        premise: `${dil} is married to ${speaker}'s son.`,
        question: `What is ${dil} to ${speaker}?`,
        correct: "Daughter-in-law",
        options: ["Daughter-in-law", "Daughter", "Sister-in-law", "Mother-in-law"],
      };
    },
  },
  /* 10. Wife's brother = brother-in-law */
  {
    build(rng) {
      const speaker = rng.pick(M);
      const bil     = rng.pick(M);
      return {
        premise: `${bil} is the brother of ${speaker}'s wife.`,
        question: `What is ${bil} to ${speaker}?`,
        correct: "Brother-in-law",
        options: ["Brother-in-law", "Brother", "Father-in-law", "Cousin"],
      };
    },
  },
  /* 11. Three-step: mother's father's wife = grandmother (paternal of mother) */
  {
    build(rng) {
      const speaker = rng.pick([...M, ...F]);
      const p       = rng.pick(F);
      return {
        premise: `${p} is the wife of ${speaker}'s mother's father.`,
        question: `What is ${p} to ${speaker}?`,
        correct: "Grandmother",
        options: ["Grandmother", "Mother", "Aunt", "Great-grandmother"],
      };
    },
  },
  /* 12. Only son of mother's mother = uncle */
  {
    build(rng) {
      const speaker = rng.pick([...M, ...F]);
      const u       = rng.pick(M);
      return {
        premise: `${u} is the only son of ${speaker}'s mother's mother.`,
        question: `What is ${u} to ${speaker}?`,
        correct: "Uncle",
        options: ["Uncle", "Father", "Grandfather", "Cousin"],
      };
    },
  },
  /* 13. Grandchild — father's son's child */
  {
    build(rng) {
      const speaker = rng.pick([...M, ...F]);
      const person  = rng.pick([...M, ...F]);
      return {
        premise: `${person} is the child of ${speaker}'s son.`,
        question: `What is ${person} to ${speaker}?`,
        correct: "Grandchild",
        options: ["Grandchild", "Child", "Niece or nephew", "Cousin"],
      };
    },
  },
];

export function generate(rng) {
  const tpl  = rng.pick(TEMPLATES);
  const data = tpl.build(rng);
  const options = rng.shuffle(data.options);
  const correctIndex = options.indexOf(data.correct);

  let answer = null;

  return {
    type: "relationship",
    category: "Relationships",
    prompt: "Work out the relationship from the statement.",

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
