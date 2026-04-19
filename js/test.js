/* Test runner — per-question timers, skip support, clean header.
   Config lives in questions/index.js. Add/remove types there. */

/* Propagate the cache-bust version from our URL (?v=timestamp) through the
   import chain so questions/index.js and its children always load fresh
   during development. Static imports ignore the parent's query string. */
const _v = new URL(import.meta.url).searchParams.get("v") || "";
const _q = _v ? `?v=${_v}` : "";

const { RNG, randomSeed, strToSeed } = await import("./rng.js" + _q);
const { TYPES }                       = await import("./questions/index.js" + _q);

/* ─── Seed ─── */
const url      = new URL(location.href);
const testSeed = (url.searchParams.get("t") || randomSeed()).toUpperCase();
const runSeed  = sessionStorage.getItem("iq_run_seed") || randomSeed();
sessionStorage.setItem("iq_run_seed", runSeed);

/* ─── Build lineup ─── */
const testRng = new RNG(strToSeed("lineup:" + testSeed));
const lineup  = testRng.shuffle(TYPES.slice());

const runRng    = new RNG(strToSeed("run:" + runSeed));
const questions = lineup.map((t, i) => {
  const r = runRng.branch(`${t.id}:${i}`);
  return { type: t, q: t.generate(r) };
});

const total = questions.length;
const root  = document.querySelector("#app");

/* ─── State ─── */
const state = {
  index:      0,
  answers:    new Array(total).fill(null),
  skipped:    new Array(total).fill(false),   // true = explicitly skipped
  timedOut:   new Array(total).fill(false),   // true = timer ran out
  committed:  new Array(total).fill(false),   // true = advanced past; Back is view-only
  startTimes: new Array(total).fill(null),
  endTimes:   new Array(total).fill(null),
  startAt:    Date.now(),
  _qTimer:    null,   // setInterval handle for per-question countdown
};

/* ─── Helpers ─── */
const CIRC = 2 * Math.PI * 15.9; // SVG circle circumference (r=15.9)

function clearQTimer() {
  clearInterval(state._qTimer);
  state._qTimer = null;
  /* Reset any lingering timer-state class on body so bg warning clears */
  document.body.classList.remove("tm-warn", "tm-urgent");
}

function startQTimer() {
  clearQTimer();
  const limit = questions[state.index].type.timeLimit;
  if (!limit) return;

  const endMs = Date.now() + limit * 1000;

  function tick() {
    const remaining = Math.max(0, endMs - Date.now());
    const secs      = Math.ceil(remaining / 1000);
    const ratio     = remaining / (limit * 1000);

    const numEl = document.getElementById("qt-num");
    const arcEl = document.getElementById("qt-arc");
    const wrap  = document.getElementById("qt-wrap");
    if (!numEl) { clearQTimer(); return; }

    numEl.textContent = secs;
    arcEl.style.strokeDasharray = `${ratio * CIRC} ${CIRC}`;

    const inWarn   = ratio < 0.4 && ratio >= 0.2;
    const inUrgent = ratio < 0.2;

    wrap.classList.toggle("qt--warn",   inWarn);
    wrap.classList.toggle("qt--urgent", inUrgent);

    /* Mirror state onto the body so the background can wash amber/red */
    document.body.classList.toggle("tm-warn",   inWarn);
    document.body.classList.toggle("tm-urgent", inUrgent);

    if (remaining <= 0) {
      clearQTimer();
      timedOut();
    }
  }

  tick();
  state._qTimer = setInterval(tick, 250);
}

/* ─── Render ─── */

function progressCells() {
  return Array.from({ length: total }, (_, i) => {
    const cls =
      state.skipped[i] || state.timedOut[i]   ? "progress__cell--skipped" :
      i < state.index                          ? "progress__cell--done" :
      i === state.index                        ? "progress__cell--current" : "";
    return `<div class="progress__cell ${cls}" title="Question ${i + 1}"></div>`;
  }).join("");
}

function renderHeader() {
  const limit = questions[state.index].type.timeLimit;
  const timer = limit ? `
    <div class="qt" id="qt-wrap">
      <svg class="qt__ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle class="qt__track" cx="18" cy="18" r="15.9"/>
        <circle class="qt__arc"   cx="18" cy="18" r="15.9"
                id="qt-arc"
                style="stroke-dasharray:${CIRC} ${CIRC}; stroke-dashoffset:0;
                       transform:rotate(-90deg); transform-origin:50% 50%"/>
      </svg>
      <span class="qt__num" id="qt-num">${limit}</span>
    </div>` : `<div></div>`;

  return `
    <div class="test-header">
      <div class="test-header__row">
        <div class="test-header__meta">
          Question <strong>${state.index + 1}</strong>
          <span class="test-header__sep">/</span>
          Question <strong>${total}</strong>
        </div>
        <div></div>
        ${timer}
      </div>
      <div class="progress" aria-label="Progress">${progressCells()}</div>
    </div>`;
}

function renderStage(q, locked) {
  const note = locked ? `<p class="question__locked-note">Answer locked</p>` : "";
  return `
    <div class="stage">
      <div class="question">
        <div class="question__header">
          <p class="question__prompt">${q.prompt}</p>
        </div>
        <div class="question__canvas ${locked ? "question__canvas--locked" : ""}" id="canvas">${q.render()}</div>
        ${note}
      </div>
    </div>`;
}

