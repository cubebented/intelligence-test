/* Hidden Figure — classic Embedded Figures Test.
   A complex composite figure contains a target shape + two "noise" shapes
   drawn in uniform outline, rotated/overlapping so the target's edges merge
   into the clutter. The user picks which of 4 simple shapes is hidden. */

import { svgRoot, drawShape, svgEl, COLORS } from "../svg.js";

const POOL = ["triangle", "square", "pentagon", "hexagon", "diamond", "circle", "star"];

function composite(rng, target) {
  /* Render the target at center, rotated. Overlay two noise shapes at
     different rotations/scales so its outline partially blends in. */
  const parts = [];
  const targetRot = rng.pick([0, 15, 25, 40, 55]);
  parts.push(drawShape(target, {
    cx: 50, cy: 50, r: 30,
    rotate: targetRot,
    stroke: COLORS.stroke, sw: 2,
  }));
  /* Two noise shapes — pick non-target shapes */
  const noise = rng.sample(POOL.filter(s => s !== target), 2);
  noise.forEach((n, i) => {
    parts.push(drawShape(n, {
      cx: 50, cy: 50,
      r: 28 + (i === 0 ? 2 : -4),
      rotate: rng.pick([20, 45, 75, 110, 135]),
      stroke: COLORS.stroke, sw: 1.8,
    }));
  });
  /* A few decorative short lines to increase clutter.
     Fully randomized — angle, length, offset, stroke width all seeded. */
  const lineCount = rng.int(3, 5);
  for (let i = 0; i < lineCount; i++) {
    const ang    = rng.int(0, 359) * Math.PI / 180;
    /* Random origin offset so lines don't all radiate from the center */
    const ox     = rng.int(30, 70);
    const oy     = rng.int(30, 70);
    const len    = rng.int(14, 32);
    const skew   = (rng.int(-18, 18)) * Math.PI / 180;
    const x1 = ox + Math.cos(ang) * (len / 2);
    const y1 = oy + Math.sin(ang) * (len / 2);
    const x2 = ox - Math.cos(ang + skew) * (len / 2);
    const y2 = oy - Math.sin(ang + skew) * (len / 2);
    parts.push(svgEl("line", {
      x1: x1.toFixed(1), y1: y1.toFixed(1),
      x2: x2.toFixed(1), y2: y2.toFixed(1),
      stroke: COLORS.strokeFaint,
      "stroke-width": (0.8 + rng.int(0, 80) / 100).toFixed(2),
      "stroke-linecap": "round",
    }));
  }
  return svgRoot(parts.join(""), { vb: "0 0 100 100" });
}

function smallShapeSvg(name) {
  return svgRoot(drawShape(name, { r: 28, stroke: COLORS.stroke, sw: 2.2 }), { vb: "0 0 100 100" });
}

export function generate(rng) {
  const target = rng.pick(POOL);
  const distractors = rng.sample(POOL.filter(s => s !== target), 3);
  const options = rng.shuffle([target, ...distractors]);
  const correctIndex = options.indexOf(target);

  let answer = null;

  return {
    type: "hidden-figure",
    category: "Hidden Figure",
    prompt: "One of these simple shapes is embedded in the figure on the left. Which one is it?",

    render() {
      const fig = composite(rng.branch(`hid:${target}`), target);
      const opts = options.map((sh, i) =>
        `<button type="button" class="option reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          ${smallShapeSvg(sh)}
        </button>`).join("");

      return `
        <div class="hidden-wrap">
          <div class="hidden-figure">${fig}</div>
          <div class="hidden-options">
            <p class="eyebrow" style="text-align:center;margin-bottom:var(--s-3);">Which shape is hidden?</p>
            <div class="options options--4">${opts}</div>
          </div>
        </div>`;
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
