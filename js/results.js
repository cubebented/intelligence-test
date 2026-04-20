/* Results controller — simplified pipeline.
   Flow:
     1. Compute local deterministic IQ estimate.
     2. Show a smooth "analyzing" screen with edge glow.
     3. In parallel, ask DeepSeek for: (a) a ±5 IQ modifier, (b) a one-
        line description. AI may nudge the IQ based on pattern nuance.
     4. Snap the final IQ to the nearest 5 and reveal with a count-up.
     5. Render a SUPER simple result card — IQ, band, description,
        "people at this level", retake. */

/* ─── Config ─── */
const DEEPSEEK_API_KEY = "sk-751f504cc1fb461f836f935b34185c81";
const DEEPSEEK_URL     = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL   = "deepseek-chat";
const API_TIMEOUT_MS   = 11000;

const DOMAINS = {
  "Number Series":      "Fluid Reasoning",
  "Matrix Reasoning":   "Fluid Reasoning",
  "Pattern Sequence":   "Fluid Reasoning",
  "Word Problems":      "Fluid Reasoning",
  "Paper Folding":      "Spatial",
  "Cube Net":           "Spatial",
  "Figure Analogy":     "Pattern Recognition",
  "Odd One Out":        "Pattern Recognition",
  "Hidden Figure":      "Pattern Recognition",
  "Memory Grid":        "Working Memory",
  "Memory Sequence":    "Working Memory",
  "Memory Path":        "Working Memory",
  "Logic Puzzle":       "Verbal Reasoning",
  "Verbal Analogy":     "Verbal Reasoning",
  "Coding & Decoding":  "Verbal Reasoning",
  "Deduction":          "Verbal Reasoning",
  "Relationships":      "Verbal Reasoning",
  "Anagram":            "Verbal Reasoning",
};

/* ─── Famous people / descriptors by IQ bucket (rounded to 5) ─── */
/* Note: popular-culture reported IQs are anecdotal. We pitch these as
   "often reported as" rather than fact. */
/* Curated list of famous people with widely-reported (anecdotal) IQs.
   For any user IQ we pick the single person with the closest reported
   value. Numbers are "commonly cited" — they are not official records
   and we label them as "reported" in the UI. */
const FAMOUS = [
  { name: "Muhammad Ali",            iq:  78 },
  { name: "Andy Warhol",             iq:  86 },
  { name: "Ronald Reagan",           iq: 105 },
  { name: "John F. Kennedy",         iq: 119 },
  { name: "Barack Obama",            iq: 126 },
  { name: "Arnold Schwarzenegger",   iq: 132 },
  { name: "Nicole Kidman",           iq: 132 },
  { name: "Jodie Foster",            iq: 132 },
  { name: "Queen Elizabeth II",      iq: 135 },
  { name: "Madonna",                 iq: 140 },
  { name: "Hillary Clinton",         iq: 140 },
  { name: "Shakira",                 iq: 140 },
  { name: "Cindy Crawford",          iq: 154 },
  { name: "Conan O'Brien",           iq: 154 },
  { name: "Sharon Stone",            iq: 154 },
  { name: "Elon Musk",               iq: 155 },
  { name: "Ashton Kutcher",          iq: 160 },
  { name: "Quentin Tarantino",       iq: 160 },
  { name: "Bill Gates",              iq: 160 },
  { name: "Paul Allen",              iq: 160 },
  { name: "Stephen Hawking",         iq: 160 },
  { name: "Albert Einstein",         iq: 160 },
  { name: "Judit Polgár",            iq: 170 },
  { name: "James Woods",             iq: 180 },
  { name: "Terence Tao",             iq: 211 },
  { name: "Marilyn vos Savant",      iq: 228 },
];

/* Pick the single famous person with the closest reported IQ to the user's.
   Ties resolve in list order (first wins), which is intentional — the list
   is curated so the "canonical" choice at each tier comes first. */
function personForIQ(targetIQ) {
  let best = FAMOUS[0];
  let bestDiff = Math.abs(best.iq - targetIQ);
  for (const p of FAMOUS) {
    const d = Math.abs(p.iq - targetIQ);
    if (d < bestDiff) { best = p; bestDiff = d; }
  }
  return best;
}

