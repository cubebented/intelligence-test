/* Memory Sequence — a reel of shapes flashes one at a time during study,
   then the user is asked which shape appeared in a specific position.
   Tests visual sequential working memory. */

import { svgRoot, drawShape, COLORS } from "../svg.js";

const SHAPES = ["triangle", "square", "diamond", "pentagon", "hexagon", "circle", "star", "cross"];
const SHAPE_CAP = 7;                // 7-item reel — at the edge of short-term span
const FLASH_MS  = 520;              // faster flashes; harder to rehearse
const GAP_MS    = 140;              // short gap between flashes
const HOLD_MS   = 400;              // hold after last flash before recall

function shapeSvg(name, { accent = false } = {}) {
  const stroke = accent ? COLORS.accent : COLORS.stroke;
  return svgRoot(drawShape(name, { stroke, sw: 2.4, r: 28 }), { vb: "0 0 100 100" });
}

export function generate(rng) {
  /* Sample N distinct shapes for the reel (distinct so "which was Nth" is unambiguous) */
  const reel = rng.sample(SHAPES, SHAPE_CAP);
  /* Ask about a random position in the middle-ish (harder than first/last) */
  const askIndex = rng.int(1, SHAPE_CAP - 2);    // 1..N-2 (0-indexed, skip first & last)
  const correctShape = reel[askIndex];
  /* Options: correct + 3 distractors from SHAPES not in reel, plus a couple from reel */
  const notInReel = SHAPES.filter(s => !reel.includes(s));
  const distractors = [
    ...rng.sample(notInReel, Math.min(2, notInReel.length)),
    ...rng.sample(reel.filter(s => s !== correctShape), 2),
  ];
  const options = rng.shuffle([correctShape, ...distractors].slice(0, 5));
  const correctIndex = options.indexOf(correctShape);

  let answer = null;
  let phase  = "study";      // "study" | "recall" | "done"
  let timers = [];

  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  return {
    type: "memory-sequence",
    category: "Memory Sequence",
    prompt: "Watch the sequence. You'll be asked which shape appeared in a specific position.",

    render() {
      /* Reel starts with position-numbered placeholder slots — visible frames
         so the user knows up-front how many items will flash. */
      const slots = reel.map((_, i) =>
        `<div class="mem-reel__slot" data-i="${i}">
           <span class="mem-reel__placeholder">${i + 1}</span>
         </div>`
      ).join("");

      const opts = options.map((sh, i) =>
        `<button type="button" class="option reveal" style="--i:${i}" data-idx="${i}">
          <span class="option__label">${String.fromCharCode(65 + i)}</span>
          ${shapeSvg(sh)}
        </button>`
      ).join("");

      return `
        <div class="mem-wrap">
          <div class="mem-phase mem-phase--study" id="mem-phase">
            <span class="mem-phase__label">WATCH</span>
            <span class="mem-phase__n" id="mem-phase-n">pos ${askIndex + 1} of ${SHAPE_CAP}</span>
          </div>
          <div class="mem-reel" id="mem-reel">${slots}</div>
          <p class="mem-question" id="mem-question" style="visibility:hidden">
            Which shape was in position <strong>${askIndex + 1}</strong>?
          </p>
          <div class="options options--5" id="mem-options" style="visibility:hidden;pointer-events:none;width:100%;">${opts}</div>
        </div>`;
    },

    attach(root, onAnswer) {
      const reelEl   = root.querySelector("#mem-reel");
      const phaseEl  = root.querySelector("#mem-phase");
      const qEl      = root.querySelector("#mem-question");
      const optsWrap = root.querySelector("#mem-options");

      const flashSlot = (i) => {
        const slot = reelEl.querySelector(`[data-i="${i}"]`);
        if (!slot) return;
        slot.innerHTML = shapeSvg(reel[i]);
        slot.classList.add("mem-reel__slot--on");
        timers.push(setTimeout(() => {
          slot.classList.remove("mem-reel__slot--on");
          /* Restore the position-number placeholder after the flash */
          slot.innerHTML = `<span class="mem-reel__placeholder">${i + 1}</span>`;
        }, FLASH_MS));
      };

      /* Schedule flashes */
      reel.forEach((_, i) => {
        timers.push(setTimeout(() => flashSlot(i), i * (FLASH_MS + GAP_MS)));
      });

      /* After last flash → show question */
      const totalStudyMs = reel.length * (FLASH_MS + GAP_MS) + HOLD_MS;
      timers.push(setTimeout(() => {
        phase = "recall";
        phaseEl.classList.remove("mem-phase--study");
        phaseEl.classList.add("mem-phase--recall");
        phaseEl.querySelector(".mem-phase__label").textContent = "RECALL";
        phaseEl.querySelector(".mem-phase__n").textContent     = "pick the shape";
        qEl.style.visibility = "visible";
        optsWrap.style.visibility = "visible";
        optsWrap.style.pointerEvents = "auto";

        optsWrap.querySelectorAll(".option").forEach(btn => {
          btn.addEventListener("click", () => {
            optsWrap.querySelectorAll(".option").forEach(b => b.classList.remove("option--selected"));
            btn.classList.add("option--selected");
            answer = Number(btn.dataset.idx);
            onAnswer(answer);
          });
        });
      }, totalStudyMs));
    },

    restore(root, { answer: savedAnswer } = {}) {
      clearTimers();
      phase = "done";

      const phaseEl  = root.querySelector("#mem-phase");
      const qEl      = root.querySelector("#mem-question");
      const optsWrap = root.querySelector("#mem-options");
      const reelEl   = root.querySelector("#mem-reel");

      if (phaseEl) {
        phaseEl.classList.remove("mem-phase--study");
        phaseEl.classList.add("mem-phase--recall");
        phaseEl.querySelector(".mem-phase__label").textContent = "LOCKED";
        phaseEl.querySelector(".mem-phase__n").textContent     = "";
      }
      /* Reel — clear lit slots, restore placeholders */
      if (reelEl) reelEl.querySelectorAll(".mem-reel__slot").forEach((s, i) => {
        s.classList.remove("mem-reel__slot--on");
        s.innerHTML = `<span class="mem-reel__placeholder">${i + 1}</span>`;
      });
      if (qEl) qEl.style.visibility = "visible";
      if (optsWrap) {
        optsWrap.style.visibility = "visible";
        const a = savedAnswer ?? answer;
        if (a !== null && a !== undefined) {
          const btn = optsWrap.querySelector(`.option[data-idx="${a}"]`);
          if (btn) btn.classList.add("option--selected");
        }
      }
    },

    getAnswer: () => answer,
    hasAnswer: () => answer !== null,
    evaluate: (a) => a === correctIndex,
    correctAnswer: () => correctIndex,
  };
}
