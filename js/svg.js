/* SVG building utilities.
   All generators emit SVG strings (strings compose easier than DOM nodes
   across fragment boundaries). Shapes deliberately use varied stroke widths,
   muted fills, and never gratuitous drop-shadows. */

const NS = "http://www.w3.org/2000/svg";

/* ---------- primitive helpers ---------- */

export function svgEl(tag, attrs = {}, inner = "") {
  const parts = [];
  for (const k in attrs) {
    if (attrs[k] === false || attrs[k] == null) continue;
    parts.push(`${k}="${String(attrs[k]).replace(/"/g, "&quot;")}"`);
  }
  if (!inner) return `<${tag} ${parts.join(" ")}/>`;
  return `<${tag} ${parts.join(" ")}>${inner}</${tag}>`;
}

export function svgRoot(inner, opts = {}) {
  const { vb = "0 0 100 100", cls = "", title = "", role = "img" } = opts;
  const titleBlock = title
    ? `<title>${title}</title><desc>${title}</desc>`
    : "";
  return `<svg xmlns="${NS}" viewBox="${vb}" class="${cls}" role="${role}" preserveAspectRatio="xMidYMid meet" aria-hidden="${role === "presentation"}">${titleBlock}${inner}</svg>`;
}

/* ---------- theme colors (match CSS tokens, used inside SVG fills) ---------- */

export const COLORS = {
  stroke:    "#a8a49a",      // text-secondary
  strokeDim: "#6d6a62",      // text-muted
  strokeFaint: "#4a4843",    // text-faint
  fill:      "#2a2926",      // surface-hover
  fillRaised:"#33322e",      // surface-active
  accent:    "#c4795a",      // accent
  accentDim: "#6e4232",      // accent-dim
};

/* ---------- shape builders ---------- */

const SW_BOLD = 2.2;
const SW_REG  = 1.6;
const SW_THIN = 1.0;

/** Regular polygon with n sides. Returns <polygon> string. */
export function polygon(n, cx, cy, r, rot = 0, attrs = {}) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return svgEl("polygon", {
    points: pts.join(" "),
    stroke: COLORS.stroke,
    "stroke-width": SW_REG,
    "stroke-linejoin": "round",
    fill: "none",
    ...attrs,
  });
}

export function circle(cx, cy, r, attrs = {}) {
  return svgEl("circle", {
    cx, cy, r,
    stroke: COLORS.stroke,
    "stroke-width": SW_REG,
    fill: "none",
    ...attrs,
  });
}

export function rect(x, y, w, h, attrs = {}) {
  return svgEl("rect", {
    x, y, width: w, height: h,
    stroke: COLORS.stroke,
    "stroke-width": SW_REG,
    fill: "none",
    ...attrs,
  });
}

export function line(x1, y1, x2, y2, attrs = {}) {
  return svgEl("line", {
    x1, y1, x2, y2,
    stroke: COLORS.stroke,
    "stroke-width": SW_REG,
    "stroke-linecap": "round",
    ...attrs,
  });
}

export function path(d, attrs = {}) {
  return svgEl("path", {
    d,
    stroke: COLORS.stroke,
    "stroke-width": SW_REG,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    fill: "none",
    ...attrs,
  });
}

/** Star with n points, outer radius ro, inner radius ri */
export function star(n, cx, cy, ro, ri, rot = 0, attrs = {}) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = rot + (i * Math.PI) / n - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return svgEl("polygon", {
    points: pts.join(" "),
    stroke: COLORS.stroke,
    "stroke-width": SW_REG,
    "stroke-linejoin": "round",
    fill: "none",
    ...attrs,
  });
}

/** Arrow body from (x1,y1) to (x2,y2) with head */
export function arrow(x1, y1, x2, y2, attrs = {}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const hl = 6;
  const hw = 4;
  const bx = x2 - hl * Math.cos(ang);
  const by = y2 - hl * Math.sin(ang);
  const pX = bx - hw * Math.sin(ang);
  const pY = by + hw * Math.cos(ang);
  const qX = bx + hw * Math.sin(ang);
  const qY = by - hw * Math.cos(ang);
  return (
    svgEl("line", { x1, y1, x2: bx, y2: by, stroke: COLORS.stroke, "stroke-width": SW_REG, "stroke-linecap": "round", ...attrs }) +
    svgEl("polygon", {
      points: `${x2},${y2} ${pX.toFixed(2)},${pY.toFixed(2)} ${qX.toFixed(2)},${qY.toFixed(2)}`,
      fill: COLORS.stroke,
      stroke: "none",
      ...attrs,
    })
  );
}

/** Dotted cross (grid marker) */
export function tick(cx, cy, size = 3) {
  return svgEl("path", {
    d: `M${cx - size},${cy} L${cx + size},${cy} M${cx},${cy - size} L${cx},${cy + size}`,
    stroke: COLORS.strokeFaint,
    "stroke-width": 0.8,
    "stroke-linecap": "round",
  });
}

/* ---------- unified shape drawer (0..100 coord system) ---------- */

