/* Matrix Reasoning — Raven's Progressive Matrices style.
   3x3 grid, cell [2][2] missing. User picks from 6 options.
   Rules: shape across rows × rotation (or count) down cols. */

import { svgRoot, drawShape, svgEl, SHAPES, COLORS } from "../svg.js";

const TEMPLATES = [
  /* --- A: shape across rows × rotation down cols --- */
  {
    build(rng) {
      const shapes = rng.sample(
        ["triangle", "diamond", "pentagon", "hexagon", "star", "circle"], 3);
      const rot = rng.pick([[0, 45, 90], [0, 60, 120], [0, 90, 180]]);
      const cell = (c, r) =>
        svgRoot(drawShape(shapes[c], { rotate: rot[r], r: 26 }));
      const correct = svgRoot(drawShape(shapes[2], { rotate: rot[2], r: 26 }));
      const distract = [
        [shapes[2], rot[0]], [shapes[2], rot[1]], [shapes[0], rot[2]],
        [shapes[1], rot[2]], [shapes[0], rot[0]],
      ].map(([s, ro]) => svgRoot(drawShape(s, { rotate: ro, r: 26 })));
      return { cell, correct, distract };
    },
  },

  /* --- B: count across rows × shape down cols --- */
  {
    build(rng) {
      const shapes = rng.sample(
        ["triangle", "diamond", "pentagon", "hexagon", "circle"], 3);
      const counts = [1, 2, 3];
      const draw = (shapeName, count) => {
        const positions = [
          [[50, 50]],
          [[32, 50], [68, 50]],
          [[32, 35], [68, 35], [50, 68]],
        ][count - 1];
        return positions
          .map(([x, y]) => drawShape(shapeName, { cx: x, cy: y, r: 14, sw: 2 }))
          .join("");
      };
      const cell = (c, r) => svgRoot(draw(shapes[r], counts[c]));
      const correct = svgRoot(draw(shapes[2], counts[2]));
      const distract = [
        svgRoot(draw(shapes[2], counts[0])),
        svgRoot(draw(shapes[2], counts[1])),
        svgRoot(draw(shapes[0], counts[2])),
        svgRoot(draw(shapes[1], counts[2])),
        svgRoot(draw(shapes[0], counts[1])),
      ];
      return { cell, correct, distract };
    },
  },

  /* --- C: rotation across rows × shape down cols --- */
  {
    build(rng) {
      const shapes = rng.sample(["triangle", "pentagon", "star"], 3);
      const rot = [0, 120, 240];
      const cell = (c, r) =>
        svgRoot(drawShape(shapes[r], { rotate: rot[c], r: 26 }));
      const correct = svgRoot(drawShape(shapes[2], { rotate: rot[2], r: 26 }));
      const distract = [
        svgRoot(drawShape(shapes[2], { rotate: rot[0], r: 26 })),
        svgRoot(drawShape(shapes[0], { rotate: rot[2], r: 26 })),
        svgRoot(drawShape(shapes[1], { rotate: rot[2], r: 26 })),
        svgRoot(drawShape(shapes[2], { rotate: rot[1], r: 26 })),
        svgRoot(drawShape(shapes[0], { rotate: rot[0], r: 26 })),
      ];
      return { cell, correct, distract };
    },
  },

  /* --- D: nested shapes — outer across rows, inner down cols --- */
  {
    build(rng) {
      const outer = rng.sample(["circle", "square", "diamond", "hexagon"], 3);
      const inner = rng.sample(["dot", "triangle", "cross"], 3);
      const compose = (o, i) =>
        drawShape(o, { r: 28 }) + drawShape(i, { r: 12 });
      const cell = (c, r) => svgRoot(compose(outer[c], inner[r]));
      const correct = svgRoot(compose(outer[2], inner[2]));
      const distract = [
        svgRoot(compose(outer[2], inner[0])),
        svgRoot(compose(outer[0], inner[2])),
        svgRoot(compose(outer[1], inner[2])),
        svgRoot(compose(outer[2], inner[1])),
        svgRoot(compose(outer[0], inner[0])),
      ];
      return { cell, correct, distract };
    },
  },
];

export function generate(rng) {
  const tpl = rng.pick(TEMPLATES);
  const { cell, correct, distract } = tpl.build(rng);

  const options = rng.shuffle([correct, ...distract]);
  const correctIndex = options.indexOf(correct);

  let answer = null;

  return {
    type: "matrix",
    category: "Matrix Reasoning",
    prompt: "Select the figure that completes the pattern.",

    render() {
      let grid = "";
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const isEmpty = r === 2 && c === 2;
          grid += `<div class="matrix-cell ${isEmpty ? "matrix-cell--empty" : ""}" aria-label="row ${r+1} col ${c+1}">${isEmpty ? "" : cell(c, r)}</div>`;
        }
      }
      const opts = options.map((svg, i) =>
        `<button type="button" class="option reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          ${svg}
        </button>`).join("");
      return `
        <div class="matrix-grid">${grid}</div>
        <hr class="divider divider--dashed" style="margin-top:var(--s-8);">
        <p class="eyebrow" style="text-align:center;margin-bottom:var(--s-3);">Choose the missing piece</p>
        <div class="options options--${options.length === 6 ? "6" : "8"}">${opts}</div>
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
