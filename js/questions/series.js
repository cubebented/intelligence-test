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
