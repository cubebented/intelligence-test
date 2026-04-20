/* Pattern Sequence Drawing — user draws the next step on a dot grid.
   Classic visual-sequence problem. Requires click-drag on grid (anti-AI). */

import { svgRoot, svgEl, COLORS } from "../svg.js";

const GRID = 6; /* 6x6 dot grid */

/* Patterns expressed as functions from step n (1-indexed) → Set<"c,r"> */
const PATTERNS = [
  {
    name: "L-shape",
    build: (n) => {
      const s = new Set();
      s.add(`0,${GRID - 1}`);
      for (let i = 1; i < n; i++) { s.add(`${i},${GRID - 1}`); s.add(`0,${GRID - 1 - i}`); }
      return s;
    },
  },
  {
    name: "diagonal",
    build: (n) => {
      const s = new Set();
      for (let i = 0; i < n; i++) s.add(`${i},${GRID - 1 - i}`);
      return s;
    },
  },
  {
    name: "filled triangle",
    build: (n) => {
      const s = new Set();
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n - r; c++) {
          s.add(`${c},${GRID - 1 - r}`);
        }
      }
      return s;
    },
  },
  {
    name: "centered plus",
    build: (n) => {
      const s = new Set();
      const cx = 2, cy = 2;        /* fixed anchor so grid fits for n up to 3 */
      s.add(`${cx},${cy}`);
      for (let i = 1; i < n; i++) {
        if (cx + i < GRID) s.add(`${cx + i},${cy}`);
        if (cx - i >= 0)   s.add(`${cx - i},${cy}`);
        if (cy + i < GRID) s.add(`${cx},${cy + i}`);
        if (cy - i >= 0)   s.add(`${cx},${cy - i}`);
      }
      return s;
    },
  },
  {
    name: "filled square",
    build: (n) => {
      const s = new Set();
      for (let c = 0; c < n; c++)
        for (let r = 0; r < n; r++)
          s.add(`${c},${GRID - 1 - r}`);
      return s;
    },
  },
  {
    name: "L-frame",
    build: (n) => {
      const s = new Set();
      for (let i = 0; i < n; i++) {
        s.add(`${i},${GRID - 1}`);          /* bottom row */
        s.add(`0,${GRID - 1 - i}`);          /* left col */
        s.add(`${n - 1},${GRID - 1 - i}`);   /* right edge */
        s.add(`${i},${GRID - n}`);           /* top edge of the L */
      }
      return s;
    },
  },
  /* Checkerboard growing — cells at (c+r) even, within an n×n square */
  {
    name: "checkerboard",
    build: (n) => {
      const s = new Set();
      for (let c = 0; c < n; c++)
        for (let r = 0; r < n; r++)
          if ((c + r) % 2 === 0) s.add(`${c},${GRID - 1 - r}`);
      return s;
    },
  },
  /* X pattern — two diagonals in an n×n square */
  {
    name: "X-cross",
    build: (n) => {
      const s = new Set();
      for (let i = 0; i < n; i++) {
        s.add(`${i},${GRID - 1 - i}`);         /* ↘ */
        s.add(`${n - 1 - i},${GRID - 1 - i}`); /* ↙ */
      }
      return s;
    },
  },
  /* Staircase — filling bottom row, then second-from-bottom partial, etc. */
  {
    name: "staircase",
    build: (n) => {
      const s = new Set();
      for (let r = 0; r < n; r++)
        for (let c = 0; c <= r; c++)
          s.add(`${c},${GRID - 1 - r}`);
      return s;
    },
  },
  /* Hollow square — n×n outline */
  {
    name: "hollow square",
    build: (n) => {
      const s = new Set();
      if (n === 1) { s.add(`0,${GRID - 1}`); return s; }
      for (let i = 0; i < n; i++) {
        s.add(`${i},${GRID - 1}`);          /* bottom */
        s.add(`${i},${GRID - n}`);          /* top */
        s.add(`0,${GRID - 1 - i}`);         /* left */
        s.add(`${n - 1},${GRID - 1 - i}`);  /* right */
      }
      return s;
    },
  },
  /* Spiral — outside-in rotation */
  {
    name: "zigzag",
    build: (n) => {
      /* row by row, alternating direction — snake pattern */
      const s = new Set();
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const cc = (r % 2 === 0) ? c : (n - 1 - c);
          if (cc < r + 1) s.add(`${cc},${GRID - 1 - r}`);
        }
      }
      return s;
    },
  },
];

/* Render a small static pattern into a 6x6 dot grid SVG for EXAMPLES. */
function patternSvg(set, { cellSize = 16 } = {}) {
  const size = GRID * cellSize;
  let inner = "";
  for (let c = 0; c < GRID; c++) {
    for (let r = 0; r < GRID; r++) {
      const on = set.has(`${c},${r}`);
      const cx = c * cellSize + cellSize / 2;
      const cy = r * cellSize + cellSize / 2;
      inner += svgEl("circle", {
        cx, cy, r: on ? 3.2 : 1.4,
        fill: on ? COLORS.accent : COLORS.strokeFaint,
      });
    }
  }
  return svgRoot(inner, { vb: `0 0 ${size} ${size}` });
}

