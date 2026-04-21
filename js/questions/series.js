/* Number / Letter Series — find next term.
   User TYPES the answer (anti-autoguess: no visible option list). */

const TEMPLATES = [
  /* Arithmetic: a, a+d, a+2d, ... */
  {
    build(rng) {
      const a = rng.int(1, 20);
      const d = rng.int(2, 11);
      const seq = [0, 1, 2, 3, 4].map(i => a + i * d);
      return { seq, next: a + 5 * d, rule: `+${d} each step` };
    },
  },
  /* Geometric: a, a*r, a*r², ... */
  {
    build(rng) {
      const a = rng.int(1, 6);
      const r = rng.pick([2, 3]);
      const seq = [0, 1, 2, 3].map(i => a * Math.pow(r, i));
      return { seq, next: a * Math.pow(r, 4), rule: `×${r} each step` };
    },
  },
  /* Alternating add/sub */
  {
    build(rng) {
      const a = rng.int(10, 40);
      const p = rng.int(3, 9);
      const q = rng.int(2, 8);
      const seq = [a, a + p, a + p - q, a + 2 * p - q, a + 2 * p - 2 * q];
      return { seq, next: a + 3 * p - 2 * q, rule: `+${p}, −${q} alternating` };
    },
  },
  /* Squares: 1, 4, 9, 16, ... (with optional offset) */
  {
    build(rng) {
      const c = rng.int(0, 6);
      const seq = [1, 2, 3, 4, 5].map(n => n * n + c);
      return { seq, next: 36 + c, rule: `n² + ${c}` };
    },
  },
  /* Triangular numbers n(n+1)/2 */
  {
    build(rng) {
      const c = rng.int(0, 4);
      const seq = [1, 2, 3, 4, 5].map(n => (n * (n + 1)) / 2 + c);
      return { seq, next: 21 + c, rule: `triangular + ${c}` };
    },
  },
  /* Fibonacci-like */
  {
    build(rng) {
      const a = rng.int(1, 5);
      const b = rng.int(1, 6);
      const seq = [a, b];
      for (let i = 0; i < 3; i++) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
      return { seq, next: seq[3] + seq[4], rule: "each = sum of previous two" };
    },
  },
  /* Second differences constant (cumulative) */
  {
    build(rng) {
      const start = rng.int(2, 8);
      const d2 = rng.int(2, 5);
      const seq = [start];
      let d = rng.int(1, 4);
      for (let i = 0; i < 4; i++) { seq.push(seq[i] + d); d += d2; }
      return { seq, next: seq[4] + (d), rule: `differences grow by ${d2}` };
    },
  },
  /* Interleaved (two sequences) */
  {
    build(rng) {
      const a = rng.int(2, 10), da = rng.int(2, 6);
      const b = rng.int(20, 40), db = rng.int(2, 6);
      const seq = [a, b, a + da, b + db, a + 2 * da];
      return { seq, next: b + 2 * db, rule: "two interleaved series" };
    },
  },
  /* Countdown arithmetic */
  {
    build(rng) {
      const a = rng.int(60, 150);
      const d = rng.int(3, 9);
      const seq = [0, 1, 2, 3, 4].map(i => a - i * d);
      return { seq, next: a - 5 * d, rule: `-${d} each step` };
    },
  },
  /* Multiplication by variable r */
  {
    build(rng) {
      const a = rng.int(1, 4);
      const r = rng.pick([2, 3, 4]);
      const seq = [0, 1, 2, 3].map(i => a * Math.pow(r, i));
      return { seq, next: a * Math.pow(r, 4), rule: `×${r} each step` };
    },
  },
  /* Cubes: 1, 8, 27, 64, 125 */
  {
    build(rng) {
      const c = rng.int(0, 3);
      const seq = [1, 2, 3, 4, 5].map(n => n * n * n + c);
      return { seq, next: 216 + c, rule: `n³ + ${c}` };
    },
  },
  /* Primes (first 8) */
  {
    build(rng) {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23];
      const start  = rng.int(0, 3);
      const seq    = primes.slice(start, start + 5);
      return { seq, next: primes[start + 5], rule: "prime numbers" };
    },
  },
  /* Running total of naturals: 1, 3, 6, 10, 15 (triangular again but framed) */
  {
    build(rng) {
      const seq = [1, 3, 6, 10, 15];
      return { seq, next: 21, rule: "sum of first n naturals" };
    },
  },
  /* x² − x (or x² + x) — quadratic-ish */
  {
    build(rng) {
      const sign = rng.bool() ? 1 : -1;
      const c    = rng.int(0, 3);
      const seq  = [1, 2, 3, 4, 5].map(n => n * n + sign * n + c);
      return { seq, next: 36 + sign * 6 + c, rule: `n² ${sign > 0 ? "+" : "-"} n ${c ? `+ ${c}` : ""}` };
    },
  },
  /* Doubling and adding */
  {
    build(rng) {
      const a = rng.int(1, 4);
      const add = rng.int(1, 4);
      const seq = [a];
      for (let i = 0; i < 4; i++) seq.push(seq[i] * 2 + add);
      return { seq, next: seq[4] * 2 + add, rule: `×2 + ${add}` };
    },
  },
  /* Square-then-halve irregular */
  {
    build(rng) {
      /* 2, 6, 12, 20, 30 → n(n+1) */
      const c = rng.int(0, 3);
      const seq = [1, 2, 3, 4, 5].map(n => n * (n + 1) + c);
      return { seq, next: 6 * 7 + c, rule: "n(n+1) + c" };
    },
  },
];

