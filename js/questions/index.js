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
  sentenceCompletion, synonym, antonym, problemSolving,
] = await Promise.all([
  import("./series.js"              + _q),
  import("./analogy.js"             + _q),
  import("./odd-one.js"             + _q),
  import("./sequence.js"            + _q),
  import("./cube-net.js"            + _q),
  import("./matrix.js"              + _q),
  import("./memory-grid.js"         + _q),
  import("./memory-sequence.js"     + _q),
  import("./memory-path.js"         + _q),
  import("./logic-puzzle.js"        + _q),
  import("./verbal-analogy.js"      + _q),
  import("./coding-decoding.js"     + _q),
  import("./deduction.js"           + _q),
  import("./relationship.js"        + _q),
  import("./number-sentence.js"     + _q),
  import("./anagram.js"             + _q),
  import("./sentence-completion.js" + _q),
  import("./synonym.js"             + _q),
  import("./antonym.js"             + _q),
  import("./problem-solving.js"     + _q),
]);

/* Unified 60-second timer across all questions.
   Makes the warning cadence (20s yellow → 10s orange → 5s red) consistent
   so the background-tint ramp means the same thing on every question. */
const T = 60;

export const TYPES = [
  //  id                   label                        timeLimit (s)   generator
  /* — Visual / spatial — */
  { id: "series",            label: "Number Series",    timeLimit: T,   generate: series.generate         },
  { id: "analogy",           label: "Figure Analogy",   timeLimit: T,   generate: analogy.generate        },
  { id: "matrix",            label: "Matrix Reasoning", timeLimit: T,   generate: matrix.generate         },
  { id: "odd-one",           label: "Odd One Out",      timeLimit: T,   generate: oddOne.generate         },
  { id: "sequence",          label: "Pattern Sequence", timeLimit: T,   generate: sequence.generate       },
  { id: "cube-net",          label: "Cube Net",         timeLimit: T,   generate: cubeNet.generate        },
  /* — Memory — */
  { id: "memory-grid",       label: "Memory Grid",      timeLimit: T,   generate: memoryGrid.generate     },
  { id: "memory-sequence",   label: "Memory Sequence",  timeLimit: T,   generate: memorySequence.generate },
  { id: "memory-path",       label: "Memory Path",      timeLimit: T,   generate: memoryPath.generate     },
  /* — Verbal / logic — */
  { id: "logic-puzzle",      label: "Logic Puzzle",     timeLimit: T,   generate: logicPuzzle.generate    },
  { id: "verbal-analogy",    label: "Verbal Analogy",   timeLimit: T,   generate: verbalAnalogy.generate  },
  { id: "coding-decoding",   label: "Coding & Decoding",timeLimit: T,   generate: coding.generate         },
  { id: "deduction",         label: "Deduction",        timeLimit: T,   generate: deduction.generate      },
  { id: "relationship",      label: "Relationships",    timeLimit: T,   generate: relationship.generate   },
  { id: "number-sentence",   label: "Word Problems",    timeLimit: T,   generate: numberSentence.generate },
  { id: "anagram",           label: "Anagram",          timeLimit: T,   generate: anagram.generate        },
  /* — New (ages 10+) verbal & problem-solving additions — */
  { id: "sentence-completion", label: "Fill the Blank", timeLimit: T,   generate: sentenceCompletion.generate },
  { id: "synonym",           label: "Synonyms",         timeLimit: T,   generate: synonym.generate        },
  { id: "antonym",           label: "Antonyms",         timeLimit: T,   generate: antonym.generate        },
  { id: "problem-solving",   label: "Problem Solving",  timeLimit: T,   generate: problemSolving.generate },
];

export const BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));