/* ─── Entry ─── */
const root = document.getElementById("results");
const raw  = sessionStorage.getItem("iq_report");

if (!raw) {
  renderEmpty();
} else {
  boot(JSON.parse(raw));
}

function renderEmpty() {
  root.innerHTML = `
    <div class="results-empty">
      <p class="eyebrow">No assessment data found</p>
      <h1 class="h2" style="margin:var(--s-4) 0;">Start an assessment first.</h1>
      <a href="index.html" class="btn btn--primary">← Back to start</a>
    </div>
  `;
}

/* ─── Boot / orchestration ─── */
async function boot(report) {
  const stats = buildStats(report);

  renderAnalyzer();

  const aiPromise = Promise.race([
    callDeepSeek(report, stats).catch(err => {
      console.warn("[results] DeepSeek call failed — falling back.", err);
      return null;
    }),
    sleep(API_TIMEOUT_MS).then(() => null),
  ]);

  /* Smoother, shorter phases — less text, more rhythm */
  await runPhases([
    { text: "Analyzing responses",  ms: 1100, prog: 0.28 },
    { text: "Weighing difficulty",  ms: 1200, prog: 0.58 },
    { text: "Calibrating score",    ms: 1100, prog: 0.86 },
  ]);

  const ai = await aiPromise;

  /* Let the AI nudge the IQ within ±6 if it returned a modifier */
  let finalIQ = stats.rawIQ;
  if (ai && typeof ai.iqAdjustment === "number" && Number.isFinite(ai.iqAdjustment)) {
    finalIQ = stats.rawIQ + Math.max(-6, Math.min(6, ai.iqAdjustment));
  }

  /* Exact integer — no rounding to 5s */
  finalIQ = Math.max(55, Math.min(175, Math.round(finalIQ)));
  const band = bandFor(finalIQ);

  setAnalyzerProgress(1);
  await sleep(400);
  await fadeOutAnalyzer();

  renderResults({
    iq:          finalIQ,
    band,
    description: (ai && ai.description) || defaultDescription(finalIQ),
    person:      personForIQ(finalIQ),
    stats,
    source:      ai ? "ai" : "local",
  });
}

/* ─── Stats pipeline ─── */
function buildStats(report) {
  const { items, startAt, finishAt } = report;
  const total        = items.length;
  const correctCount = items.filter(x => x.correct).length;
  const skippedCount = items.filter(x => x.skipped).length;
  const timedOutCnt  = items.filter(x => x.timedOut).length;
  const pct          = Math.round((correctCount / total) * 100);
  const totalMs      = finishAt - startAt;
  const avgMs        = Math.round(
    items.reduce((s, x) => s + (x.elapsed || 0), 0) / total
  );

  /* Raw IQ — anchored 0 → 60, half → 100, full → 140 */
  const pctCorrect = correctCount / total;
  let iq = 60 + pctCorrect * 80;

  /* Efficiency bonus / sloppy penalty from time-budget usage */
  const correctItems = items.filter(x => x.correct && !x.skipped && !x.timedOut);
  if (correctItems.length >= 3) {
    const avgUsedRatio = correctItems.reduce((s, x) => {
      const budgetMs = (x.timeLimit || 60) * 1000;
      return s + Math.min(1, (x.elapsed || 0) / budgetMs);
    }, 0) / correctItems.length;
    if      (avgUsedRatio < 0.45) iq += 3;
    else if (avgUsedRatio < 0.65) iq += 1;
    else if (avgUsedRatio > 0.92) iq -= 2;
  }
  iq -= Math.min(6, timedOutCnt * 1.5);

  return {
    total, correctCount, skippedCount, timedOutCnt, pct,
    totalMs, avgMs,
    rawIQ: Math.round(iq),
  };
}

function bandFor(iq) {
  if (iq >= 145) return "Exceptional";
  if (iq >= 130) return "Superior";
  if (iq >= 115) return "Above average";
  if (iq >=  85) return "Average";
  if (iq >=  70) return "Below average";
  return "Well below average";
}

