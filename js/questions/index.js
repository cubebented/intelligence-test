/* ═══════════════════════════════════════════════════════════════════
   Question registry — now a single unified "problem" engine.

   Previous iterations had 20 specialised question types (matrix,
   memory-path, anagram, …) which made the test feel repetitive and
   guessable ("same template, one number different"). That has been
   replaced by problems.js, which picks from a large age-tagged pool of
   classic IQ-style items spanning arithmetic, sequences, verbal
   analogies, trick questions, deductive logic, time/age puzzles, and
   coding patterns. Dedup is session-wide so no item repeats in a run,
   and items are filtered by the player's age at generate-time.

   The 20 entries below are effectively 20 "slots" — the runner calls
   each slot's generate(rng) once, and the engine returns a different
   item each call (guaranteed no dupes). All slots share the same
   60-second timer.
   ═══════════════════════════════════════════════════════════════════ */

/* Propagate cache-bust version from our URL through to each question module */
const _v = new URL(import.meta.url).searchParams.get("v") || "";
const _q = _v ? `?v=${_v}` : "";

const problem = await import("./problem.js" + _q);

const T = 60;        /* 60-second timer on every question */
const SLOTS = 20;    /* test length */

export const TYPES = Array.from({ length: SLOTS }, (_, i) => ({
  id:        `problem-${String(i + 1).padStart(2, "0")}`,
  label:     "Problem",
  timeLimit: T,
  generate:  problem.generate,
}));

export const BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));
