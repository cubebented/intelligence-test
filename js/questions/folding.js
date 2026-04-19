/* Paper Folding — classic IQ test.
   A square paper is folded once or twice, then holes are punched through all
   layers. User picks which unfolded pattern results. */

import { svgRoot, svgEl, COLORS } from "../svg.js";

/* Paper rendered in 100x100 viewBox. A "hole" is a small circle. */

function paperSvg({ holes = [], folds = [], highlightFold = null, dim = false } = {}) {
  /* Paper outline */
  const stroke = dim ? COLORS.strokeFaint : COLORS.stroke;
  let inner = svgEl("rect", {
    x: 10, y: 10, width: 80, height: 80,
    fill: dim ? "transparent" : COLORS.fill,
    stroke, "stroke-width": 1.8,
    rx: 2,
  });
  /* Fold-line indicators (dashed) */
  for (const f of folds) {
    const isHL = f === highlightFold;
    if (f === "v") {
      inner += svgEl("line", {
        x1: 50, y1: 10, x2: 50, y2: 90,
        stroke: isHL ? COLORS.accent : COLORS.strokeFaint,
        "stroke-width": 1.2,
        "stroke-dasharray": "3 3",
      });
    } else if (f === "h") {
      inner += svgEl("line", {
        x1: 10, y1: 50, x2: 90, y2: 50,
        stroke: isHL ? COLORS.accent : COLORS.strokeFaint,
        "stroke-width": 1.2,
        "stroke-dasharray": "3 3",
      });
    }
  }
  for (const [x, y] of holes) {
    inner += svgEl("circle", {
      cx: x, cy: y, r: 3.8,
      fill: "#161513", stroke: COLORS.stroke, "stroke-width": 1.4,
    });
  }
  return svgRoot(inner);
}

/* Apply one fold mirror: given a hole on the folded paper, return BOTH holes
   on the unfolded version. fold: "v" = vertical, "h" = horizontal. */
function unfold(holes, fold) {
  const out = new Set();
  const push = ([x, y]) => out.add(`${x},${y}`);
  for (const [x, y] of holes) {
    push([x, y]);
    if (fold === "v") push([100 - x, y]);
    else if (fold === "h") push([x, 100 - y]);
  }
  return [...out].map(s => s.split(",").map(Number));
}

export function generate(rng) {
  /* Pick number of folds (1 or 2) */
  const nFolds = rng.pick([1, 1, 2]);
  const folds = nFolds === 1
    ? [rng.pick(["v", "h"])]
    : rng.shuffle(["v", "h"]);

  /* Pick hole positions on the fully-folded paper. These are in the
     "quadrant" where x < 50 and y < 50 (for 2 folds) or the half with
     x < 50 (for 1 fold with v) / y < 50 (for h). */
  const punchCount = rng.pick([1, 1, 2]);
  const candidates = [];
  for (let x = 22; x <= 42; x += 6) {
    for (let y = 22; y <= 42; y += 6) {
      candidates.push([x, y]);
    }
  }
  const punchedOnFolded = rng.sample(candidates, punchCount);

  /* Progressively unfold the punched holes */
  let current = punchedOnFolded.slice();
  const foldSteps = [];
  /* Build forward sequence: fully folded -> partially -> fully unfolded */
  /* First show the fold process: paper, paper-folded-1, paper-folded-2, punch */
  /* For display: we show 3 steps — (a) folds being applied (b) holes punched (c) options */

  /* Correct unfolded pattern: apply folds in reverse */
  for (let i = folds.length - 1; i >= 0; i--) {
    current = unfold(current, folds[i]);
  }
  const correct = current;

  /* Distractors */
  const dists = [];
  /* D1: unfold only one axis (if 2 folds) */
  if (folds.length === 2) {
    let alt = punchedOnFolded.slice();
    alt = unfold(alt, folds[1]);
    dists.push(alt);
  }
  /* D2: mirror-unfold across the WRONG axis */
  {
    let alt = punchedOnFolded.slice();
    alt = unfold(alt, folds[0] === "v" ? "h" : "v");
    dists.push(alt);
  }
  /* D3: only the holes on the folded side (no mirroring) */
  dists.push(punchedOnFolded.slice());

  /* D4: shift the mirror */
  {
    const alt = correct.map(([x, y]) => [100 - x, y]);
    dists.push(alt);
  }

  /* Deduplicate distractor sets by stringification */
  const key = (arr) => arr.map(p => p.join(",")).sort().join("|");
  const seen = new Set([key(correct)]);
  const uniqueDists = [];
  for (const d of dists) {
    const k = key(d);
    if (!seen.has(k)) { seen.add(k); uniqueDists.push(d); }
  }
  /* pad if too few */
  while (uniqueDists.length < 3) {
    uniqueDists.push(punchedOnFolded);
  }

  const options = rng.shuffle([correct, ...uniqueDists.slice(0, 3)]);
  const correctIndex = options.findIndex(o => key(o) === key(correct));

  let answer = null;

  return {
    type: "folding",
    category: "Paper Folding",
    prompt: "The paper is folded as shown, then holes are punched through all layers. Which pattern appears when it is unfolded?",

    render() {
      /* Render the fold sequence as small panels */
      const steps = [];
      steps.push(`<div class="fold-step">
        <span class="fold-step__label">Start</span>
        ${paperSvg()}
      </div>`);
      /* Step for each fold, cumulative fold display */
      let foldsApplied = [];
      for (const f of folds) {
        foldsApplied.push(f);
        steps.push(`<div class="fold-step">
          <span class="fold-step__label">Fold ${foldsApplied.length}</span>
          ${paperSvg({ folds: [...foldsApplied], highlightFold: f })}
        </div>`);
      }
      /* Punch step */
      steps.push(`<div class="fold-step">
        <span class="fold-step__label">Punch</span>
        ${paperSvg({ folds, holes: punchedOnFolded })}
      </div>`);
      const seq = steps.join('<span class="fold-arrow">→</span>');

      const opts = options.map((holes, i) => `
        <button type="button" class="option reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          ${paperSvg({ holes, dim: true })}
        </button>
      `).join("");

      return `
        <div class="fold-wrap">
          <div class="fold-sequence">${seq}</div>
        </div>
        <hr class="divider divider--dashed" style="margin-top:var(--s-8);">
        <p class="eyebrow" style="text-align:center;margin-bottom:var(--s-3);">Which matches when unfolded?</p>
        <div class="options options--4">${opts}</div>
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