/* Interactive dot grid — each dot is clickable to toggle. */
function canvasSvg() {
  const cellSize = 28;
  const size = GRID * cellSize;
  let inner = "";
  for (let c = 0; c < GRID; c++) {
    for (let r = 0; r < GRID; r++) {
      const cx = c * cellSize + cellSize / 2;
      const cy = r * cellSize + cellSize / 2;
      inner += `<circle class="draw-dot" cx="${cx}" cy="${cy}" r="3.2"
                        data-col="${c}" data-row="${r}"></circle>`;
    }
  }
  /* faint grid lines for alignment reference */
  for (let i = 1; i < GRID; i++) {
    inner += svgEl("line", {
      x1: 0, y1: i * cellSize, x2: size, y2: i * cellSize,
      stroke: COLORS.strokeFaint, "stroke-width": 0.4,
    });
    inner += svgEl("line", {
      x1: i * cellSize, y1: 0, x2: i * cellSize, y2: size,
      stroke: COLORS.strokeFaint, "stroke-width": 0.4,
    });
  }
  return svgRoot(inner, { vb: `0 0 ${size} ${size}` });
}

export function generate(rng) {
  const pattern = rng.pick(PATTERNS);
  const steps = [1, 2, 3].map(n => pattern.build(n));
  const targetSet = pattern.build(4);
  const target = [...targetSet].sort().join("|");

  let selected = new Set();

  return {
    type: "sequence",
    category: "Pattern Sequence",
    prompt: "Click dots on the right grid to draw what Step 4 looks like. The pattern continues consistently.",

    render() {
      const examples = steps.map((s, i) =>
        `<div class="draw-example">
           <span class="draw-example__n">Step ${i + 1}</span>
           ${patternSvg(s)}
         </div>`).join("");
      return `
        <div class="draw-wrap">
          <div>
            <p class="eyebrow" style="margin-bottom:var(--s-3);">Examples</p>
            <div class="draw-examples">${examples}</div>
          </div>
          <div>
            <p class="eyebrow" style="margin-bottom:var(--s-3);">Your answer — Step 4</p>
            <div class="draw-canvas" id="draw-canvas">
              ${canvasSvg()}
              <span class="draw-canvas__hint">click to toggle · drag to paint</span>
            </div>
            <div class="flex justify-between" style="margin-top:var(--s-3);">
              <span class="eyebrow" id="draw-count">0 dots placed</span>
              <button type="button" class="btn btn--ghost" id="draw-clear">Clear</button>
            </div>
          </div>
        </div>
      `;
    },

    attach(root, onAnswer) {
      const canvas = root.querySelector("#draw-canvas");
      const count = root.querySelector("#draw-count");
      const clearBtn = root.querySelector("#draw-clear");

      const commit = () => {
        count.textContent = `${selected.size} dot${selected.size === 1 ? "" : "s"} placed`;
        onAnswer(selected.size > 0 ? [...selected].sort().join("|") : null);
      };

      let dragging = false;
      let mode = "toggle";  /* 'add' or 'remove' based on first cell */

      const findDot = (e) => {
        const t = e.target.closest(".draw-dot");
        return t && canvas.contains(t) ? t : null;
      };

      const paint = (el) => {
        const key = `${el.dataset.col},${el.dataset.row}`;
        if (mode === "add") {
          if (!selected.has(key)) { selected.add(key); el.classList.add("draw-dot--on"); }
        } else if (mode === "remove") {
          if (selected.has(key)) { selected.delete(key); el.classList.remove("draw-dot--on"); }
        }
      };

      canvas.addEventListener("pointerdown", (e) => {
        const dot = findDot(e);
        if (!dot) return;
        dragging = true;
        const key = `${dot.dataset.col},${dot.dataset.row}`;
        mode = selected.has(key) ? "remove" : "add";
        paint(dot);
        commit();
        e.preventDefault();
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dot = findDot(e);
        if (!dot) return;
        paint(dot);
        commit();
      });
      window.addEventListener("pointerup", () => { dragging = false; });

      clearBtn.addEventListener("click", () => {
        selected.clear();
        canvas.querySelectorAll(".draw-dot--on").forEach(d => d.classList.remove("draw-dot--on"));
        commit();
      });
    },

    restore(root) {
      /* selected Set is still in closure — repaint the dots */
      const canvas = root.querySelector("#draw-canvas");
      const count  = root.querySelector("#draw-count");
      if (canvas) {
        canvas.querySelectorAll(".draw-dot").forEach(dot => {
          const key = `${dot.dataset.col},${dot.dataset.row}`;
          if (selected.has(key)) dot.classList.add("draw-dot--on");
        });
      }
      if (count) count.textContent = `${selected.size} dot${selected.size === 1 ? "" : "s"} placed`;
    },

    getAnswer: () => selected.size === 0 ? null : [...selected].sort().join("|"),
    hasAnswer: () => selected.size > 0,
    evaluate: (a) => a === target,
    correctAnswer: () => target,
  };
}