function defaultDescription(iq) {
  if (iq >= 145) return "Among the rarest test patterns — roughly 0.1% of people score here.";
  if (iq >= 130) return "Top 2% of the population. Consistent reasoning under time pressure.";
  if (iq >= 115) return "Above average — you handle most problem types well.";
  if (iq >= 100) return "Right around the population average.";
  if (iq >=  85) return "Solidly in the broad middle — about two-thirds of people score near here.";
  if (iq >=  70) return "Below the average band on this run. Practice can move this.";
  return "A low session score — often a tired or rushed run. Retake on another day.";
}

/* ─── DeepSeek ─── */
async function callDeepSeek(report, stats) {
  const payload = {
    raw_iq_estimate: stats.rawIQ,
    overall: {
      correct: stats.correctCount,
      total:   stats.total,
      pctCorrect: stats.pct,
      totalSeconds:   Math.round(stats.totalMs / 1000),
      avgSecondsPerQ: Math.round(stats.avgMs / 1000),
      skipped:  stats.skippedCount,
      timedOut: stats.timedOutCnt,
    },
    items: report.items.map(x => ({
      category: x.category,
      domain:   DOMAINS[x.category] || "Other",
      correct:  x.correct,
      skipped:  x.skipped,
      timedOut: x.timedOut,
      elapsedSeconds:   Math.round((x.elapsed || 0) / 1000),
      timeLimitSeconds: x.timeLimit || null,
    })),
  };

  const system = `You are a cognitive assessment analyst. You review an IQ test
result and return ONLY a JSON object (no markdown, no commentary).

Schema:
{
  "iqAdjustment": number,   // integer in [-6, +6]. Nudge to apply to the raw IQ
                            // estimate based on pattern nuance — e.g. got hard
                            // items right but missed easy ones (+), or the
                            // reverse (-), or rushed successful items (+),
                            // or timed out on items they got right (+).
                            // Default 0 if nothing stands out.
  "description": string     // ONE sentence, ≤ 22 words, specific and honest.
                            // Mention a concrete pattern if visible. No fluff,
                            // no "great job", no disclaimers.
}

The test covers Fluid Reasoning (Number Series, Matrix, Pattern Sequence, Word
Problems), Spatial (Paper Folding, Cube Net), Pattern Recognition (Figure
Analogy, Odd One Out, Hidden Figure), Working Memory (Memory Grid/Sequence/
Path), and Verbal Reasoning (Logic Puzzle, Verbal Analogy, Coding & Decoding,
Deduction, Relationships, Anagram).`;

  const user = `Raw IQ = ${stats.rawIQ}. Full data:\n${JSON.stringify(payload, null, 2)}`;

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user   },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data    = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  let parsed;
  try { parsed = JSON.parse(content); }
  catch { throw new Error("AI response was not valid JSON"); }
  return parsed;
}

/* ─── Analyzer overlay ─── */
function renderAnalyzer() {
  root.innerHTML = `
    <div class="analyzer" id="analyzer">
      <div class="analyzer__edge-glow"></div>
      <svg class="analyzer__visual" viewBox="0 0 140 140" aria-hidden="true">
        <circle class="analyzer__ring analyzer__ring--outer" cx="70" cy="70" r="60"/>
        <circle class="analyzer__ring analyzer__ring--mid"   cx="70" cy="70" r="44"/>
        <circle class="analyzer__ring analyzer__ring--inner" cx="70" cy="70" r="22"/>
        <circle class="analyzer__core" cx="70" cy="70" r="3"/>
        <g class="analyzer__orbit">
          <circle cx="70" cy="10" r="3.5"/>
        </g>
      </svg>
      <p class="analyzer__label">Calculating</p>
      <p class="analyzer__phase" id="analyzer-phase">Analyzing responses</p>
      <div class="analyzer__progress">
        <div class="analyzer__progress-fill" id="analyzer-progress"></div>
      </div>
    </div>
  `;
}

