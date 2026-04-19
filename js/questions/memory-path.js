/* Memory Path — Corsi-style block-tapping task.
   Study: dots on a 4x4 grid light up one at a time in a specific order.
   Recall: user clicks the dots in the same order.
   Correct when picked sequence exactly matches the target sequence. */

const GRID = 4;
const PATH_LEN = 7;        // up from 5 — Corsi span at 7 is genuinely difficult
const FLASH_MS = 420;      // slightly faster flashes so chunking is harder
const GAP_MS   = 140;
const HOLD_MS  = 400;

function keyOf(c, r) { return `${c},${r}`; }

export function generate(rng) {
  /* Random path of PATH_LEN distinct cells */
  const all = [];
  for (let c = 0; c < GRID; c++) for (let r = 0; r < GRID; r++) all.push([c, r]);
  const path = rng.sample(all, PATH_LEN);
  const targetSeq = path.map(([c, r]) => keyOf(c, r));

  let picked = [];                  // ordered keys the user has tapped
  let phase  = "study";
  let timers = [];

  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  return {
    type: "memory-path",
    category: "Memory Path",
    prompt: `Watch the dots flash in order, then tap them in the same order. ${PATH_LEN} taps.`,

    render() {
      let nodes = "";
      for (let r = 0; r < GRID; r++)
        for (let c = 0; c < GRID; c++)
          nodes += `<button type="button" class="mem-node" data-key="${keyOf(c, r)}" tabindex="-1"></button>`;

      return `
        <div class="mem-wrap">
          <div class="mem-phase mem-phase--study" id="mem-phase">
            <span class="mem-phase__label">WATCH</span>
            <span class="mem-phase__n" id="mem-phase-n">${PATH_LEN} steps</span>
          </div>
          <div class="mem-path-grid" id="mem-path-grid" style="--g:${GRID}">${nodes}</div>
          <p class="mem-count" id="mem-count">
            <span id="mem-count-num">0</span> / ${PATH_LEN} tapped
          </p>
        </div>`;
    },

    attach(root, onAnswer) {
      const grid    = root.querySelector("#mem-path-grid");
      const phaseEl = root.querySelector("#mem-phase");
      const countEl = root.querySelector("#mem-count-num");
      const countWrap = root.querySelector("#mem-count");

      const flashNode = (key) => {
        const node = grid.querySelector(`.mem-node[data-key="${key}"]`);
        if (!node) return;
        node.classList.add("mem-node--flash");
        timers.push(setTimeout(() => node.classList.remove("mem-node--flash"), FLASH_MS));
      };

      /* Schedule sequential flashes */
      targetSeq.forEach((k, i) => {
        timers.push(setTimeout(() => flashNode(k), i * (FLASH_MS + GAP_MS)));
      });

      const totalStudyMs = targetSeq.length * (FLASH_MS + GAP_MS) + HOLD_MS;
      timers.push(setTimeout(() => {
        phase = "recall";
        phaseEl.classList.remove("mem-phase--study");
        phaseEl.classList.add("mem-phase--recall");
        phaseEl.querySelector(".mem-phase__label").textContent = "RECALL";
        phaseEl.querySelector(".mem-phase__n").textContent     = "tap in order";

        grid.querySelectorAll(".mem-node").forEach(node => {
          node.addEventListener("click", () => {
            if (picked.length >= PATH_LEN) return;
            const k = node.dataset.key;
            picked.push(k);
            node.classList.add("mem-node--picked");
            /* Show the order number inside the node */
            const span = document.createElement("span");
            span.className = "mem-node__order";
            span.textContent = picked.length;
            node.appendChild(span);

            countEl.textContent = picked.length;

            if (picked.length === PATH_LEN) {
              onAnswer(picked.join("|"));
            } else {
              onAnswer(null);
            }
          });
        });

        /* Tiny reset affordance — long-press clears; keep simple: double-click a picked node to pop it */
        grid.addEventListener("dblclick", (e) => {
          const node = e.target.closest(".mem-node");
          if (!node) return;
          const last = picked[picked.length - 1];
          if (node.dataset.key === last) {
            picked.pop();
            node.classList.remove("mem-node--picked");
            const span = node.querySelector(".mem-node__order");
            if (span) span.remove();
            countEl.textContent = picked.length;
            onAnswer(picked.length === PATH_LEN ? picked.join("|") : null);
          }
        });
      }, totalStudyMs));
    },

    restore(root, { answer: savedAnswer } = {}) {
      clearTimers();
      phase = "done";

      const grid    = root.querySelector("#mem-path-grid");
      const phaseEl = root.querySelector("#mem-phase");
      const countEl = root.querySelector("#mem-count-num");

      if (phaseEl) {
        phaseEl.classList.remove("mem-phase--study");
        phaseEl.classList.add("mem-phase--recall");
        phaseEl.querySelector(".mem-phase__label").textContent = "LOCKED";
        phaseEl.querySelector(".mem-phase__n").textContent     = "";
      }
      if (grid) {
        grid.querySelectorAll(".mem-node").forEach(n => {
          n.classList.remove("mem-node--flash");
          n.classList.remove("mem-node--picked");
          n.querySelector(".mem-node__order")?.remove();
        });
        const savedArr = (savedAnswer ?? picked.join("|")).split("|").filter(Boolean);
        savedArr.forEach((k, i) => {
          const node = grid.querySelector(`.mem-node[data-key="${k}"]`);
          if (!node) return;
          node.classList.add("mem-node--picked");
          const span = document.createElement("span");
          span.className = "mem-node__order";
          span.textContent = i + 1;
          node.appendChild(span);
        });
      }
      if (countEl) countEl.textContent = picked.length;
    },

    getAnswer: () => picked.length === PATH_LEN ? picked.join("|") : null,
    hasAnswer: () => picked.length === PATH_LEN,
    evaluate: (a) => {
      if (!a) return false;
      const arr = a.split("|");
      if (arr.length !== targetSeq.length) return false;
      return arr.every((k, i) => k === targetSeq[i]);
    },
    correctAnswer: () => targetSeq.join("|"),
  };
}
