/* Odd One Out — 5 figures, 4 share a property, 1 doesn't.
   User clicks the one that breaks the rule. */

import { svgRoot, drawShape, svgEl, COLORS } from "../svg.js";

/* Rule sets. Each returns { items: [...5 states], oddIndex: int }. */
const RULES = [
  /* Rule 1: four rotations of same shape + one different shape at same rotation */
  {
    build(rng) {
      const base = rng.pick(["triangle", "pentagon", "hexagon", "star", "diamond"]);
      const other = rng.pick(["square", "circle", "cross"].filter(s => s !== base));
      const rots = rng.sample([0, 45, 90, 135, 180, 225, 270], 4);
      const items = rots.map(r => ({ shape: base, rotate: r }));
      items.push({ shape: other, rotate: rng.pick(rots) });
      const shuffled = rng.shuffle(items);
      return { items: shuffled, oddIndex: shuffled.findIndex(i => i.shape === other) };
    },
  },
  /* Rule 2: four have same number of sides, one differs */
  {
    build(rng) {
      const group1 = ["triangle"];                  // 3
      const group2 = ["square", "diamond"];         // 4
      const group3 = ["pentagon"];                  // 5
      const group4 = ["hexagon"];                   // 6
      const groups = [group1, group2, group3, group4];
      const baseGroup = rng.pick(groups);
      const otherGroup = rng.pick(groups.filter(g => g !== baseGroup));
      const base = rng.pick(baseGroup);
      const other = rng.pick(otherGroup);
      const items = [];
      for (let i = 0; i < 4; i++) {
        items.push({ shape: base, rotate: rng.pick([0, 45, 90, 180]), scale: rng.pick([0.85, 1, 1.15]) });
      }
      items.push({ shape: other, rotate: rng.pick([0, 45]), scale: 1 });
      const shuffled = rng.shuffle(items);
      return { items: shuffled, oddIndex: shuffled.findIndex(i => i.shape === other) };
    },
  },
  /* Rule 3: filled vs empty — 4 filled shapes, 1 outline (or vice versa) */
  {
    build(rng) {
      const shape = rng.pick(["triangle", "circle", "square", "hexagon", "star"]);
      const oddIsOutline = rng.bool();
      const items = [];
      for (let i = 0; i < 4; i++) {
        items.push({
          shape,
          rotate: rng.pick([0, 30, 60, 90, 120]),
          fill: oddIsOutline ? COLORS.accent : "none",
          stroke: oddIsOutline ? COLORS.accent : COLORS.stroke,
        });
      }
      items.push({
        shape,
        rotate: rng.pick([0, 30, 60, 90]),
        fill: oddIsOutline ? "none" : COLORS.accent,
        stroke: oddIsOutline ? COLORS.stroke : COLORS.accent,
      });
      const shuffled = rng.shuffle(items);
      return { items: shuffled, oddIndex: shuffled.findIndex(i => (i.fill === "none") === oddIsOutline) };
    },
  },
  /* Rule 4: one has bilateral symmetry broken (e.g., star with one arm clipped).
     Simpler: 4 symmetric shapes, 1 with a dot offset */
  {
    build(rng) {
      const shape = rng.pick(["hexagon", "circle", "square", "diamond"]);
      const items = [];
      for (let i = 0; i < 4; i++) {
        items.push({ shape, rotate: rng.pick([0, 45, 90, 135]), marker: "center" });
      }
      items.push({ shape, rotate: rng.pick([0, 45, 90]), marker: "offset" });
      const shuffled = rng.shuffle(items);
      return { items: shuffled, oddIndex: shuffled.findIndex(i => i.marker === "offset") };
    },
  },
];

function renderItem(state) {
  const { shape, rotate = 0, scale = 1, fill = "none", stroke = COLORS.stroke, marker } = state;
  let inner = drawShape(shape, { rotate, scale, fill, stroke });
  if (marker === "center") {
    inner += drawShape("dot", { cx: 50, cy: 50, r: 6 });
  } else if (marker === "offset") {
    inner += drawShape("dot", { cx: 62, cy: 38, r: 6 });
  }
  return svgRoot(inner);
}

export function generate(rng) {
  const rule = rng.pick(RULES);
  const { items, oddIndex } = rule.build(rng);
  let answer = null;

  return {
    type: "odd-one",
    category: "Odd One Out",
    prompt: "Four of these share a property. Click the one that doesn't belong.",

    render() {
      const cells = items.map((s, i) =>
        `<button type="button" class="odd-cell reveal" style="--i:${i}" data-idx="${i}">
          <span class="odd-cell__label">${String.fromCharCode(65 + i)}</span>
          ${renderItem(s)}
        </button>`).join("");
      return `<div class="odd-row">${cells}</div>`;
    },

    attach(root, onAnswer) {
      root.querySelectorAll(".odd-cell").forEach(btn => {
        btn.addEventListener("click", () => {
          root.querySelectorAll(".odd-cell").forEach(b => b.classList.remove("odd-cell--selected"));
          btn.classList.add("odd-cell--selected");
          answer = Number(btn.dataset.idx);
          onAnswer(answer);
        });
      });
    },

    restore(root, { answer: savedAnswer } = {}) {
      const a = savedAnswer ?? answer;
      if (a === null || a === undefined) return;
      const btn = root.querySelector(`.odd-cell[data-idx="${a}"]`);
      if (btn) btn.classList.add("odd-cell--selected");
    },

    getAnswer: () => answer,
    hasAnswer: () => answer !== null,
    evaluate: (a) => a === oddIndex,
    correctAnswer: () => oddIndex,
  };
}