export function generate(rng) {
  const tpl = rng.pick(TEMPLATES);
  const { seq, next } = tpl.build(rng);
  let answer = null;

  return {
    type: "series",
    category: "Number Series",
    prompt: "What number comes next? Type your answer.",

    render() {
      const cells = seq.map(n =>
        `<div class="series__cell">${n}</div><span class="series__arrow">→</span>`).join("");
      return `
        <div class="series">${cells}<div class="series__cell series__cell--empty">?</div></div>
        <div class="series-input">
          <input type="number" inputmode="numeric" class="input input--number" id="series-input" placeholder="___" autocomplete="off" />
          <p class="eyebrow" style="text-align:center;margin-top:var(--s-2);">Press Enter to submit</p>
        </div>
        ${calculatorHtml()}
      `;
    },

    attach(root, onAnswer) {
      const inp = root.querySelector("#series-input");
      if (answer !== null && !Number.isNaN(answer)) inp.value = answer;
      inp.focus();
      const commit = () => {
        const v = inp.value.trim();
        if (v === "") { answer = null; onAnswer(null); return; }
        answer = Number(v);
        onAnswer(answer);
      };
      inp.addEventListener("input", commit);
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commit();
      });
      wireCalculator(root);
    },

    restore(root, { answer: savedAnswer } = {}) {
      const a = savedAnswer ?? answer;
      const inp = root.querySelector("#series-input");
      if (inp && a !== null && a !== undefined && !Number.isNaN(a)) {
        inp.value = a;
        inp.setAttribute("disabled", "");
      }
    },

    getAnswer: () => answer,
    hasAnswer: () => answer !== null && !Number.isNaN(answer),
    evaluate: (a) => Number(a) === next,
    correctAnswer: () => next,
  };
}

/* ─── Draggable calculator widget ─────────────────────────────────
   Rendered inline with the question; user can grab the header bar
   to move it anywhere on screen. Buttons drive a tiny expression
   evaluator — safely scoped to only digits + 4 operators + parens.  */

