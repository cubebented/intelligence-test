/* Memory Grid (Spatial Recall) — classic visual working-memory task.
   Study: a 5x5 grid with N cells lit is shown for a fixed window.
   Recall: the grid goes blank; the user clicks the cells they remember.
   Correct when the picked set === the target set. */

const GRID = 5;           // 5x5
const STUDY_MS = 3000;    // tighter study window — no time to chunk leisurely
const MIN_TARGETS = 7;
const MAX_TARGETS = 9;

function keyOf(c, r) { return `${c},${r}`; }

export function generate(rng) {
  const nTargets = rng.int(MIN_TARGETS, MAX_TARGETS);
  /* Pick nTargets distinct cells */
  const all = [];
  for (let c = 0; c < GRID; c++) for (let r = 0; r < GRID; r++) all.push([c, r]);
  const targets = rng.sample(all, nTargets);
  const targetKeys = new Set(targets.map(([c, r]) => keyOf(c, r)));

  let selected = new Set();
  let phase    = "study";          // "study" | "recall" | "done"
  let phaseTimer = null;           // setTimeout handle for study → recall

  const cellHtml = (c, r) => {
    const k = keyOf(c, r);
    const on = targetKeys.has(k);
    return `<button type="button"
              class="mem-cell ${on ? 'mem-cell--on' : ''}"
              data-key="${k}" data-col="${c}" data-row="${r}"
              tabindex="-1"></button>`;
  };

  return {
    type: "memory-grid",
    category: "Memory Grid",
    prompt: `Memorize ${nTargets} highlighted cells. Tap them on the empty grid after they vanish.`,

    render() {
      let cells = "";
      for (let r = 0; r < GRID; r++)
        for (let c = 0; c < GRID; c++) cells += cellHtml(c, r);

      return `
        <div class="mem-wrap">
          <div class="mem-phase mem-phase--study" id="mem-phase">
            <span class="mem-phase__label">STUDY</span>
            <span class="mem-phase__bar" id="mem-bar"></span>
            <span class="mem-phase__n" id="mem-phase-n">${nTargets} cells</span>
          </div>
          <div class="mem-grid" id="mem-grid" style="--g:${GRID}">${cells}</div>
          <p class="mem-count" id="mem-count">
            <span id="mem-count-num">0</span> / ${nTargets} placed
          </p>
        </div>`;
    },

    attach(root, onAnswer) {
      const grid     = root.querySelector("#mem-grid");
      const phaseEl  = root.querySelector("#mem-phase");
      const bar      = root.querySelector("#mem-bar");
      const countEl  = root.querySelector("#mem-count-num");

      /* Kick off the study-phase progress bar animation */
      requestAnimationFrame(() => {
        bar.style.transition = `transform ${STUDY_MS}ms linear`;
        bar.style.transform  = "scaleX(0)";
      });

      const enterRecall = () => {
        if (phase !== "study") return;
        phase = "recall";
        /* Hide target highlights */
        grid.querySelectorAll(".mem-cell--on").forEach(el => el.classList.remove("mem-cell--on"));
        phaseEl.classList.remove("mem-phase--study");
        phaseEl.classList.add("mem-phase--recall");
        phaseEl.querySelector(".mem-phase__label").textContent = "RECALL";
        phaseEl.querySelector(".mem-phase__n").textContent     = "tap cells";
        /* Wire up picks */
        grid.querySelectorAll(".mem-cell").forEach(cell => {
          cell.addEventListener("click", () => {
            const k = cell.dataset.key;
            if (selected.has(k)) {
              selected.delete(k);
              cell.classList.remove("mem-cell--picked");
            } else {
              if (selected.size >= nTargets) {
                /* Flash "at cap" feedback briefly */
                countEl.parentElement.classList.add("mem-count--cap");
                setTimeout(() => countEl.parentElement.classList.remove("mem-count--cap"), 220);
                return;
              }
              selected.add(k);
              cell.classList.add("mem-cell--picked");
            }
            countEl.textContent = selected.size;
            onAnswer(selected.size === nTargets ? [...selected].sort().join("|") : null);
          });
        });
      };

      phaseTimer = setTimeout(enterRecall, STUDY_MS);
    },

    restore(root, { answer: savedAnswer } = {}) {
      /* Skip study phase entirely — we're viewing a committed question */
      if (phaseTimer) { clearTimeout(phaseTimer); phaseTimer = null; }
      phase = "done";

      const grid    = root.querySelector("#mem-grid");
      const phaseEl = root.querySelector("#mem-phase");
      const bar     = root.querySelector("#mem-bar");
      const countEl = root.querySelector("#mem-count-num");

      if (bar) { bar.style.transition = "none"; bar.style.transform = "scaleX(0)"; }
      if (phaseEl) {
        phaseEl.classList.remove("mem-phase--study");
        phaseEl.classList.add("mem-phase--recall");
        phaseEl.querySelector(".mem-phase__label").textContent = "LOCKED";
        phaseEl.querySelector(".mem-phase__n").textContent     = "";
      }
      if (grid) {
        /* Paint saved picks; also show correct answer as hollow markers */
        const savedSet = new Set((savedAnswer ?? [...selected].join("|")).split("|").filter(Boolean));
        grid.querySelectorAll(".mem-cell").forEach(cell => {
          cell.classList.remove("mem-cell--on");
          const k = cell.dataset.key;
          if (savedSet.has(k)) cell.classList.add("mem-cell--picked");
          if (targetKeys.has(k) && !savedSet.has(k)) cell.classList.add("mem-cell--truth");
        });
      }
      if (countEl) countEl.textContent = selected.size;
    },

    getAnswer: () => selected.size === nTargets ? [...selected].sort().join("|") : null,
    hasAnswer: () => selected.size === nTargets,
    evaluate: (a) => {
      if (!a) return false;
      const picked = new Set(a.split("|"));
      if (picked.size !== targetKeys.size) return false;
      for (const k of picked) if (!targetKeys.has(k)) return false;
      return true;
    },
    correctAnswer: () => [...targetKeys].sort().join("|"),
  };
}