function polyPoints(n, cx, cy, r, startAng) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = startAng + (i * 2 * Math.PI) / n;
    out.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return out.join(" ");
}

function starPoints(n, cx, cy, ro, ri, startAng) {
  const out = [];
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? ro : ri;
    const a = startAng + (i * Math.PI) / n;
    out.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return out.join(" ");
}

export const SHAPES = [
  "triangle", "diamond", "pentagon", "hexagon",
  "circle", "square", "star", "cross",
];

/** Draw one named shape with transforms inside a 100x100 viewBox. */
export function drawShape(name, opts = {}) {
  const {
    cx = 50, cy = 50, r = 28,
    rotate = 0, scale = 1,
    fill = "none", stroke = COLORS.stroke, sw = 2,
  } = opts;
  const rr = r * scale;
  const base = {
    fill, stroke, "stroke-width": sw,
    "stroke-linejoin": "round", "stroke-linecap": "round",
  };
  const wrap = (el) =>
    rotate ? svgEl("g", { transform: `rotate(${rotate} ${cx} ${cy})` }, el) : el;

  switch (name) {
    case "triangle":
      return wrap(svgEl("polygon", { ...base, points: polyPoints(3, cx, cy + rr * 0.08, rr, -Math.PI / 2) }));
    case "square":
      return wrap(svgEl("rect", { ...base, x: cx - rr, y: cy - rr, width: rr * 2, height: rr * 2 }));
    case "diamond":
      return wrap(svgEl("polygon", { ...base, points: polyPoints(4, cx, cy, rr, -Math.PI / 2) }));
    case "pentagon":
      return wrap(svgEl("polygon", { ...base, points: polyPoints(5, cx, cy + rr * 0.04, rr, -Math.PI / 2) }));
    case "hexagon":
      return wrap(svgEl("polygon", { ...base, points: polyPoints(6, cx, cy, rr, 0) }));
    case "circle":
      return svgEl("circle", { ...base, cx, cy, r: rr });
    case "star":
      return wrap(svgEl("polygon", { ...base, points: starPoints(5, cx, cy + rr * 0.04, rr, rr * 0.45, -Math.PI / 2) }));
    case "cross":
      return wrap(svgEl("path", {
        ...base, "stroke-width": sw * 1.6,
        d: `M${cx - rr},${cy} L${cx + rr},${cy} M${cx},${cy - rr} L${cx},${cy + rr}`,
      }));
    case "line":
      return wrap(svgEl("line", {
        ...base, "stroke-width": sw * 1.6,
        x1: cx - rr, y1: cy, x2: cx + rr, y2: cy,
      }));
    case "arc":
      return wrap(svgEl("path", {
        ...base, "stroke-width": sw * 1.4,
        d: `M${cx - rr},${cy} A${rr},${rr} 0 0 1 ${cx + rr},${cy}`,
      }));
    case "dot":
      return svgEl("circle", { cx, cy, r: rr * 0.35, fill: stroke, stroke: "none" });
  }
  return "";
}

/** Apply transforms (rotate, scale, fill) inside a group */
export function group(inner, { rotate = 0, cx = 50, cy = 50, scale = 1, translate = [0,0] } = {}) {
  const t = [];
  if (translate[0] || translate[1]) t.push(`translate(${translate[0]} ${translate[1]})`);
  if (rotate) t.push(`rotate(${rotate} ${cx} ${cy})`);
  if (scale !== 1) t.push(`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`);
  return svgEl("g", { transform: t.join(" ") || false }, inner);
}

/* ---------- specifics for certain question types ---------- */

/** Dot grid (for draw-sequence problems). Returns interactive-ready dots. */
export function dotGrid(cols, rows, { cellSize = 20, dotR = 2.2, filled = [] } = {}) {
  let out = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cellSize + cellSize / 2;
      const cy = r * cellSize + cellSize / 2;
      const isFilled = filled.some(([fc, fr]) => fc === c && fr === r);
      out += svgEl("circle", {
        cx, cy,
        r: isFilled ? dotR * 1.6 : dotR,
        fill: isFilled ? COLORS.accent : COLORS.strokeFaint,
        "data-col": c,
        "data-row": r,
        class: `draw-dot${isFilled ? " draw-dot--on" : ""}`,
      });
    }
  }
  return out;
}

/** SVG symbol set for cube faces — small glyph palette (6 distinct shapes) */
export const CUBE_GLYPHS = {
  A: () => circle(50, 50, 24, { "stroke-width": 3 }),
  B: () => polygon(3, 50, 56, 30, 0, { "stroke-width": 3 }),
  C: () => rect(26, 26, 48, 48, { "stroke-width": 3 }),
  D: () => polygon(4, 50, 50, 30, 0, { "stroke-width": 3 }),
  E: () => star(5, 50, 52, 30, 12, 0, { "stroke-width": 3, stroke: COLORS.accent }),
  F: () => path("M28,50 L72,50 M50,28 L50,72", { "stroke-width": 4 }),
};
