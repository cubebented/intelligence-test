/* ═══════════════════════════════════════════════════════════════════════
   Unified "problem" engine — every question is generated from a TEMPLATE.

   Anti-cheat design: the POOL is a list of templates, not static items.
   Each template has a build(rng) function that produces a fresh {q, a, d}
   from seeded random parameters: different numbers, different names,
   different scenarios every run — same CONCEPT, different instance.

   Same test-seed → same variants (reproducible, shareable).
   Different seed → fully different specifics (no memorisation / cheating).

   Template shape:
     { id, family, minAge, maxAge, build(rng) → { q, a, d[3] } }

   Runtime:
     1. Filter templates by age window.
     2. Prefer under-represented families so the run stays varied.
     3. Pick a template, dedup by template-id (not item).
     4. Call template.build(rng) to materialise the concrete question.
     5. Shuffle the 4 options.
   ═══════════════════════════════════════════════════════════════════════ */

const CATEGORY = {
  arithmetic:  "Arithmetic",
  wordproblem: "Word Problem",
  sequence:    "Number Sequence",
  letterseq:   "Letter Sequence",
  analogy:     "Analogy",
  trick:       "Trick Question",
  deduction:   "Deduction",
  oddone:      "Odd One Out",
  timeage:     "Time & Age",
  pattern:     "Pattern Code",
};

/* ─── Shared content pools (for analogies, trick questions, etc.) ────── */

/* First names that feel modern and neutral. Used as the "character" in
   trick/logic questions. Fisher-Yates shuffled per-question via rng. */
const NAMES = [
  "Mia", "Leo", "Ivy", "Max", "Theo", "Ruby", "Zara", "Evan",
  "Nora", "Finn", "Lila", "Owen", "Ada", "Kai", "Sage", "Ezra",
  "June", "Nico", "Iris", "Reid",
];

/* Analogy relation-pairs grouped by relation type. Used by the analogy
   template: pick a relation, pick two (a,b) pairs, ask "a:b::c:?" with
   d as the correct answer, and draw distractors from OTHER relations. */
const ANALOGY_RELATIONS = [
  { name: "worker-product", pairs: [
    ["baker", "bread"], ["author", "book"], ["sculptor", "statue"],
    ["composer", "symphony"], ["architect", "building"], ["farmer", "crop"],
  ]},
  { name: "tool-user", pairs: [
    ["brush", "painter"], ["hammer", "carpenter"], ["scalpel", "surgeon"],
    ["camera", "photographer"], ["baton", "conductor"], ["chisel", "sculptor"],
  ]},
  { name: "container-contents", pairs: [
    ["wallet", "money"], ["library", "books"], ["gallery", "paintings"],
    ["vault", "gold"], ["nest", "eggs"], ["bottle", "water"],
  ]},
  { name: "animal-home", pairs: [
    ["bee", "hive"], ["bird", "nest"], ["bear", "den"],
    ["spider", "web"], ["fish", "water"], ["fox", "burrow"],
  ]},
  { name: "part-whole", pairs: [
    ["petal", "flower"], ["wheel", "car"], ["finger", "hand"],
    ["leaf", "tree"], ["page", "book"], ["key", "keyboard"],
  ]},
  { name: "cause-effect", pairs: [
    ["drought", "famine"], ["rain", "flood"], ["fire", "smoke"],
    ["virus", "illness"], ["spark", "fire"], ["frost", "ice"],
  ]},
  { name: "measure-instrument", pairs: [
    ["temperature", "thermometer"], ["pressure", "barometer"],
    ["speed", "speedometer"], ["weight", "scale"],
    ["time", "clock"], ["wind", "anemometer"],
  ]},
  { name: "young-of", pairs: [
    ["dog", "puppy"], ["cat", "kitten"], ["cow", "calf"],
    ["horse", "foal"], ["sheep", "lamb"], ["frog", "tadpole"],
  ]},
  { name: "action-result", pairs: [
    ["study", "knowledge"], ["exercise", "fitness"], ["practice", "skill"],
    ["save", "wealth"], ["plant", "harvest"], ["read", "learning"],
  ]},
  { name: "opposite", pairs: [
    ["hot", "cold"], ["tall", "short"], ["loud", "quiet"],
    ["wet", "dry"], ["full", "empty"], ["early", "late"],
  ]},
];

/* Odd-one-out category sets. Each set is 4 items — 3 in-category,
   1 outlier. The `odd` field is the outlier. */
const ODD_SETS = [
  { items: ["apple", "pear", "grape", "carrot"],          odd: "carrot" },
  { items: ["circle", "square", "triangle", "cube"],      odd: "cube" },
  { items: ["eagle", "sparrow", "parrot", "bat"],         odd: "bat" },
  { items: ["oak", "maple", "pine", "rose"],              odd: "rose" },
  { items: ["piano", "guitar", "violin", "drum"],         odd: "drum" },
  { items: ["Mercury", "Venus", "Mars", "Moon"],          odd: "Moon" },
  { items: ["hammer", "saw", "wrench", "nail"],           odd: "nail" },
  { items: ["football", "tennis", "chess", "basketball"], odd: "chess" },
  { items: ["whale", "shark", "dolphin", "tuna"],         odd: "tuna" },
  { items: ["lion", "tiger", "horse", "leopard"],         odd: "horse" },
  { items: ["carrot", "potato", "onion", "apple"],        odd: "apple" },
  { items: ["red", "blue", "green", "loud"],              odd: "loud" },
];

/* ─── Small helpers ──────────────────────────────────────────────────── */

function cap(s) { return String(s)[0].toUpperCase() + String(s).slice(1); }

/* Remove duplicates from an array of strings (preserve order) */
function unique(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = String(x);
    if (!seen.has(k)) { seen.add(k); out.push(x); }
  }
  return out;
}

/* Ensure a distractor set has exactly 3 distinct non-correct values.
   Dedupes, filters the correct answer, and pads with safe fallbacks if
   a template happens to produce a collision. Padding is format-aware:
   numeric answers get numeric perturbations, strings get minor variations. */
function distractors3(rng, correct, candidates) {
  const correctKey = String(correct);
  let d = unique(candidates.filter(x => String(x) !== correctKey));

  /* Numeric-answer fallback: synthesise ±k perturbations of the answer */
  if (d.length < 3 && typeof correct === "number") {
    const deltas = rng.shuffle([1, -1, 2, -2, 3, -3, 5, -5]);
    for (const k of deltas) {
      if (d.length >= 3) break;
      const v = correct + k;
      if (v >= 0 && String(v) !== correctKey && !d.some(x => String(x) === String(v))) {
        d.push(v);
      }
    }
  }

  /* String-answer fallback: perturb existing distractors by adding " (A)" etc.
     This only fires in pathological cases — templates should provide 3+ good
     distractors themselves. The em-dash pad keeps layout sane if all else
     fails (visibly "missing" rather than broken). */
  while (d.length < 3) d.push("—");

  return rng.shuffle(d).slice(0, 3);
}

/* Short letter-index helpers for cipher templates */
function letterOf(n) {  // 0-25 → A-Z, wraps
  return String.fromCharCode(65 + ((n % 26) + 26) % 26);
}
function indexOf(ch) { return ch.toUpperCase().charCodeAt(0) - 65; }

/* Pick N distinct integers in [lo, hi) */
function distinctInts(rng, count, lo, hi) {
  const pool = [];
  for (let i = lo; i < hi; i++) pool.push(i);
  return rng.sample(pool, count);
}

/* Format an integer with currency or plain */
const money = (n) => `$${n}`;
const cents = (n) => n >= 100 ? `$${(n/100).toFixed(2)}` : `${n}¢`;

/* ════════════════════════════════════════════════════════════════════════
   THE TEMPLATES — each generates a fresh question per rng.
   ════════════════════════════════════════════════════════════════════════ */