async function runPhases(phases) {
  for (const p of phases) {
    setAnalyzerPhase(p.text);
    setAnalyzerProgress(p.prog);
    await sleep(p.ms);
  }
}
function setAnalyzerPhase(text) {
  const el = document.getElementById("analyzer-phase");
  if (!el) return;
  el.style.opacity = "0";
  setTimeout(() => { el.textContent = text; el.style.opacity = ""; }, 200);
}
function setAnalyzerProgress(frac) {
  const el = document.getElementById("analyzer-progress");
  if (!el) return;
  el.style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`;
}
async function fadeOutAnalyzer() {
  const el = document.getElementById("analyzer");
  if (!el) return;
  el.classList.add("analyzer--exit");
  await sleep(500);
}

/* ─── Final results render — SIMPLE ─── */
function renderResults({ iq, band, description, person, stats, source }) {
  const esc = (s) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* Dramatic staged reveal:
     Stage 1 — "Your IQ is…" preamble → number counts up → band → button
     Stage 2 — big stats + description + [Next]
     Stage 3 — celebrity card + retake */
  root.innerHTML = `
    <article class="reveal-screen">

      <!-- STAGE 1: the dramatic reveal -->
      <section class="reveal-stage reveal-stage--one">
        <p class="reveal-preamble">Your IQ is</p>
        <div class="reveal-number" aria-live="polite">
          <span id="iq-value">0</span>
        </div>
        <p class="reveal-band">${band}</p>
        <button class="btn btn--primary reveal-btn" id="show-more">Show more</button>
      </section>

      <!-- STAGE 2: stats -->
      <section class="reveal-stage reveal-stage--two" id="rs-stats" hidden>
        <div class="rs-stats-grid">
          <div class="rs-stat">
            <span class="rs-stat__n" id="stat-correct">${stats.correctCount}</span>
            <span class="rs-stat__d">/ ${stats.total}</span>
            <span class="rs-stat__l">correct</span>
          </div>
          <div class="rs-stat">
            <span class="rs-stat__n" id="stat-pct">${stats.pct}</span>
            <span class="rs-stat__d">%</span>
            <span class="rs-stat__l">accuracy</span>
          </div>
          <div class="rs-stat">
            <span class="rs-stat__n" id="stat-time">${formatDuration(stats.totalMs)}</span>
            <span class="rs-stat__l">total time</span>
          </div>
        </div>
        <p class="reveal-desc">${esc(description)}</p>
        <button class="btn btn--primary" id="show-person">Next</button>
      </section>

      <!-- STAGE 3: celebrity -->
      <section class="reveal-stage reveal-stage--three" id="rs-person" hidden>
        <div class="reveal-person">
          <span class="reveal-person__label">At your level</span>
          <span class="reveal-person__name">${esc(person.name)}</span>
          <span class="reveal-person__iq">Reported IQ · ${person.iq}</span>
        </div>
        <a class="btn btn--ghost" href="index.html">Take it again</a>
      </section>

    </article>
  `;

  /* Start the dramatic count-up after the preamble + number-appear animations
     have played. 1000ms delay lines up with the CSS animation-delay on
     .reveal-number (blur-in + scale-in finishes there). */
  setTimeout(() => {
    dramaticCount(document.getElementById("iq-value"), iq, 2000);
  }, 1050);

  document.getElementById("show-more")?.addEventListener("click", () => {
    revealStage("rs-stats");
    document.getElementById("show-more").remove();
    animateCountTo(document.getElementById("stat-correct"), 0, stats.correctCount, 1100);
    animateCountTo(document.getElementById("stat-pct"),     0, stats.pct,          1100);
  });

  document.getElementById("show-person")?.addEventListener("click", () => {
    revealStage("rs-person");
    document.getElementById("show-person").remove();
  });
}

/* Aggressively-eased count-up: fast ramp, dramatic deceleration.
   Uses easeOutQuint so the final 10 points feel like a slow-motion landing. */
function dramaticCount(el, target, durationMs = 2000) {
  if (!el) return;
  const from  = 40;
  const start = performance.now();
  el.textContent = from;
  function tick(now) {
    const t     = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - t, 5);
    el.textContent = Math.round(from + (target - from) * eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* Smoothly un-hide + fade/slide in a stage */
function revealStage(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("rs-stage--in"));
}

function animateCountTo(el, from, target, durationMs) {
  if (!el) return;
  const start = performance.now();
  el.textContent = from;
  function tick(now) {
    const t     = Math.min(1, (now - start) / durationMs);
    const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    el.textContent = Math.round(from + (target - from) * eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function formatDuration(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/* ─── Util ─── */
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