function renderFooter(locked) {
  const answered = questions[state.index].q.hasAnswer();
  const isLast   = state.index === total - 1;
  /* When locked (committed on a prior visit), hide Skip — it would lose a real answer */
  const showSkip = !locked;
  return `
    <div class="test-footer">
      <div class="test-footer__hint">
        SEED <span class="kbd">${testSeed}</span>
        ${showSkip ? `&ensp;·&ensp;<kbd class="kbd">S</kbd> skip` : ""}
        &ensp;·&ensp;<kbd class="kbd">ESC</kbd> leave
      </div>
      <div class="flex gap-3">
        ${state.index > 0
          ? `<button class="btn btn--ghost" id="prev-btn">← Back</button>`
          : ""}
        ${showSkip
          ? `<button class="btn btn--ghost btn--skip" id="skip-btn">Skip →</button>`
          : ""}
        <button class="btn btn--primary" id="next-btn" ${answered || locked ? "" : "disabled"}>
          ${isLast ? "Finish" : "Next →"}
        </button>
      </div>
    </div>`;
}

function render() {
  clearQTimer();
  const { q }  = questions[state.index];
  const locked = state.committed[state.index];  // view-only on revisit
  state.startTimes[state.index] = state.startTimes[state.index] || Date.now();

  root.innerHTML = `
    <div class="test-shell">
      ${renderHeader()}
      ${renderStage(q, locked)}
      ${renderFooter(locked)}
    </div>`;

  const canvas = root.querySelector("#canvas");

  if (locked) {
    /* Paint the saved answer (or skipped/timed-out marker) without wiring interactions */
    if (typeof q.restore === "function") q.restore(canvas, {
      answer:   state.answers[state.index],
      skipped:  state.skipped[state.index],
      timedOut: state.timedOut[state.index],
    });
  } else {
    /* Live question: wire interactions */
    q.attach(canvas, () => {
      const btn = root.querySelector("#next-btn");
      if (q.hasAnswer()) btn.removeAttribute("disabled");
      else btn.setAttribute("disabled", "");
    });
    /* Non-locked: do NOT call restore unconditionally — it would clobber
       multi-phase questions (memory tasks start in a "study" phase that
       must not be overridden). Individual modules re-apply saved state
       from inside attach() if needed (see series.js for the pattern). */
  }

  root.querySelector("#next-btn").addEventListener("click", advance);
  root.querySelector("#skip-btn")?.addEventListener("click", skip);
  root.querySelector("#prev-btn")?.addEventListener("click", back);

  /* Only run the countdown on fresh (uncommitted) questions */
  if (!locked) startQTimer();
}

/* ─── Navigation ─── */

function advance() {
  const cur    = questions[state.index].q;
  const locked = state.committed[state.index];

  if (!locked) {
    if (!cur.hasAnswer()) return;
    state.answers[state.index]   = cur.getAnswer();
    state.endTimes[state.index]  = Date.now();
    state.committed[state.index] = true;   // lock once advanced
  }
  clearQTimer();
  state.index === total - 1 ? finish() : (state.index++, render());
}

function skip() {
  if (state.committed[state.index]) return;   // can't skip a locked question
  state.answers[state.index]   = null;
  state.skipped[state.index]   = true;
  state.committed[state.index] = true;
  state.endTimes[state.index]  = Date.now();
  clearQTimer();
  state.index === total - 1 ? finish() : (state.index++, render());
}

function timedOut() {
  state.answers[state.index]   = null;
  state.timedOut[state.index]  = true;
  state.committed[state.index] = true;
  state.endTimes[state.index]  = Date.now();
  state.index === total - 1 ? finish() : (state.index++, render());
}

function back() {
  if (state.index === 0) return;
  clearQTimer();
  state.index--;
  render();
}

function finish() {
  clearQTimer();
  const report = {
    testSeed, runSeed,
    startAt:  state.startAt,
    finishAt: Date.now(),
    items: questions.map((entry, i) => ({
      index:         i,
      type:          entry.q.type,
      category:      entry.q.category,
      timeLimit:     entry.type.timeLimit || null,
      answer:        state.answers[i],
      skipped:       state.skipped[i],
      timedOut:      state.timedOut[i],
      correct:       entry.q.evaluate(state.answers[i]),
      correctAnswer: entry.q.correctAnswer(),
      elapsed:       (state.endTimes[i] || Date.now()) - (state.startTimes[i] || state.startAt),
    })),
  };
  sessionStorage.setItem("iq_report", JSON.stringify(report));
  location.href = "results.html";
}

function leave() {
  if (confirm("Leave this assessment? Progress will be lost.")) {
    clearQTimer();
    sessionStorage.removeItem("iq_run_seed");
    location.href = "index.html";
  }
}

/* ─── Keyboard ─── */

window.addEventListener("keydown", e => {
  const tag = document.activeElement?.tagName;
  const inField = tag === "INPUT" || tag === "TEXTAREA";

  if (e.key === "Enter" && !inField) {
    advance();
  } else if (e.key === "Enter" && inField) {
    if (questions[state.index].q.hasAnswer()) setTimeout(advance, 100);
  } else if ((e.key === "s" || e.key === "S") && !inField) {
    if (!state.committed[state.index]) skip();
  } else if (e.key === "Escape") {
    leave();
  }
});

/* ─── Go ─── */
render();