function calculatorHtml() {
  return `
    <div class="calc" id="calc">
      <div class="calc__bar" id="calc-bar">
        <span class="calc__label">CALCULATOR</span>
        <span class="calc__hint">drag to move</span>
      </div>
      <div class="calc__display" id="calc-display">0</div>
      <div class="calc__keys">
        <button type="button" class="calc__key calc__key--fn" data-k="C">C</button>
        <button type="button" class="calc__key calc__key--fn" data-k="←">←</button>
        <button type="button" class="calc__key calc__key--op" data-k="(">(</button>
        <button type="button" class="calc__key calc__key--op" data-k=")">)</button>
        <button type="button" class="calc__key" data-k="7">7</button>
        <button type="button" class="calc__key" data-k="8">8</button>
        <button type="button" class="calc__key" data-k="9">9</button>
        <button type="button" class="calc__key calc__key--op" data-k="/">÷</button>
        <button type="button" class="calc__key" data-k="4">4</button>
        <button type="button" class="calc__key" data-k="5">5</button>
        <button type="button" class="calc__key" data-k="6">6</button>
        <button type="button" class="calc__key calc__key--op" data-k="*">×</button>
        <button type="button" class="calc__key" data-k="1">1</button>
        <button type="button" class="calc__key" data-k="2">2</button>
        <button type="button" class="calc__key" data-k="3">3</button>
        <button type="button" class="calc__key calc__key--op" data-k="-">−</button>
        <button type="button" class="calc__key" data-k="0">0</button>
        <button type="button" class="calc__key" data-k=".">.</button>
        <button type="button" class="calc__key calc__key--eq" data-k="=">=</button>
        <button type="button" class="calc__key calc__key--op" data-k="+">+</button>
      </div>
    </div>
  `;
}

function wireCalculator(root) {
  const calc    = root.querySelector("#calc");
  const display = root.querySelector("#calc-display");
  const bar     = root.querySelector("#calc-bar");
  if (!calc || !display || !bar) return;

  /* Reparent the calculator to <body> before wiring events.
     Why: `.question` runs `animation: q-enter both`, which leaves a
     persistent `transform: translateY(0)` on it. Any non-`none` transform
     on an ancestor turns that ancestor into the containing block for
     `position: fixed` descendants, which means `getBoundingClientRect()`
     (viewport coords) and `style.left/top` (ancestor-local coords) no
     longer agree — producing the "teleport on first drag" bug.
     Living at <body> neutralises every such ancestor. */
  if (calc.parentNode !== document.body) {
    /* Remove any stale calculator left over from a prior series render */
    document.querySelectorAll("body > .calc").forEach(el => {
      if (el !== calc) el.remove();
    });
    document.body.appendChild(calc);
  }

  /* Expression editor — stores the literal string we show */
  let expr = "";

  const refresh = () => { display.textContent = expr || "0"; };

  const press = (k) => {
    if (k === "C") { expr = ""; refresh(); return; }
    if (k === "←") { expr = expr.slice(0, -1); refresh(); return; }
    if (k === "=") {
      try {
        /* Only allow digits, operators, decimal, parens, spaces.
           Anything else = reject. This is a deliberately tight sandbox. */
        if (!/^[0-9+\-*/().\s]*$/.test(expr)) { display.textContent = "ERROR"; return; }
        // eslint-disable-next-line no-new-func
        const val = Function(`"use strict"; return (${expr || 0});`)();
        if (!Number.isFinite(val)) { display.textContent = "ERROR"; return; }
        /* Round to 6 decimals, strip trailing zeroes */
        expr = (Math.round(val * 1e6) / 1e6).toString();
        refresh();
      } catch {
        display.textContent = "ERROR";
      }
      return;
    }
    expr += k;
    refresh();
  };

  calc.querySelectorAll(".calc__key").forEach(btn => {
    btn.addEventListener("click", () => press(btn.dataset.k));
  });

  /* Drag via the header bar. Pointer events so it works on trackpads
     and touch screens alike. */
  let dragging = false;
  let dx = 0, dy = 0;
  bar.addEventListener("pointerdown", (e) => {
    dragging = true;
    const rect = calc.getBoundingClientRect();
    dx = e.clientX - rect.left;
    dy = e.clientY - rect.top;
    calc.classList.add("calc--dragging");
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const x = e.clientX - dx;
    const y = e.clientY - dy;
    calc.style.left   = `${Math.max(8, Math.min(window.innerWidth  - calc.offsetWidth  - 8, x))}px`;
    calc.style.top    = `${Math.max(8, Math.min(window.innerHeight - calc.offsetHeight - 8, y))}px`;
    calc.style.right  = "auto";
    calc.style.bottom = "auto";
  });
  bar.addEventListener("pointerup", (e) => {
    dragging = false;
    calc.classList.remove("calc--dragging");
    bar.releasePointerCapture(e.pointerId);
  });
}
