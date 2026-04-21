/* Cube Net — show unfolded cube with symbols on each face.
   Four 3D cube options. User picks which folded cube matches the net. */

import { svgRoot, svgEl, CUBE_GLYPHS, COLORS } from "../svg.js";

const NET_LAYOUT = [
  /*   [top,   ] */
  /*   [L,F,R,B]*/
  /*   [bottom,] */
  { key: "top",    col: 1, row: 0 },
  { key: "left",   col: 0, row: 1 },
  { key: "front",  col: 1, row: 1 },
  { key: "right",  col: 2, row: 1 },
  { key: "back",   col: 3, row: 1 },
  { key: "bottom", col: 1, row: 2 },
];

function netSvg(faces) {
  const cell = 62;
  const w = cell * 4;
  const h = cell * 3;
  let inner = "";
  for (const { key, col, row } of NET_LAYOUT) {
    const x = col * cell, y = row * cell;
    inner += svgEl("rect", {
      x, y, width: cell, height: cell,
      fill: COLORS.fillRaised, stroke: COLORS.border, "stroke-width": 1.2,
    });
    /* label top-left */
    inner += svgEl("text", {
      x: x + 6, y: y + 14,
      "font-family": "Geist Mono, ui-monospace, monospace",
      "font-size": 8,
      fill: COLORS.strokeFaint,
      "letter-spacing": 1,
    }, key.toUpperCase().slice(0, 1));
    /* glyph */
    inner += `<g transform="translate(${x + cell * 0.15} ${y + cell * 0.15}) scale(${cell * 0.7 / 100})">
      ${CUBE_GLYPHS[faces[key]]()}
    </g>`;
  }
  return svgRoot(inner, { vb: `0 0 ${w} ${h}` });
}

/* Render a 3D cube in isometric projection, showing 3 faces (top, front, right). */
function isoCube(faces, { size = 110 } = {}) {
  /* Isometric projection of a unit cube. 3 visible faces as parallelograms. */
  const s = size / 2;
  const cx = size / 2;
  const cy = size / 2;

  /* Project cube vertices. Unit cube vertices in (x, y, z) ∈ {-1,1}.
     Iso: screenX = (x - z) * cos30 * s
           screenY = ((x + z) * sin30 - y) * s  (y positive = down) */
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  const project = (x, y, z) => [
    cx + (x - z) * cos30 * s,
    cy + ((x + z) * sin30 - y) * s,
  ];
  const v = {};
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    v[`${x},${y},${z}`] = project(x, y, z);
  }
  /* Visible faces under iso camera at (+x, +y, +z): normals +x, +y, +z.
     My projection flips y so y=+1 projects up on screen → top = y=+1 verts. */
  const top    = [v["-1,1,-1"],  v["1,1,-1"],  v["1,1,1"],   v["-1,1,1"]];
  const front  = [v["-1,-1,1"],  v["1,-1,1"],  v["1,1,1"],   v["-1,1,1"]];
  const right  = [v["1,-1,-1"],  v["1,-1,1"],  v["1,1,1"],   v["1,1,-1"]];

  const polyFill = {
    top:   COLORS.fillRaised,
    front: COLORS.fill,
    right: "#221f1c",
  };
  const poly = (pts, fill) =>
    svgEl("polygon", {
      points: pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "),
      fill, stroke: COLORS.border, "stroke-width": 1.2,
      "stroke-linejoin": "round",
    });

  /* Place glyph on a face using a clipPath & transform.
     Center of each face via average of corners. */
  const faceCenter = (pts) => {
    let x = 0, y = 0;
    for (const p of pts) { x += p[0]; y += p[1]; }
    return [x / 4, y / 4];
  };

  const glyphOn = (pts, key) => {
    const [fx, fy] = faceCenter(pts);
    const scale = size * 0.003;
    return `<g transform="translate(${fx - 50 * scale} ${fy - 50 * scale}) scale(${scale})">
      ${CUBE_GLYPHS[faces[key]]()}
    </g>`;
  };

  return svgRoot(
    poly(top, polyFill.top) + poly(front, polyFill.front) + poly(right, polyFill.right) +
    glyphOn(top, "top") + glyphOn(front, "front") + glyphOn(right, "right"),
    { vb: `0 0 ${size} ${size}` }
  );
}

export function generate(rng) {
  const symbols = rng.shuffle(["A", "B", "C", "D", "E", "F"]);
  const faces = {
    top:    symbols[0], bottom: symbols[1],
    front:  symbols[2], back:   symbols[3],
    right:  symbols[4], left:   symbols[5],
  };

  /* Correct: iso view showing {top, front, right} */
  const correct = { top: faces.top, front: faces.front, right: faces.right };

  /* Distractors: swap one face with its opposite OR a random other face */
  const allPairs = [["top","bottom"], ["front","back"], ["left","right"]];
  const distractors = [];
  for (const [a, b] of allPairs) {
    const d = { ...correct };
    /* Replace a face with its opposite symbol (impossible unless cube has
       duplicate faces) */
    if (correct.top === faces[a]) d.top = faces[b];
    else if (correct.front === faces[a]) d.front = faces[b];
    else if (correct.right === faces[a]) d.right = faces[b];
    else {
      /* swap two visible faces' glyphs */
      const keys = rng.sample(["top", "front", "right"], 2);
      const tmp = d[keys[0]]; d[keys[0]] = d[keys[1]]; d[keys[1]] = tmp;
    }
    distractors.push(d);
  }
  /* one more distractor: fully random permutation (not matching net) */
  {
    const pool = rng.shuffle(Object.values(faces));
    distractors.push({ top: pool[0], front: pool[1], right: pool[2] });
  }

  /* Shuffle options */
  const options = rng.shuffle([correct, ...distractors.slice(0, 3)]);
  const stringify = (o) => `${o.top}|${o.front}|${o.right}`;
  const correctIndex = options.findIndex(o => stringify(o) === stringify(correct));

  let answer = null;

  return {
    type: "cube-net",
    category: "Cube Net",
    prompt: "This flat shape folds up into a cube. Pick the cube it makes.",

    render() {
      const opts = options.map((o, i) => `
        <button type="button" class="option reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          ${isoCube(o)}
        </button>
      `).join("");
      return `
        <div class="net-wrap">
          <div class="net-display">${netSvg(faces)}</div>
        </div>
        <hr class="divider divider--dashed" style="margin-top:var(--s-8);">
        <p class="eyebrow" style="text-align:center;margin-bottom:var(--s-3);">Which cube could this net fold into?</p>
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
