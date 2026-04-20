/* ═══════════════════════════════════════════════════════════════════
   Question registry — single source of truth for the test lineup.

   HOW TO ADD A QUESTION TYPE:
     1. Create js/questions/yourtype.js with generate(), render(), etc.
     2. Add an entry to TYPES below (import is handled dynamically).

   HOW TO CONFIGURE A TIMER:
     timeLimit: seconds per question (number), or null for no limit.
     Change any value here — the test runner picks it up automatically.

   HOW TO REMOVE A TYPE:
     Delete (or comment out) its entry. Count adjusts automatically.
   ═══════════════════════════════════════════════════════════════════ */

/* Propagate cache-bust version from our URL through to each question module */
const _v = new URL(import.meta.url).searchParams.get("v") || "";
const _q = _v ? `?v=${_v}` : "";

const [
  series, analogy, oddOne, sequence, cubeNet,
  matrix, memoryGrid, memorySequence, memoryPath,
  logicPuzzle, verbalAnalogy,
  coding, deduction, relationship, numberSentence, anagram,
] = await Promise.all([
  import("./series.js"           + _q),
  import("./analogy.js"          + _q),
  import("./odd-one.js"          + _q),
  import("./sequence.js"         + _q),
  import("./cube-net.js"         + _q),
  import("./matrix.js"           + _q),
  import("./memory-grid.js"      + _q),
  import("./memory-sequence.js"  + _q),
  import("./memory-path.js"      + _q),
  import("./logic-puzzle.js"     + _q),
  import("./verbal-analogy.js"   + _q),
  import("./coding-decoding.js"  + _q),
  import("./deduction.js"        + _q),
  import("./relationship.js"     + _q),
  import("./number-sentence.js"  + _q),
  import("./anagram.js"          + _q),
]);

/* Timers are tight — short enough you can't Google an answer, long enough
   to reason it out if you see the pattern quickly. */
export const TYPES = [
  //  id                   label                        timeLimit (s)   generator
  /* — Visual / spatial — */
  { id: "series",            label: "Number Series",    timeLimit: 25,  generate: series.generate         },
  { id: "analogy",           label: "Figure Analogy",   timeLimit: 25,  generate: analogy.generate        },
  { id: "matrix",            label: "Matrix Reasoning", timeLimit: 30,  generate: matrix.generate         },
  { id: "odd-one",           label: "Odd One Out",      timeLimit: 18,  generate: oddOne.generate         },
  { id: "sequence",          label: "Pattern Sequence", timeLimit: 40,  generate: sequence.generate       },
  { id: "cube-net",          label: "Cube Net",         timeLimit: 28,  generate: cubeNet.generate        },
  /* — Memory — */
  { id: "memory-grid",       label: "Memory Grid",      timeLimit: 22,  generate: memoryGrid.generate     },
  { id: "memory-sequence",   label: "Memory Sequence",  timeLimit: 22,  generate: memorySequence.generate },
  { id: "memory-path",       label: "Memory Path",      timeLimit: 22,  generate: memoryPath.generate     },
  /* — Verbal / logic — */
  { id: "logic-puzzle",      label: "Logic Puzzle",     timeLimit: 38,  generate: logicPuzzle.generate    },
  { id: "verbal-analogy",    label: "Verbal Analogy",   timeLimit: 20,  generate: verbalAnalogy.generate  },
  { id: "coding-decoding",   label: "Coding & Decoding",timeLimit: 35,  generate: coding.generate         },
  { id: "deduction",         label: "Deduction",        timeLimit: 45,  generate: deduction.generate      },
  { id: "relationship",      label: "Relationships",    timeLimit: 25,  generate: relationship.generate   },
  { id: "number-sentence",   label: "Word Problems",    timeLimit: 45,  generate: numberSentence.generate },
  { id: "anagram",           label: "Anagram",          timeLimit: 25,  generate: anagram.generate        },
];

export const BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));
