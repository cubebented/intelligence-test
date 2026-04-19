/* Figure Analogy — A : B :: C : ?
   A transformation is applied from A→B. User picks option that applies the
   same transformation to C. */

import { svgRoot, drawShape } from "../svg.js";

const TRANSFORMS = [
  { name: "rotate-90",  apply: (s) => ({ ...s, rotate: (s.rotate || 0) + 90 }) },
  { name: "rotate-180", apply: (s) => ({ ...s, rotate: (s.rotate || 0) + 180 }) },
  { name: "flip-h",     apply: (s) => ({ ...s, flipH: !s.flipH }) },
  { name: "scale-down", apply: (s) => ({ ...s, scale: 0.6 }) },
  { name: "scale-up",   apply: (s) => ({ ...s, scale: 1.35 }) },
  { name: "rotate-45",  apply: (s) => ({ ...s, rotate: (s.rotate || 0) + 45 }) },
];

function render(state) {
  const { shape, rotate = 0, scale = 1, flipH = false } = state;
  let svg = drawShape(shape, { rotate, scale });
  if (flipH) {
    svg = `<g transform="translate(100 0) scale(-1 1)">${drawShape(shape, { rotate, scale })}</g>`;
  }
  return svgRoot(svg);
}

export function generate(rng) {
  const shapes = ["triangle", "pentagon", "star", "hexagon", "diamond", "square"];
  const shapeA = rng.pick(shapes);
  const shapeC = rng.pick(shapes.filter(s => s !== shapeA));
  const tfm = rng.pick(TRANSFORMS);

  const A = { shape: shapeA };
  const B = tfm.apply(A);
  const C = { shape: shapeC };
  const D_correct = tfm.apply(C);

  const wrongTransforms = TRANSFORMS.filter(t => t.name !== tfm.name);
  const distractors = rng.sample(wrongTransforms, 4).map(t => t.apply(C));
  distractors.push({ ...C }); // identity as distractor

  const optionStates = rng.shuffle([D_correct, ...distractors]);
  const correctIndex = optionStates.indexOf(D_correct);

  let answer = null;

  return {
    type: "analogy",
    category: "Figure Analogy",
    prompt: "A is to B as C is to ? — pick the figure that applies the same transformation.",

    render() {
      const opts = optionStates.map((s, i) =>
        `<button type="button" class="option reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          ${render(s)}
        </button>`).join("");
      return `
        <div class="analogy">
          <div class="analogy__cell">${render(A)}</div>
          <span class="analogy__arrow">::</span>
          <div class="analogy__cell">${render(B)}</div>
          <span class="analogy__arrow">∷</span>
          <div class="analogy__cell">${render(C)}</div>
          <span class="analogy__arrow">::</span>
          <div class="analogy__cell analogy__cell--empty"></div>
        </div>
        <hr class="divider divider--dashed" style="margin-top:var(--s-8);">
        <p class="eyebrow" style="text-align:center;margin-bottom:var(--s-3);">Apply the same transformation</p>
        <div class="options options--6">${opts}</div>
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