const POOL = [

  /* ══════════════ ARITHMETIC ══════════════ */

  /* "A number plus <fraction> of itself = N. Find the number." */
  { id: "ar-plus-frac", family: "arithmetic", minAge: 10, maxAge: 99,
    build(rng) {
      const options = [
        { text: "half of itself",             num: 1, den: 2, mult: 2 },
        { text: "a quarter of itself",        num: 1, den: 4, mult: 4 },
        { text: "a third of itself",          num: 1, den: 3, mult: 3 },
        { text: "three-quarters of itself",   num: 3, den: 4, mult: 4 },
        { text: "two-thirds of itself",       num: 2, den: 3, mult: 3 },
      ];
      const p = rng.pick(options);
      const base = rng.int(2, 11) * p.mult;                   // answer
      const total = base + (base * p.num) / p.den;            // result (integer)
      return {
        q: `A number plus ${p.text} equals ${total}. What is the number?`,
        a: base,
        d: [
          (base * p.num) / p.den,       // took the fraction of the answer (wrong)
          total - base,                 // returned the remainder instead
          total / 2 | 0,                // halved the total (default-guess)
        ],
      };
    }},

  /* "Double (or triple) a number, add K, get N. Find it." */
  { id: "ar-mult-add", family: "arithmetic", minAge: 10, maxAge: 99,
    build(rng) {
      const mult   = rng.pick([2, 3]);
      const base   = rng.int(3, 25);
      const add    = rng.int(3, 15);
      const result = mult * base + add;
      const verb   = mult === 2 ? "Double" : "Triple";
      return {
        q: `${verb} a number, then add ${add}. The result is ${result}. What was the number?`,
        a: base,
        d: [
          (result - add) * mult,        // multiplied result instead of base
          result - add * mult,          // double-subtracted
          result / mult | 0,            // forgot the add
        ],
      };
    }},

  /* "Multiply by A; result is K more than B× original. Find number." */
  { id: "ar-mult-equal", family: "arithmetic", minAge: 13, maxAge: 99,
    build(rng) {
      const b = rng.int(2, 5);
      const a = b + rng.int(2, 5);        // a > b
      const ans = rng.int(2, 8);
      const k = (a - b) * ans;
      return {
        q: `If you multiply a number by ${a}, the result is ${k} more than ${b} times the number. What is the number?`,
        a: ans,
        d: [ans + 1, ans - 1, k],
      };
    }},

  /* "Sum of 3 consecutive integers = S. Largest?" */
  { id: "ar-consecutive3", family: "arithmetic", minAge: 10, maxAge: 99,
    build(rng) {
      const middle = rng.int(8, 40);
      const sum    = 3 * middle;
      return {
        q: `The sum of three consecutive integers is ${sum}. What is the largest?`,
        a: middle + 1,
        d: [middle, middle - 1, middle + 2],
      };
    }},

  /* "Linear: Ax + B = Cx + D. Find x." */
  { id: "ar-linear-eq", family: "arithmetic", minAge: 13, maxAge: 99,
    build(rng) {
      const a = rng.int(3, 7);
      const c = rng.int(1, a);           // c < a so A > C
      const x = rng.int(2, 10);
      const b = rng.int(1, 10);
      const d = (a - c) * x + b;
      return {
        q: `If ${a}x + ${b} = ${c}x + ${d}, what is x?`,
        a: x,
        d: [x + 1, x - 1, b + d],
      };
    }},

  /* "K% of a number = N. Find the number." */
  { id: "ar-pct-of", family: "arithmetic", minAge: 13, maxAge: 99,
    build(rng) {
      const pcts = [20, 25, 40, 50, 60, 75, 80];
      const pct  = rng.pick(pcts);
      const ans  = rng.int(3, 15) * 20;    // ensures pct*ans/100 is integer for clean pcts
      const val  = (ans * pct) / 100;
      return {
        q: `If ${pct}% of a number is ${val}, what is the number?`,
        a: ans,
        d: [
          val * 2,                       // assumed 50%
          ans - val,                     // subtracted
          val + pct,                     // mix of operations
        ],
      };
    }},

  /* Square root of a random perfect square */
  { id: "ar-sqrt", family: "arithmetic", minAge: 13, maxAge: 99,
    build(rng) {
      const r = rng.int(6, 17);
      return {
        q: `What is the square root of ${r * r}?`,
        a: r,
        d: [r + 1, r - 1, r * 2],
      };
    }},

  /* Two numbers sum to S, differ by D. Larger? */
  { id: "ar-sum-diff", family: "arithmetic", minAge: 13, maxAge: 99,
    build(rng) {
      const larger  = rng.int(10, 35);
      const smaller = rng.int(3, larger - 2);
      const sum  = larger + smaller;
      const diff = larger - smaller;
      return {
        q: `Two numbers add to ${sum} and differ by ${diff}. What is the larger number?`,
        a: larger,
        d: [smaller, sum / 2 | 0, diff * 2],
      };
    }},

  /* Remove one from an average */
  { id: "ar-avg-remove", family: "arithmetic", minAge: 16, maxAge: 99,
    build(rng) {
      const count = rng.pick([5, 6, 7]);
      const oldAvg = rng.int(8, 20);
      const newAvg = oldAvg - rng.int(1, 4);
      const removed = count * oldAvg - (count - 1) * newAvg;
      return {
        q: `The average of ${count} numbers is ${oldAvg}. If one number is removed, the average of the remaining ${count-1} is ${newAvg}. What number was removed?`,
        a: removed,
        d: [oldAvg, newAvg, oldAvg * count - newAvg * count],
      };
    }},

  /* Pens vs notebooks — precomputed clean combos */
  { id: "ar-pens-notebooks", family: "arithmetic", minAge: 16, maxAge: 99,
    build(rng) {
      /* Known-clean (pen-price, nbk-price, pen-qty, nbk-qty) quadruples */
      const combos = [
        { p: 3, n: 5, pq: 5, nq: 3 },
        { p: 2, n: 5, pq: 5, nq: 2 },
        { p: 4, n: 6, pq: 3, nq: 2 },
        { p: 3, n: 6, pq: 4, nq: 2 },
        { p: 2, n: 4, pq: 6, nq: 3 },
        { p: 5, n: 7, pq: 7, nq: 5 },
      ];
      const c = rng.pick(combos);
      /* Distractors: notebook price, difference, pen+difference — filtered
         and deduped so we always land on 3 distinct non-answer values. */
      const cands = [c.n, c.n - c.p, c.p + 2, c.p + 1, c.n + 1, c.n - 1]
        .filter(v => v > 0 && v !== c.p);
      return {
        q: `${c.pq} pens cost the same as ${c.nq} notebooks. A notebook costs $${c.n - c.p} more than a pen. How much is one pen?`,
        a: money(c.p),
        d: [...new Set(cands)].slice(0, 3).map(money),
      };
    }},

  /* Square perimeter → side */
  { id: "ar-square-peri", family: "arithmetic", minAge: 10, maxAge: 99,
    build(rng) {
      const side = rng.int(5, 18);           // avoid side=4 which makes area == peri
      const peri = side * 4;
      /* Distractors: divided by 2 instead of 4 (most common mistake),
         divided by 3 (wrong denominator), and half-of-the-side (a literal
         reading mistake). All guaranteed distinct from `side`. */
      const cands = [peri / 2, Math.round(peri / 3), side * 2, Math.round(side / 2)]
        .filter(v => v !== side);
      return {
        q: `A square has a perimeter of ${peri} cm. What is the length of one side?`,
        a: `${side} cm`,
        d: [...new Set(cands)].slice(0, 3).map(v => `${v} cm`),
      };
    }},

  /* Spending from a budget */
  { id: "ar-spend-change", family: "arithmetic", minAge: 10, maxAge: 99,
    build(rng) {
      const budget = rng.pick([20, 25, 30, 40, 50]);
      const itemA  = rng.int(3, 10);
      const itemB  = rng.int(3, 10);
      const itemC  = rng.int(2, 8);
      const spent  = itemA + itemB + itemC;
      const left   = budget - spent;
      if (left <= 0) {      // safety — fall through to a fixed example
        return {
          q: `You have $20. You spend $7 on a book, $4 on a snack, and $3 on a sticker. How much do you have left?`,
          a: money(6), d: [money(14), money(11), money(7)],
        };
      }
      const items = rng.shuffle([
        { name: "a book",    amt: itemA },
        { name: "a snack",   amt: itemB },
        { name: "a sticker", amt: itemC },
      ]);
      /* Distractors: added-not-subtracted, forgot one item, total-spent */
      const pool = [spent, budget - itemA, budget - itemB, left + itemC,
                    budget + left, left * 2]
        .filter(v => v > 0 && v !== left);
      return {
        q: `You have $${budget}. You spend $${items[0].amt} on ${items[0].name}, $${items[1].amt} on ${items[1].name}, and $${items[2].amt} on ${items[2].name}. How much do you have left?`,
        a: money(left),
        d: [...new Set(pool)].slice(0, 3).map(money),
      };
    }},

  /* Rectangle 3× long as wide, area A → width */
  { id: "ar-rect-ratio", family: "arithmetic", minAge: 13, maxAge: 99,
    build(rng) {
      const ratio = rng.pick([2, 3, 4]);
      const wid   = rng.int(3, 8);
      const len   = wid * ratio;
      const area  = wid * len;
      return {
        q: `A rectangle is ${ratio} times as long as it is wide. Its area is ${area}. What is its width?`,
        a: wid,
        d: [len, ratio * wid + 1, wid + ratio],
      };
    }},

  /* "After +X% then −Y%, result is R. Original?" */
  { id: "ar-inc-dec", family: "arithmetic", minAge: 16, maxAge: 99,
    build(rng) {
      /* Pre-computed integer combos where result != orig.
         (25%+20% = identity net — exactly what we want to AVOID.) */
      const combos = [
        { inc: 25, dec: 10, orig: 40, result: 45 },
        { inc: 20, dec: 10, orig: 50, result: 54 },
        { inc: 50, dec: 20, orig: 50, result: 60 },
        { inc: 50, dec: 10, orig: 40, result: 54 },
        { inc: 20, dec: 25, orig: 100, result: 90 },
        { inc: 25, dec: 20, orig: 80, result: 80 },   // intentional check: result=orig
      ];
      const c = rng.pick(combos.filter(c => c.result !== c.orig));
      /* Distractors: the result (dropped through), orig ± 5/10 */
      const pool = [c.result, c.orig + 10, c.orig - 10, c.orig + 5, c.orig - 5]
        .filter(v => v > 0 && v !== c.orig);
      return {
        q: `After a ${c.inc}% increase followed by a ${c.dec}% decrease, a price is $${c.result}. What was the original price?`,
        a: money(c.orig),
        d: [...new Set(pool)].slice(0, 3).map(money),
      };
    }},

  /* ══════════════ WORD PROBLEMS ══════════════ */

  /* Snail climbing a well */
  { id: "wp-snail", family: "wordproblem", minAge: 10, maxAge: 99,
    build(rng) {
      const up    = rng.pick([3, 4, 5]);
      const down  = rng.pick([1, 2]);
      const well  = rng.pick([10, 12, 15, 18, 20, 24]);
      // net per day except last day
      const days  = Math.ceil((well - up) / (up - down)) + 1;
      const name  = rng.pick(["snail", "frog", "caterpillar", "beetle"]);
      const unit  = rng.pick(["metres", "feet"]);
      return {
        q: `A ${name} climbs ${up} ${unit} up a ${well}-${unit.slice(0,-1)} well each day, then slides back ${down} ${unit} at night. How many days until it reaches the top?`,
        a: days,
        d: [
          Math.ceil(well / (up - down)),     // ignored "last day doesn't slide"
          well - up,                          // raw subtraction
          days - 2,                           // off-by-two
        ],
      };
    }},

  /* Two trains converging */
  { id: "wp-trains", family: "wordproblem", minAge: 13, maxAge: 99,
    build(rng) {
      const v1 = rng.pick([40, 45, 50, 60, 70]);
      const v2 = rng.pick([30, 40, 50, 55, 80]);
      const hours = rng.int(2, 6);
      const dist = (v1 + v2) * hours;
      /* Distractors: off-by-one on either side, plus the halved-speed result */
      return {
        q: `Two trains ${dist} miles apart travel toward each other. One goes ${v1} mph, the other ${v2} mph. How long until they meet?`,
        a: `${hours} hours`,
        d: [`${hours - 1} hours`, `${hours + 1} hours`, `${hours * 2} hours`],
      };
    }},

  /* Workers finishing a job (inverse proportion) */
  { id: "wp-workers-days", family: "wordproblem", minAge: 13, maxAge: 99,
    build(rng) {
      const people  = rng.pick([3, 4, 5, 6]);
      const days    = rng.pick([6, 8, 12, 15, 18]);
      const persondays = people * days;
      let newPeople;
      do { newPeople = rng.int(2, 10); }
      while (newPeople === people || !Number.isInteger(persondays / newPeople));
      const newDays = persondays / newPeople;
      return {
        q: `${people} workers finish a job in ${days} days. How many days would ${newPeople} workers take (same rate each)?`,
        a: newDays,
        d: [
          days,                            // thought it was the same
          days + (newPeople - people),     // linear shift mistake
          persondays,                      // spat out the wrong total
        ],
      };
    }},

  /* Log cutting — pieces vs cuts */
  { id: "wp-log-cuts", family: "wordproblem", minAge: 13, maxAge: 99,
    build(rng) {
      const pieces1 = rng.pick([3, 4, 5, 6]);
      const totalMin = (pieces1 - 1) * rng.pick([5, 8, 10, 12]);
      const perCut = totalMin / (pieces1 - 1);
      const pieces2 = pieces1 + rng.pick([2, 3, 4]);
      const ans = perCut * (pieces2 - 1);
      /* Distractors:
         - multiplied by pieces2 instead of (pieces2-1)   [most common mistake]
         - scaled the raw total by ratio of piece counts  [linear-scaling mistake]
         - added extra per-cut time to the total           [off-by-one addition] */
      return {
        q: `It takes ${totalMin} minutes to cut a log into ${pieces1} equal pieces. How long to cut the same log into ${pieces2} equal pieces?`,
        a: `${ans} minutes`,
        d: [
          `${perCut * pieces2} minutes`,
          `${(totalMin * pieces2 / pieces1) | 0} minutes`,
          `${totalMin + perCut} minutes`,
        ],
      };
    }},

  /* Marbles ratio + addition */
  { id: "wp-marbles-ratio", family: "wordproblem", minAge: 16, maxAge: 99,
    build(rng) {
      // Ratio a:b, after +k of colour1 the ratio becomes 1:1 → k = (b-a)*x
      const a = rng.int(2, 4);
      const b = a + rng.int(2, 4);
      const x = rng.int(3, 8);
      const k = (b - a) * x;
      const original = (a + b) * x;
      const c1 = rng.pick(["red", "blue", "green"]);
      const c2 = rng.pick(["yellow", "purple", "orange"]);
      return {
        q: `A jar has ${c1} and ${c2} marbles in a ${a} : ${b} ratio. After adding ${k} more ${c1} marbles, the ratio becomes 1 : 1. How many marbles were in the jar originally?`,
        a: original,
        d: [k, a * x + b * x + k, (a + b) * (x + 1)],
      };
    }},

  /* Two candles, when first is 2× the second */
  { id: "wp-candles", family: "wordproblem", minAge: 16, maxAge: 99,
    build(rng) {
      /* Precomputed integer-answer combos: [Ta, Tb, t] */
      const combos = [[6, 4, 3], [8, 6, 4], [8, 4, 2]];
      const [Ta, Tb, t] = rng.pick(combos);
      /* Plausible wrong answers (all distinct from t): Tb-t, t*2, Ta-t, Tb+1 */
      const pool = [Tb - t, t * 2, Ta - t, Tb + 1, t + 1, Tb, Ta]
        .filter(v => v > 0 && v !== t);
      const picks = [...new Set(pool)].slice(0, 3);
      return {
        q: `Two candles are the same length. One burns out in ${Ta} hours, the other in ${Tb} hours. Both are lit at the same time. After how many hours is the first candle twice as long as the second?`,
        a: `${t} hours`,
        d: picks.map(v => `${v} hours`),
      };
    }},

  /* Two pipes filling a pool */
  { id: "wp-pool-pipes", family: "wordproblem", minAge: 16, maxAge: 99,
    build(rng) {
      const pairs = [[4, 6, 2.4], [3, 6, 2], [6, 12, 4], [2, 4, 4/3], [5, 10, 10/3]];
      const [A, B, t] = rng.pick(pairs);
      const ans = Number.isInteger(t) ? `${t} hours` : `${t.toFixed(1)} hours`;
      return {
        q: `One pipe fills a pool in ${A} hours. Another fills it in ${B} hours. If both run at once, how long to fill the pool?`,
        a: ans,
        d: [`${A + B} hours`, `${(A + B) / 2} hours`, `${A * B | 0} hours`],
      };
    }},

  /* Shirt after discount AND tax */
  { id: "wp-shirt-tax", family: "wordproblem", minAge: 16, maxAge: 99,
    build(rng) {
      /* Pre-computed (orig, disc, tax, paid) combos where all values are
         integers and the distractors don't collide with the answer. */
      const combos = [
        { orig: 50, disc: 20, tax: 10, paid: 44 },
        { orig: 60, disc: 25, tax: 10, paid: 50 },      // paid < orig, good
        { orig: 80, disc: 25, tax: 10, paid: 66 },
        { orig: 100, disc: 20, tax: 5,  paid: 84 },
        { orig: 40, disc: 10, tax: 5,  paid: 38 },
      ];
      const c = rng.pick(combos);
      /* Distractors: the paid price (they mistook it for the original),
         the "half-solved" amount (undo only the discount), and a plausible
         wrong amount at a round distance. */
      const undoDisc = Math.round(c.paid / (1 - c.disc / 100));
      const pool = [c.paid, undoDisc, c.orig + 10, c.orig - 10, c.orig + 20]
        .filter(v => v !== c.orig);
      return {
        q: `After a ${c.disc}% discount and a ${c.tax}% sales tax, a shirt costs $${c.paid}. What was its price before the discount?`,
        a: money(c.orig),
        d: [...new Set(pool)].slice(0, 3).map(money),
      };
    }},

  /* Round trip average speed */
  { id: "wp-avg-speed", family: "wordproblem", minAge: 16, maxAge: 99,
    build(rng) {
      const [v1, v2, ans] = rng.pick([
        [60, 40, 48],
        [40, 60, 48],
        [30, 60, 40],
        [20, 30, 24],
        [50, 30, 37.5],
      ]);
      return {
        q: `A car drives from A to B at ${v1} mph, and returns at ${v2} mph along the same road. What is the average speed over the round trip?`,
        a: `${ans} mph`,
        d: [`${(v1 + v2) / 2} mph`, `${v1 + v2} mph`, `${Math.min(v1, v2)} mph`],
      };
    }},

  /* Book pages, read fractions */
  { id: "wp-book-pages", family: "wordproblem", minAge: 13, maxAge: 99,
    build(rng) {
      const pages  = rng.pick([120, 180, 240, 300, 360]);
      const fracA  = rng.pick([[1, 3], [1, 4], [1, 2]]);
      const fracB  = rng.pick([[1, 4], [1, 3], [1, 2]]);
      const afterA = pages - (pages * fracA[0] / fracA[1]);
      const afterB = afterA - (afterA * fracB[0] / fracB[1]);
      const fA = `${fracA[0] === 1 ? "one" : fracA[0]} ${fracA[1] === 2 ? "half" : fracA[1] === 3 ? "third" : "quarter"}`;
      const fB = `${fracB[0] === 1 ? "one" : fracB[0]} ${fracB[1] === 2 ? "half" : fracB[1] === 3 ? "third" : "quarter"}`;
      return {
        q: `A book has ${pages} pages. You read ${fA} of it the first week, then ${fB} of what was left the second week. How many pages remain?`,
        a: Math.round(afterB),
        d: [Math.round(afterA), Math.round(pages * fracA[0] / fracA[1]), Math.round(pages - afterB)],
      };
    }},

  /* Money split in ratio a:b:c.
     Only use combos where the middle ratio ≠ parts/3 (else middle share
     collides with the "equal thirds" distractor), and smallest ≠ 1 (else
     the "one part" distractor collides with the smallest share). */
  { id: "wp-money-split", family: "wordproblem", minAge: 13, maxAge: 99,
    build(rng) {
      const combos = [
        { a: 2, b: 3, c: 5, total: 600 },    // shares 120/180/300
        { a: 2, b: 3, c: 4, total: 450 },    //        100/150/200
        { a: 2, b: 4, c: 5, total: 550 },    //        100/200/250
        { a: 3, b: 4, c: 5, total: 600 },    //        150/200/250
        { a: 2, b: 5, c: 3, total: 500 },    //        100/250/150
        { a: 3, b: 2, c: 5, total: 500 },    //        150/100/250
        { a: 4, b: 3, c: 2, total: 450 },    //        200/150/100
      ];
      const c = rng.pick(combos);
      const parts = c.a + c.b + c.c;
      const sorted = [c.a, c.b, c.c].sort((x, y) => y - x);
      const largest = (c.total * sorted[0]) / parts;
      const middle  = (c.total * sorted[1]) / parts;
      const smallest = (c.total * sorted[2]) / parts;
      const onePart = c.total / parts;
      /* Distractors in priority order, deduped */
      const pool = [middle, smallest, onePart, Math.round(c.total / 3)]
        .filter(v => v !== largest);
      return {
        q: `$${c.total} is split among three people in the ratio ${c.a} : ${c.b} : ${c.c}. What is the largest share?`,
        a: money(largest),
        d: [...new Set(pool)].slice(0, 3).map(money),
      };
    }},

  /* Farmer fence max area */
  { id: "wp-fence-area", family: "wordproblem", minAge: 16, maxAge: 99,
    build(rng) {
      const peri = rng.pick([40, 60, 80, 100, 120, 160, 200]);
      const side = peri / 4;
      const area = side * side;
      return {
        q: `A farmer has ${peri} feet of fence to enclose a rectangular field. What is the largest area possible?`,
        a: `${area} sq ft`,
        d: [`${peri * 2} sq ft`, `${peri} sq ft`, `${(peri / 3) * (peri / 3) | 0} sq ft`],
      };
    }},

  /* Shopping with items at different prices */
  { id: "wp-shopping-mix", family: "wordproblem", minAge: 10, maxAge: 99,
    build(rng) {
      const aQty = rng.int(2, 5);
      const aPrice = rng.int(30, 80);
      const bQty = rng.int(2, 4);
      const bPrice = rng.int(40, 90);
      const bill = rng.pick([500, 1000]);
      const itemA = rng.pick(["apples", "pears", "oranges", "plums"]);
      const itemB = rng.pick(["muffins", "cookies", "bagels", "rolls"]);
      const totalCost = aQty * aPrice + bQty * bPrice;
      const change = bill - totalCost;
      if (change <= 0) {
        // Fall back to a safe instance
        return {
          q: `You buy 3 apples at 40 cents each and 2 oranges at 75 cents each. You pay with a $5 bill. How much change?`,
          a: "$2.30",
          d: ["$2.50", "$1.70", "$3.80"],
        };
      }
      return {
        q: `You buy ${aQty} ${itemA} at ${aPrice}¢ each and ${bQty} ${itemB} at ${bPrice}¢ each. You pay with a ${bill === 500 ? "$5" : "$10"} bill. How much change?`,
        a: cents(change),
        d: [cents(totalCost), cents(change + 50), cents(change - 50)].filter(Boolean),
      };
    }},

  /* Rope cut into pieces */
  { id: "wp-rope-cut", family: "wordproblem", minAge: 10, maxAge: 99,
    build(rng) {
      const pieceLen = rng.pick([3, 4, 5, 6]);
      const pieces   = rng.int(6, 13);
      const total    = pieceLen * pieces;
      return {
        q: `A rope is ${total} cm long. You cut it into equal pieces of ${pieceLen} cm each. How many pieces do you get?`,
        a: pieces,
        d: [pieces + 1, pieces - 1, total - pieces],
      };
    }},

  /* ══════════════ NUMBER SEQUENCES ══════════════ */

  /* Arithmetic progression — random start + diff */
  { id: "ns-arith", family: "sequence", minAge: 10, maxAge: 99,
    build(rng) {
      const start = rng.int(2, 15);
      const diff  = rng.pick([2, 3, 4, 5, 7]);
      const seq   = [0, 1, 2, 3, 4].map(i => start + i * diff);
      const next  = start + 5 * diff;
      return {
        q: `What comes next? ${seq.join(", ")}, __`,
        a: next,
        d: [next - 1, next + 1, seq[4] + diff - 1],
      };
    }},

  /* Geometric progression */
  { id: "ns-geom", family: "sequence", minAge: 10, maxAge: 99,
    build(rng) {
      const start = rng.pick([2, 3, 5, 7]);
      const r = rng.pick([2, 3]);
      const seq = [0, 1, 2, 3].map(i => start * Math.pow(r, i));
      const next = start * Math.pow(r, 4);
      return {
        q: `What comes next? ${seq.join(", ")}, __`,
        a: next,
        d: [seq[3] + seq[2], seq[3] * 2 - start, next - start],
      };
    }},

  /* Perfect squares starting at variable k */
  { id: "ns-squares", family: "sequence", minAge: 10, maxAge: 99,
    build(rng) {
      const start = rng.int(1, 4);
      const seq   = [0, 1, 2, 3, 4].map(i => (start + i) ** 2);
      const next  = (start + 5) ** 2;
      return {
        q: `What comes next? ${seq.join(", ")}, __`,
        a: next,
        d: [next - 1, next + 1, seq[4] + (2 * (start + 4) + 1) - 2],
      };
    }},

  /* Cubes — one term hidden */
  { id: "ns-cubes", family: "sequence", minAge: 13, maxAge: 99,
    build(rng) {
      const start = rng.int(1, 3);
      const cubes = [0, 1, 2, 3, 4].map(i => (start + i) ** 3);
      const hideIdx = rng.int(1, 4);
      const shown = cubes.map((v, i) => i === hideIdx ? "__" : v);
      return {
        q: `What is missing? ${shown.join(", ")}`,
        a: cubes[hideIdx],
        d: [cubes[hideIdx] - 1, cubes[hideIdx] + 1, (start + hideIdx) * 3 * 3],
      };
    }},

  /* Fibonacci-like with random start pair */
  { id: "ns-fib", family: "sequence", minAge: 13, maxAge: 99,
    build(rng) {
      const a = rng.int(2, 5);
      const b = rng.int(a, a + 3);
      const s = [a, b];
      for (let i = 2; i < 6; i++) s.push(s[i-1] + s[i-2]);
      const next = s[4] + s[5];
      return {
        q: `What comes next? ${s.join(", ")}, __`,
        a: next,
        d: [s[5] + s[3], s[5] + 1, s[5] * 2],
      };
    }},

  /* Triangular / n(n+1) */
  { id: "ns-triangular", family: "sequence", minAge: 13, maxAge: 99,
    build(rng) {
      const start = rng.int(1, 3);
      const seq = [0, 1, 2, 3, 4].map(i => (start + i) * (start + i + 1));
      const next = (start + 5) * (start + 6);
      return {
        q: `What comes next? ${seq.join(", ")}, __`,
        a: next,
        d: [seq[4] + 10, next - 2, next + 2],
      };
    }},

  /* Differences growing by +1 */
  { id: "ns-gaps-grow", family: "sequence", minAge: 13, maxAge: 99,
    build(rng) {
      const a0 = rng.int(1, 5);
      const d0 = rng.int(1, 4);
      const seq = [a0];
      for (let i = 1; i < 5; i++) seq.push(seq[i-1] + d0 + i - 1);
      const next = seq[4] + d0 + 4;
      return {
        q: `What comes next? ${seq.join(", ")}, __`,
        a: next,
        d: [next - 1, next + 1, seq[4] + d0 + 3],
      };
    }},

  /* Primes, one missing */
  { id: "ns-primes", family: "sequence", minAge: 13, maxAge: 99,
    build(rng) {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
      const start = rng.int(0, 4);
      const window = primes.slice(start, start + 6);
      const hideIdx = window.length - 1;
      const shown = window.slice(0, hideIdx).join(", ") + ", __";
      return {
        q: `What comes next? ${shown}`,
        a: window[hideIdx],
        d: [window[hideIdx] + 2, window[hideIdx] - 2, window[hideIdx] + 4],
      };
    }},

  /* a_{n+1} = 2·a_n + c */
  { id: "ns-double-plus", family: "sequence", minAge: 16, maxAge: 99,
    build(rng) {
      const c = rng.pick([1, 2, 3]);
      const a0 = rng.int(1, 4);
      const seq = [a0];
      for (let i = 1; i < 5; i++) seq.push(seq[i-1] * 2 + c);
      const next = seq[4] * 2 + c;
      return {
        q: `What comes next? ${seq.join(", ")}, __`,
        a: next,
        d: [next - c, seq[4] * 2, seq[4] + seq[3]],
      };
    }},

  /* Factorials, one missing */
  { id: "ns-factorial", family: "sequence", minAge: 16, maxAge: 99,
    build(rng) {
      const facts = [1, 2, 6, 24, 120, 720, 5040];
      const hideIdx = rng.int(3, 6);
      const shown = facts.slice(0, hideIdx + 1).map((v, i) => i === hideIdx ? "__" : v);
      return {
        q: `What comes next? ${shown.slice(0, hideIdx).join(", ")}, __`,
        a: facts[hideIdx],
        d: [facts[hideIdx] - facts[hideIdx - 1], facts[hideIdx] + 100, facts[hideIdx - 1] * 2],
      };
    }},

  /* n³ + n */
  { id: "ns-cube-plus-n", family: "sequence", minAge: 16, maxAge: 99,
    build(rng) {
      const start = rng.int(1, 3);
      const seq = [0, 1, 2, 3, 4].map(i => {
        const n = start + i;
        return n ** 3 + n;
      });
      const next = (start + 5) ** 3 + (start + 5);
      return {
        q: `What comes next? ${seq.join(", ")}, __`,
        a: next,
        d: [next - 5, seq[4] * 2, next + 5],
      };
    }},

  /* ══════════════ LETTER SEQUENCES ══════════════ */

  /* Skip-by-N letters */
  { id: "ls-skip", family: "letterseq", minAge: 13, maxAge: 99,
    build(rng) {
      const startIdx = rng.int(0, 6);
      const step     = rng.pick([2, 3, 4]);
      const letters  = [0, 1, 2, 3, 4].map(i => letterOf(startIdx + i * step));
      const next     = letterOf(startIdx + 5 * step);
      return {
        q: `What comes next? ${letters.join(", ")}, __`,
        a: next,
        d: [letterOf(startIdx + 5 * step - 1), letterOf(startIdx + 5 * step + 1), letterOf(startIdx + 4 * step)],
      };
    }},

  /* Gap sequences (B, D, G, K, P: gaps 2,3,4,5) */
  { id: "ls-growing-gap", family: "letterseq", minAge: 13, maxAge: 99,
    build(rng) {
      const startIdx = rng.int(0, 5);
      const startGap = rng.pick([2, 1]);
      const letters = [letterOf(startIdx)];
      let cur = startIdx;
      for (let i = 0; i < 4; i++) {
        cur += startGap + i;
        letters.push(letterOf(cur));
      }
      const nextIdx = cur + startGap + 4;
      const next = letterOf(nextIdx);
      /* Distractors: off-by-one on either side, and "gap stayed constant" */
      return {
        q: `What comes next? ${letters.join(", ")}, __`,
        a: next,
        d: [letterOf(nextIdx - 1), letterOf(nextIdx + 1), letterOf(nextIdx - 2)],
      };
    }},

  /* Paired letters moving inward (AZ, BY, CX, …) */
  { id: "ls-pair-mirror", family: "letterseq", minAge: 13, maxAge: 99,
    build(rng) {
      const start = rng.int(0, 3);
      const pairs = [0, 1, 2, 3].map(i =>
        letterOf(start + i) + letterOf(25 - start - i)
      );
      const next = letterOf(start + 4) + letterOf(25 - start - 4);
      return {
        q: `What comes next? ${pairs.join(", ")}, __`,
        a: next,
        d: [
          letterOf(start + 4) + letterOf(25 - start - 3),
          letterOf(start + 3) + letterOf(25 - start - 4),
          letterOf(start + 5) + letterOf(25 - start - 5),
        ],
      };
    }},

  /* Day-of-week progression with variable step */
  { id: "ls-days", family: "letterseq", minAge: 10, maxAge: 99,
    build(rng) {
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const start = rng.int(0, 7);
      const step = rng.pick([2, 3]);
      const shown = [0, 1, 2].map(i => days[(start + i * step) % 7]);
      const next = days[(start + 3 * step) % 7];
      return {
        q: `Which day continues the pattern? ${shown.join(", ")}, __`,
        a: next,
        d: [days[(start + 3 * step + 1) % 7], days[(start + 3 * step - 1) % 7], days[(start + 3 * step + step) % 7]],
      };
    }},

  /* ══════════════ ANALOGIES ══════════════ */

  /* Generic analogy — pick a relation and two pairs from it */
  { id: "an-general", family: "analogy", minAge: 10, maxAge: 99,
    build(rng) {
      const rel = rng.pick(ANALOGY_RELATIONS);
      const [[a, b], [c, d]] = rng.sample(rel.pairs, 2);
      // Distractor pool: b-side words from OTHER relations
      const other = ANALOGY_RELATIONS
        .filter(r => r.name !== rel.name)
        .flatMap(r => r.pairs.map(p => p[1]));
      return {
        q: `${cap(a)} is to ${b} as ${cap(c)} is to __?`,
        a: d,
        d: rng.sample(other.filter(x => x !== d && x !== b), 3),
      };
    }},

  /* ══════════════ TRICK QUESTIONS ══════════════ */

  /* The daughters/names trick */
  { id: "tr-daughters", family: "trick", minAge: 10, maxAge: 99,
    build(rng) {
      const hero = rng.pick(NAMES);
      const series = rng.pick([
        { first: "April",   second: "May",      cont: ["June", "July", "March"] },
        { first: "January", second: "February", cont: ["March", "June", "December"] },
        { first: "Monday",  second: "Tuesday",  cont: ["Wednesday", "Thursday", "Sunday"] },
        { first: "Red",     second: "Blue",     cont: ["Green", "Yellow", "Purple"] },
        { first: "North",   second: "East",     cont: ["South", "West", "Centre"] },
        { first: "One",     second: "Two",      cont: ["Three", "Four", "Five"] },
      ]);
      const rel = rng.pick(["mother", "father", "aunt", "uncle"]);
      return {
        q: `${hero}'s ${rel} has three children. The first is named ${series.first}, the second is ${series.second}. What is the name of the third child?`,
        a: hero,
        d: series.cont,
      };
    }},

  /* "Farmer had N animals, all but K ran away" */
  { id: "tr-all-but", family: "trick", minAge: 10, maxAge: 99,
    build(rng) {
      const animals = rng.pick([
        { count: 15, kind: "sheep" }, { count: 12, kind: "cows" },
        { count: 20, kind: "horses" }, { count: 17, kind: "goats" },
        { count: 14, kind: "chickens" }, { count: 18, kind: "ducks" },
      ]);
      const left = rng.int(3, animals.count - 3);
      const actor = rng.pick(["farmer", "shepherd", "rancher", "herdsman"]);
      return {
        q: `A ${actor} had ${animals.count} ${animals.kind}. All but ${left} ran away. How many are left?`,
        a: left,
        d: [animals.count - left, animals.count, left - 1],
      };
    }},

  /* Race: passing a placed runner */
  { id: "tr-race-pass", family: "trick", minAge: 10, maxAge: 99,
    build(rng) {
      const place = rng.pick([
        { n: 2, t: "2nd" }, { n: 3, t: "3rd" }, { n: 4, t: "4th" }, { n: 5, t: "5th" },
      ]);
      const ord = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      /* Pull 3 distinct placement strings that aren't the correct one */
      const pool = [1, 2, 3, 4, 5, 6]
        .filter(n => n !== place.n)
        .map(ord);
      return {
        q: `You are running a race. You pass the person in ${place.t} place. What place are you in now?`,
        a: place.t,
        d: rng.sample(pool, 3),
      };
    }},

  /* Pills every K minutes — classic off-by-one trap */
  { id: "tr-pills", family: "trick", minAge: 10, maxAge: 99,
    build(rng) {
      const pills = rng.int(3, 6);
      const interval = rng.pick([20, 30]);
      const totalMin = (pills - 1) * interval;
      const fmt = (min) => {
        if (min >= 60 && min % 60 === 0) return `${min/60} hour${min/60 === 1 ? "" : "s"}`;
        if (min > 60) {
          const h = Math.floor(min / 60), m = min % 60;
          return `${h} hour${h === 1 ? "" : "s"} ${m} min`;
        }
        return `${min} minutes`;
      };
      /* Three guaranteed-distinct distractors:
           • taking "every" literally (one dose per interval → pills × interval)
           • the interval itself (thinking one interval covers all)
           • one extra interval on top (off-by-one the wrong direction) */
      const distractorMins = [pills * interval, interval, totalMin + interval * 2]
        .filter(m => m !== totalMin);
      const dFmt = Array.from(new Set(distractorMins.map(fmt))).filter(x => x !== fmt(totalMin));
      while (dFmt.length < 3) dFmt.push(fmt(totalMin + dFmt.length * 15 + 15));
      return {
        q: `A doctor gives you ${pills} pills and tells you to take one every ${interval} minutes. How long until you finish them?`,
        a: fmt(totalMin),
        d: dFmt.slice(0, 3),
      };
    }},

  /* Ton of X vs ton of Y */
  { id: "tr-ton-vs-ton", family: "trick", minAge: 10, maxAge: 99,
    build(rng) {
      const pair = rng.pick([
        ["bricks", "feathers"], ["steel", "cotton"], ["lead", "paper"],
        ["iron", "wool"], ["gold", "cork"],
      ]);
      const [heavy, light] = pair;
      return {
        q: `Which weighs more — a ton of ${heavy} or a ton of ${light}?`,
        a: "They weigh the same",
        d: [`The ${heavy}`, `The ${light}`, "Cannot be determined"],
      };
    }},

  /* N daughters each has 1 brother */
  { id: "tr-daughters-brother", family: "trick", minAge: 13, maxAge: 99,
    build(rng) {
      const n = rng.int(3, 7);
      const surname = rng.pick(["Smith", "Patel", "Chen", "Lee", "Garcia", "Kim"]);
      const title = rng.pick(["Mr.", "Mrs.", "Dr."]);
      return {
        q: `${title} ${surname} has ${n} daughters. Each daughter has exactly one brother. How many children are there in the family?`,
        a: n + 1,
        d: [n, n * 2, n + n],
      };
    }},

  /* N matchsticks, remove K → how many do you HAVE */
  { id: "tr-matchsticks", family: "trick", minAge: 13, maxAge: 99,
    build(rng) {
      const total  = rng.int(8, 16);
      const take   = rng.int(2, total - 3);
      const object = rng.pick(["matchsticks", "pebbles", "coins", "pencils", "stickers"]);
      return {
        q: `You have ${total} ${object}. You take ${take} away. How many ${object} do you have?`,
        a: take,
        d: [total - take, total, take + 1],
      };
    }},

  /* Subtract K from N: how many times? */
  { id: "tr-subtract-once", family: "trick", minAge: 13, maxAge: 99,
    build(rng) {
      const k = rng.pick([5, 10, 20, 25]);
      const n = rng.pick([50, 80, 100, 200]);
      return {
        q: `How many times can you subtract ${k} from ${n}?`,
        a: "Once",
        d: [String(n / k | 0), String((n / k | 0) + 1), String(n - k)],
      };
    }},

  /* Plane crashes on border */
  { id: "tr-plane-border", family: "trick", minAge: 13, maxAge: 99,
    build(rng) {
      const [a, b] = rng.pick([
        ["US", "Canada"], ["France", "Germany"], ["India", "Nepal"],
        ["Brazil", "Argentina"], ["Kenya", "Tanzania"],
      ]);
      return {
        q: `A plane crashes exactly on the border of ${a} and ${b}. Where should the survivors be buried?`,
        a: "Survivors aren't buried",
        d: [a, b, "On the border"],
      };
    }},

  /* Rooster on a roof */
  { id: "tr-rooster-roof", family: "trick", minAge: 13, maxAge: 99,
    build(rng) {
      const d = rng.pick(["east", "west", "north", "south"]);
      return {
        q: `A rooster lays an egg on the peak of a roof facing ${d}. Which way does the egg roll?`,
        a: "Roosters don't lay eggs",
        d: ["Either way", "The steeper side", "Neither — it balances"],
      };
    }},

  /* Dark cabin one match */
  { id: "tr-one-match", family: "trick", minAge: 13, maxAge: 99,
    build(rng) {
      const items = rng.shuffle(["a candle", "an oil lamp", "a fireplace", "a lantern", "a torch", "a stove"]);
      const three = items.slice(0, 3);
      return {
        q: `You have only one match. You enter a dark cabin with ${three.join(", ")}. What do you light first?`,
        a: "The match",
        d: three.map(s => cap(s.replace(/^an? /, ""))),
      };
    }},

  /* Mountain before discovery */
  { id: "tr-mountain", family: "trick", minAge: 13, maxAge: 99,
    build(rng) {
      const others = rng.shuffle(["K2", "Mt. Kilimanjaro", "Mt. McKinley", "Mont Blanc", "Aconcagua"]);
      return {
        q: `Before Mt. Everest was discovered, what was the tallest mountain on Earth?`,
        a: "Mt. Everest",
        d: others.slice(0, 3),
      };
    }},

  /* House walls facing south → polar bear */
  { id: "tr-south-house", family: "trick", minAge: 13, maxAge: 99,
    build(rng) {
      const home = rng.pick(["house", "cabin", "hut", "lodge"]);
      const creature = rng.pick(["bear", "animal"]);
      return {
        q: `A person builds a rectangular ${home} where every wall faces south. A ${creature} walks by. What colour is the ${creature}?`,
        a: "White",
        d: ["Brown", "Black", "Grey"],
      };
    }},

  /* Birthdays */
  { id: "tr-birthdays", family: "trick", minAge: 13, maxAge: 99,
    build(rng) {
      return {
        q: `How many birthdays does the average person have?`,
        a: 1,
        d: [rng.pick([60, 70, 80]), rng.pick([100, 365]), rng.pick([50, 90])],
      };
    }},

  /* Three fish, two fathers two sons */
  { id: "tr-fish", family: "trick", minAge: 13, maxAge: 99,
    build(rng) {
      return {
        q: `Two fathers and two sons go fishing. Each one catches exactly one fish. They bring home three fish. How is this possible?`,
        a: "Grandfather, father, and son (3 people)",
        d: ["One fish escaped", "A fish counted twice", "They're lying"],
      };
    }},

  /* ══════════════ DEDUCTION ══════════════ */

  /* Transitive ranking (3 people) */
  { id: "dd-rank", family: "deduction", minAge: 10, maxAge: 99,
    build(rng) {
      const [p1, p2, p3] = rng.sample(NAMES, 3);
      const trait = rng.pick([
        { word: "taller", q: "shortest", pick: -1 },
        { word: "older",  q: "youngest", pick: -1 },
        { word: "faster", q: "slowest",  pick: -1 },
      ]);
      return {
        q: `${p1} is ${trait.word} than ${p2}. ${p2} is ${trait.word} than ${p3}. Who is the ${trait.q}?`,
        a: p3,
        d: [p1, p2, "Cannot be determined"],
      };
    }},

  /* Race order */
  { id: "dd-race-order", family: "deduction", minAge: 10, maxAge: 99,
    build(rng) {
      const [p1, p2, p3] = rng.sample(NAMES, 3);
      return {
        q: `In a race, ${p2} finished after ${p1} but before ${p3}. Who came last?`,
        a: p3,
        d: [p1, p2, "Cannot be determined"],
      };
    }},

  /* Affirming the consequent (classic fallacy) */
  { id: "dd-rain-wet", family: "deduction", minAge: 13, maxAge: 99,
    build(rng) {
      const set = rng.pick([
        { p: "it rains", q: "the grass gets wet" },
        { p: "the alarm rings", q: "she wakes up" },
        { p: "the engine is off", q: "the car is silent" },
        { p: "it is snowing", q: "the roof is white" },
      ]);
      return {
        q: `If ${set.p}, ${set.q}. ${cap(set.q)}. Which must be true?`,
        a: "None of these must be true.",
        d: [`${cap(set.p)}.`, `It is not true that ${set.p}.`, "Only sometimes."],
      };
    }},

  /* Modus tollens */
  { id: "dd-modus-tollens", family: "deduction", minAge: 13, maxAge: 99,
    build(rng) {
      const set = rng.pick([
        { p: "it rains", q: "I stay home", notq: "I did not stay home",     notp: "It did not rain." },
        { p: "she studies", q: "she passes", notq: "she did not pass",       notp: "She did not study." },
        { p: "the light is on", q: "the room is bright", notq: "the room is not bright", notp: "The light is not on." },
      ]);
      return {
        q: `If ${set.p}, ${set.q}. ${cap(set.notq)}. Which must be true?`,
        a: set.notp,
        d: [`${cap(set.p)}.`, `It is still unclear.`, `${cap(set.q)}.`],
      };
    }},

  /* Syllogism "all X are Y, Z is X" */
  { id: "dd-all-is", family: "deduction", minAge: 13, maxAge: 99,
    build(rng) {
      const madeUp = rng.pick([
        { noun: "xeps",  member: "Zorin", prop: "tall" },
        { noun: "glurks", member: "Pike", prop: "fast" },
        { noun: "zoons", member: "Luma", prop: "quiet" },
        { noun: "frebs", member: "Vex",  prop: "blue"  },
      ]);
      return {
        q: `All ${madeUp.noun} are ${madeUp.prop}. ${madeUp.member} is a ${madeUp.noun.slice(0, -1)}. Which must be true?`,
        a: `${madeUp.member} is ${madeUp.prop}.`,
        d: [
          `Not all ${madeUp.noun.slice(0, -1)}s are ${madeUp.prop}.`,
          `${madeUp.member} is a ${madeUp.noun.slice(0, -1)} but not ${madeUp.prop}.`,
          `Cannot be determined.`,
        ],
      };
    }},

  /* "Everyone in the club knows X. Person P doesn't know X" */
  { id: "dd-club-knows", family: "deduction", minAge: 13, maxAge: 99,
    build(rng) {
      const who   = rng.pick(NAMES);
      const you   = rng.pick(NAMES.filter(n => n !== who));
      const group = rng.pick(["book club", "hiking group", "chess club", "drama society", "debate team"]);
      return {
        q: `Everyone in the ${group} knows ${who}. ${you} does not know ${who}. Which must be true?`,
        a: `${you} is not in the ${group}.`,
        d: [
          `${you} is in the ${group}.`,
          `${who} knows ${you}.`,
          `Cannot be determined.`,
        ],
      };
    }},

  /* Chain conditionals A→B, B→C, A therefore C */
  { id: "dd-chain", family: "deduction", minAge: 13, maxAge: 99,
    build(rng) {
      const props = rng.shuffle(["A", "B", "C", "D", "E"]);
      const [x, y, z] = props;
      return {
        q: `If ${x} is true then ${y} is true. If ${y} is true then ${z} is true. ${x} is true. Which must also be true?`,
        a: `${z} is true.`,
        d: [`${z} may be false.`, `Only ${y} is true.`, `Cannot be determined.`],
      };
    }},

  /* ══════════════ ODD ONE OUT ══════════════ */

  /* Category-based odd-one-out from ODD_SETS */
  { id: "oo-category", family: "oddone", minAge: 10, maxAge: 99,
    build(rng) {
      const set = rng.pick(ODD_SETS);
      const items = rng.shuffle(set.items);
      return {
        q: `Which one does NOT belong? ${items.join(", ")}`,
        a: set.odd,
        d: items.filter(x => x !== set.odd),
      };
    }},

  /* Odd non-square in a list of squares */
  { id: "oo-non-square", family: "oddone", minAge: 13, maxAge: 99,
    build(rng) {
      const start  = rng.int(3, 8);
      const squares = [0, 1, 2, 3].map(i => (start + i) ** 2);
      const intruder = squares[3] + rng.pick([4, 6, 8, 11]);
      const list = rng.shuffle([...squares, intruder]);
      return {
        q: `Which does NOT belong? ${list.join(", ")}`,
        a: intruder,
        d: squares,
      };
    }},

  /* Odd composite in a list of primes */
  { id: "oo-non-prime", family: "oddone", minAge: 13, maxAge: 99,
    build(rng) {
      const primePool = [5, 7, 11, 13, 17, 19, 23, 29];
      const primes = rng.sample(primePool, 4);
      const composite = rng.pick([9, 15, 21, 25, 27, 35, 39]);
      const list = rng.shuffle([...primes, composite]);
      return {
        q: `Which does NOT belong? ${list.join(", ")}`,
        a: composite,
        d: primes,
      };
    }},

  /* ══════════════ TIME / AGE ══════════════ */

  /* Clock loses K min/hr */
  { id: "ta-slow-clock", family: "timeage", minAge: 13, maxAge: 99,
    build(rng) {
      const lossPerHour = rng.pick([10, 15, 20]);
      const hours       = rng.int(2, 5);
      const lossTotal   = lossPerHour * hours;
      // Clock shows (hours - lossTotal/60) hours after start
      const shownHours   = hours - lossTotal / 60;
      const shownHour    = 12 + shownHours;   // started at noon
      const shownH       = Math.floor(shownHour);
      const shownM       = Math.round((shownHour - shownH) * 60);
      const pad = (m) => String(m).padStart(2, "0");
      const fmt = (h, m) => `${((h - 1) % 12) + 1}:${pad(m)} pm`;
      const endActual = 12 + hours;
      return {
        q: `A clock loses ${lossPerHour} minutes every hour. If it is set correctly at noon, what time does it show at ${((endActual - 1) % 12) + 1}:00 pm (real time)?`,
        a: fmt(shownH, shownM),
        d: [fmt(endActual, 0), fmt(shownH - 1, shownM), fmt(shownH, shownM + 30)],
      };
    }},

  /* Clock angle at H:00 */
  { id: "ta-clock-angle", family: "timeage", minAge: 13, maxAge: 99,
    build(rng) {
      const hour = rng.int(1, 12);
      const raw  = Math.abs(hour * 30);
      const ang  = Math.min(raw, 360 - raw);
      /* Build distractors from the fixed set of plausible clock-hand angles
         and filter out the correct one — guarantees 3 distinct options. */
      const candidates = [0, 30, 60, 90, 120, 150, 180]
        .filter(a => a !== ang);
      return {
        q: `What is the angle between the hour and minute hands at exactly ${hour}:00?`,
        a: `${ang}°`,
        d: rng.sample(candidates, 3).map(x => `${x}°`),
      };
    }},

  /* Age algebra: in Y years twice as old as Y years ago */
  { id: "ta-age-symmetric", family: "timeage", minAge: 13, maxAge: 99,
    build(rng) {
      const y = rng.int(3, 8);
      // (n - y)*2 = n + y → n = 3y
      const n = 3 * y;
      return {
        q: `In ${y} years I will be twice as old as I was ${y} years ago. How old am I now?`,
        a: n,
        d: [2 * y, y * 4, n - y],
      };
    }},

  /* Day-of-week, N days later */
  { id: "ta-day-offset", family: "timeage", minAge: 13, maxAge: 99,
    build(rng) {
      const days  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const start = rng.int(0, 7);
      /* Pick an offset whose mod-7 isn't 0 — otherwise the answer is "today"
         and our distractor pool (days ≠ answer) collapses awkwardly. */
      let offs;
      do { offs = rng.pick([20, 45, 50, 75, 100, 133, 200, 365]); }
      while (offs % 7 === 0);
      const resultIdx = (start + offs) % 7;
      const result = days[resultIdx];
      /* Three distinct non-answer weekdays, picked randomly from the rest */
      const pool = days.filter((_, i) => i !== resultIdx);
      return {
        q: `If today is ${days[start]}, what day will it be ${offs} days from today?`,
        a: result,
        d: rng.sample(pool, 3),
      };
    }},

  /* Hour-hand degrees since midnight */
  { id: "ta-hour-degrees", family: "timeage", minAge: 13, maxAge: 99,
    build(rng) {
      const h = rng.int(1, 12);
      const deg = h * 30;
      const candidates = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
        .filter(a => a !== deg);
      return {
        q: `A clock reads ${h}:00. How many degrees has the hour hand moved since 12:00 (midnight)?`,
        a: `${deg}°`,
        d: rng.sample(candidates, 3).map(x => `${x}°`),
      };
    }},

  /* Boy twice sister's age → in Y years 1.5× */
  { id: "ta-age-relation", family: "timeage", minAge: 16, maxAge: 99,
    build(rng) {
      // Boy = 2s. In y years: 2s + y = k(s + y) → pick k = 1.5 for cleanest
      const y = rng.pick([4, 5, 6, 8, 10]);
      // 2s + y = 1.5(s+y) → 0.5s = 0.5y → s = y
      const sister = y;
      return {
        q: `A boy is currently twice his sister's age. In ${y} years, he will be 1.5 times her age. How old is the sister now?`,
        a: sister,
        d: [sister + 2, sister - 2, sister * 2],
      };
    }},

  /* Movie start → end time */
  { id: "ta-movie", family: "timeage", minAge: 13, maxAge: 99,
    build(rng) {
      const startH12 = rng.int(1, 10);
      const durH     = rng.int(1, 3);
      const durM     = rng.pick([0, 15, 20, 30, 45]);
      const startMin = rng.pick([0, 10, 15, 30, 45]);
      /* Treat start as PM by using 24h = startH12 + 12, then wrap */
      const total24Min = ((startH12 + 12) * 60 + startMin + durH * 60 + durM) % (24 * 60);
      const endH24 = Math.floor(total24Min / 60);
      const endM   = total24Min % 60;
      const pad    = (m) => String(m).padStart(2, "0");
      const ampm   = endH24 >= 12 ? "pm" : "am";
      const disp12 = ((endH24 + 11) % 12) + 1;
      /* Build 4 distinct distractor times by shifting minutes and the
         hour by small plausible amounts, then dedupe. */
      const tryTime = (dh, dm) => {
        const h = ((disp12 - 1 + dh + 11) % 12) + 1;
        const m = ((endM + dm) % 60 + 60) % 60;
        return `${h}:${pad(m)} ${ampm}`;
      };
      const correct = `${disp12}:${pad(endM)} ${ampm}`;
      const pool = [tryTime(0, 15), tryTime(1, 0), tryTime(0, -15),
                    tryTime(-1, 0), tryTime(0, 30)].filter(t => t !== correct);
      return {
        q: `A movie is ${durH} ${durH === 1 ? "hour" : "hours"} and ${durM} minutes long and starts at ${startH12}:${pad(startMin)} pm. What time does it end?`,
        a: correct,
        d: [...new Set(pool)].slice(0, 3),
      };
    }},

  /* ══════════════ PATTERN / CODE ══════════════ */

  /* Sum of letter positions in a word */
  { id: "pc-letter-sum", family: "pattern", minAge: 13, maxAge: 99,
    build(rng) {
      const words = ["MATH", "CODE", "LOVE", "TIME", "STAR", "WIND", "MIND",
                     "ZERO", "FIRE", "LIFE", "HOPE", "BOLD", "KIND", "JUMP"];
      const word  = rng.pick(words);
      const sum   = [...word].reduce((s, c) => s + indexOf(c) + 1, 0);
      return {
        q: `If A=1, B=2, … Z=26, what do the letters of the word "${word}" add up to?`,
        a: sum,
        d: [sum - 2, sum + 2, sum + word.length],
      };
    }},

  /* Caesar cipher decode (shift back by K) */
  { id: "pc-caesar", family: "pattern", minAge: 16, maxAge: 99,
    build(rng) {
      const words = ["ORANGE", "PURPLE", "YELLOW", "SILVER", "COPPER",
                     "MARBLE", "CASTLE", "MUSEUM", "PYTHON", "ROCKET"];
      const word  = rng.pick(words);
      const k     = rng.pick([2, 3, 4]);
      const enc   = [...word].map(c => letterOf(indexOf(c) + k)).join("");
      // Distractor candidates: other real words not matching the decoded answer
      const distWords = rng.sample(words.filter(w => w !== word), 3);
      return {
        q: `A word has been coded by shifting every letter forward ${k} places in the alphabet. The code is ${enc}. What was the original word?`,
        a: word,
        d: distWords,
      };
    }},

  /* Number code → word (1→A etc.) */
  { id: "pc-num-to-word", family: "pattern", minAge: 13, maxAge: 99,
    build(rng) {
      const words = ["HELLO", "WORLD", "TRUTH", "PIZZA", "SMART", "HAPPY", "QUICK"];
      const word  = rng.pick(words);
      const nums  = [...word].map(c => indexOf(c) + 1).join("-");
      const distWords = rng.sample(words.filter(w => w !== word), 3);
      return {
        q: `If 1→A, 2→B, 3→C, … what word is ${nums}?`,
        a: word,
        d: distWords,
      };
    }},

  /* Weekday-number mapping */
  { id: "pc-weekday-num", family: "pattern", minAge: 13, maxAge: 99,
    build(rng) {
      const codes = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
      const ask   = rng.int(1, 7);
      return {
        q: `If MON = 1, TUE = 2, WED = 3, …, what number does ${codes[ask]} map to?`,
        a: ask + 1,
        d: [ask, ask + 2, 8 - ask - 1],
      };
    }},

];

/* ─── Runtime state & helpers ─────────────────────────────────────────── */

/* Track which TEMPLATES have already been served this session so the same
   concept never repeats in a run. Module reloaded on page-load = fresh. */
const pickedThisSession = new Set();

function itemFitsAge(item, age) {
  const lo = item.minAge ?? 10;
  const hi = item.maxAge ?? 99;
  return age >= lo && age <= hi;
}

function familyUsageCount(ids) {
  const counts = {};
  for (const id of ids) {
    const it = POOL.find(p => p.id === id);
    if (!it) continue;
    counts[it.family] = (counts[it.family] || 0) + 1;
  }
  return counts;
}

/* ─── Public API ──────────────────────────────────────────────────────── */

export function generate(rng) {
  const age = Number(sessionStorage.getItem("iq_user_age")) || 14;

  /* Filter to age-appropriate unused templates */
  let candidates = POOL.filter(p =>
    itemFitsAge(p, age) && !pickedThisSession.has(p.id)
  );
  if (candidates.length === 0) candidates = POOL.filter(p => !pickedThisSession.has(p.id));
  if (candidates.length === 0) {
    pickedThisSession.clear();
    candidates = POOL.filter(p => itemFitsAge(p, age));
    if (candidates.length === 0) candidates = POOL.slice();
  }

  /* Prefer under-represented families */
  const familyCounts = familyUsageCount([...pickedThisSession]);
  const minCount = Math.min(...candidates.map(p => familyCounts[p.family] || 0));
  const leastUsed = candidates.filter(p => (familyCounts[p.family] || 0) === minCount);

  const template = rng.pick(leastUsed);
  pickedThisSession.add(template.id);

  /* Materialise a concrete instance from the template */
  const instance = template.build(rng);

  /* Normalise + sanitise the distractor set: unique, exactly 3, not equal to answer */
  const correct = instance.a;
  const dSet = distractors3(rng, correct, instance.d);

  const optionValues = rng.shuffle([correct, ...dSet].map(v => String(v)));
  const correctIndex = optionValues.indexOf(String(correct));

  let answer = null;

  return {
    type: "problem",
    category: CATEGORY[template.family] || "Problem",
    prompt: promptForFamily(template.family),

    render() {
      const opts = optionValues.map((val, i) => `
        <button type="button" class="option option--text reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          <span class="option__text">${escapeHtml(val)}</span>
        </button>
      `).join("");
      return `
        <div class="ps-wrap">
          <p class="ps-problem">${escapeHtml(instance.q)}</p>
          <div class="options options--4 options--text-grid">${opts}</div>
        </div>
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

    getAnswer:     () => answer,
    hasAnswer:     () => answer !== null,
    evaluate:      (a) => a === correctIndex,
    correctAnswer: () => correctIndex,
  };
}

/* Family-specific framing for the question prompt bar */
function promptForFamily(family) {
  switch (family) {
    case "arithmetic":  return "Work it out carefully.";
    case "wordproblem": return "Read the problem and work out the answer.";
    case "sequence":    return "Find the rule, then the next number.";
    case "letterseq":   return "Find the pattern, then what comes next.";
    case "analogy":     return "Find the same relationship.";
    case "trick":       return "Read every word before you answer.";
    case "deduction":   return "Work out what must logically follow.";
    case "oddone":      return "Which one does not fit with the others?";
    case "timeage":     return "Think carefully about the setup.";
    case "pattern":     return "Work out the rule, then apply it.";
    default:            return "Pick the correct answer.";
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Exposed for callers that want to know how many unique templates are
   available for a given age */
export function poolSizeForAge(age) {
  return POOL.filter(p => itemFitsAge(p, age)).length;
}
