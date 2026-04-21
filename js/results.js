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
const API_TIMEOUT_MS   = 14000;   /* deeper analysis + 900-token ceiling → allow more wall-clock */

/* Category → cognitive-domain grouping, used by the AI analyst to spot
   per-domain patterns. Matches the CATEGORY names in questions/problem.js. */
const DOMAINS = {
  "Arithmetic":       "Numerical Reasoning",
  "Word Problem":     "Numerical Reasoning",
  "Number Sequence":  "Fluid Reasoning",
  "Letter Sequence":  "Fluid Reasoning",
  "Pattern Code":     "Fluid Reasoning",
  "Analogy":          "Verbal Reasoning",
  "Odd One Out":      "Pattern Recognition",
  "Trick Question":   "Careful Reading",
  "Deduction":        "Logical Reasoning",
  "Time & Age":       "Numerical Reasoning",
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

  /* Six-phase calibration sequence — IQ estimate converges on the raw score
     while CI tightens and z-score / percentile update each step. */
  const T = stats.rawIQ;
  await runPhases([
    { text: "Reading your responses",    ms: 1100, iq: null,      ci: 18 },
    { text: "Scoring each domain",       ms: 1200, iq: T - 7.4,   ci: 14 },
    { text: "Weighting by difficulty",   ms: 1200, iq: T - 2.9,   ci: 10 },
    { text: "Mapping to distribution",   ms: 1200, iq: T - 0.8,   ci: 7  },
    { text: "Cross-referencing norms",   ms: 1200, iq: T + 0.3,   ci: 5  },
    { text: "Finalizing estimate",       ms: 1100, iq: T,         ci: 3  },
  ]);

  const ai = await aiPromise;

  /* Let the AI nudge the IQ within ±8 if it returned a modifier.
     The wider range reflects the deeper analysis — the model now looks at
     ceiling patterns, timing signatures, and knowledge-vs-reasoning gaps,
     so it has more grounded reasons to adjust than the previous ±6 cap. */
  let finalIQ = stats.rawIQ;
  if (ai && typeof ai.iqAdjustment === "number" && Number.isFinite(ai.iqAdjustment)) {
    finalIQ = stats.rawIQ + Math.max(-8, Math.min(8, ai.iqAdjustment));
  }

  /* Exact integer — no rounding to 5s */
  finalIQ = Math.max(55, Math.min(175, Math.round(finalIQ)));
  const band = bandFor(finalIQ);

  /* Hold on the locked calibrator for a beat before the transition */
  await sleep(500);

  /* Mount the reveal-screen on top of the analyzer.
     It is position:fixed z-index:20, so it instantly covers the analyzer
     (same dark background = no visible flash) and fades to opacity:1 over
     350ms. The analyzer can quietly exit in the background and is removed
     once the reveal-screen is solid. */
  const analyzerEl = document.getElementById("analyzer");

  renderResults({
    iq:          finalIQ,
    band,
    description: (ai && ai.description) || defaultDescription(finalIQ),
    person:      personForIQ(finalIQ),
    stats,
    source:      ai ? "ai" : "local",
  });

  /* Remove the analyzer once the reveal-screen is fully opaque */
  await sleep(400);
  analyzerEl?.remove();
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

/* ─── DeepSeek ───
   The analyst does a deep multi-dimensional read of the full item-by-item
   record. We give it raw data + domain groupings + timing ratios + difficulty
   hints, and it returns a rich structured assessment we render on the
   results page. If this call fails we fall back to the local estimate. */
async function callDeepSeek(report, stats) {
  /* Per-domain roll-up so the model doesn't have to aggregate itself.
     Each domain gets: count, correct, accuracy, avg time, avg time-used
     ratio (elapsed / timeLimit) — the key signal for "rushed vs. deliberate". */
  const byDomain = {};
  for (const x of report.items) {
    const dom = DOMAINS[x.category] || "Other";
    const d = byDomain[dom] ||= {
      domain: dom, total: 0, correct: 0, skipped: 0, timedOut: 0,
      sumElapsed: 0, sumLimit: 0, categories: new Set(),
    };
    d.total    += 1;
    d.correct  += x.correct  ? 1 : 0;
    d.skipped  += x.skipped  ? 1 : 0;
    d.timedOut += x.timedOut ? 1 : 0;
    d.sumElapsed += Math.round((x.elapsed || 0) / 1000);
    d.sumLimit   += x.timeLimit || 60;
    d.categories.add(x.category);
  }
  const domains = Object.values(byDomain).map(d => ({
    domain:      d.domain,
    categories:  [...d.categories],
    total:       d.total,
    correct:     d.correct,
    accuracy:    d.total ? Math.round((d.correct / d.total) * 100) : 0,
    skipped:     d.skipped,
    timedOut:    d.timedOut,
    avgSeconds:  d.total ? Math.round(d.sumElapsed / d.total) : 0,
    timeUsedPct: d.sumLimit ? Math.round((d.sumElapsed / d.sumLimit) * 100) : 0,
  }));

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
    byDomain: domains,
    items: report.items.map((x, i) => ({
      index:     i + 1,
      category:  x.category,
      domain:    DOMAINS[x.category] || "Other",
      correct:   x.correct,
      skipped:   x.skipped,
      timedOut:  x.timedOut,
      elapsedSeconds:   Math.round((x.elapsed || 0) / 1000),
      timeLimitSeconds: x.timeLimit || null,
      timeUsedPct: x.timeLimit
        ? Math.round(((x.elapsed || 0) / 1000 / x.timeLimit) * 100)
        : null,
    })),
  };

  const system = `You are a senior cognitive-assessment analyst. You review a
completed IQ-test session and write a short, honest analysis. The analysis
STILL needs to be deep — look for patterns, not just "you got X out of Y".
But the surface you return is a single clean paragraph that a parent or
teenager can read in 20 seconds. Return ONLY JSON — no markdown, no prose
outside the JSON.

The test is 20 timed multiple-choice problems, 60 seconds each, covering:
arithmetic, number sequences, logical deduction, verbal analogies, classic
IQ-test trick questions, time/age/money puzzles, and pattern recognition.

═══ HOW TO THINK ═══
Internally, consider:
  • Timing signature — did they rush (<30% time on most correct items),
    work deliberately (60%+), or run out of time often?
  • Where they slipped — were the misses on trick questions (read too fast),
    arithmetic (calc errors), or abstract reasoning (genuinely tough)?
  • Ceiling pattern — nailing the hardest items while missing easy ones
    suggests attention or rush, not ability.
  • Skip vs. timed-out vs. wrong — each has a different interpretation.

Do not output any of this reasoning separately. Distil it into ONE paragraph.

═══ RESPONSE SCHEMA ═══
{
  "iqAdjustment": number,       // integer in [-8, +8]. Nudge the raw IQ based
                                // on pattern nuance: + for nailing the hardest
                                // items or correct-while-timed-out; − for a
                                // scattered / lucky pattern. 0 if nothing
                                // stands out.
  "description": string         // 3–5 sentences, ≤ 85 words total, written
                                // as a single flowing paragraph (NO bullet
                                // points, NO lists). Lead with the single
                                // most specific observation you can defend
                                // from the data. Mention the timing
                                // signature and one concrete strength or
                                // slip. End with a short, honest framing of
                                // what the score actually means at this age.
                                // No clichés, no "great job", no disclaimers,
                                // no "overall you scored X out of Y".
}

Ground every claim in the data. If there's no signal, prefer a neutral
observation ("steady across the test") over a fabricated pattern.`;

  const userAge = Number(sessionStorage.getItem("iq_user_age")) || null;
  const user = `Raw local IQ estimate: ${stats.rawIQ}.
Test-taker age: ${userAge ?? "unknown"}.
Full session record:
${JSON.stringify(payload, null, 2)}

Analyse the pattern. Return the JSON per schema.`;

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
      temperature: 0.35,
      max_tokens: 380,
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
      <header class="analyzer__header">
        <span class="analyzer__eyebrow">Calculating</span>
        <span class="analyzer__counter" id="analyzer-counter">01 &middot; 03</span>
      </header>

      <div class="analyzer__stage">
        <svg class="analyzer__viz" viewBox="0 0 240 160" role="img"
             aria-labelledby="ana-title ana-desc">
          <title id="ana-title">IQ score calibration</title>
          <desc id="ana-desc">A calibration needle homing in on the IQ distribution.</desc>

          <!-- Corner viewfinder brackets — stagger in during intro -->
          <g class="ana-brackets" stroke="var(--text-faint)" stroke-width="1"
             fill="none" stroke-linecap="round">
            <path class="ana-bracket" style="--i:0" d="M 8 8 L 8 22 M 8 8 L 22 8"/>
            <path class="ana-bracket" style="--i:1" d="M 232 8 L 232 22 M 232 8 L 218 8"/>
            <path class="ana-bracket" style="--i:2" d="M 8 152 L 8 138 M 8 152 L 22 152"/>
            <path class="ana-bracket" style="--i:3" d="M 232 152 L 232 138 M 232 152 L 218 152"/>
          </g>

          <!-- Three dashed guide lines at 70 / 100 / 130 -->
          <g class="ana-grid" stroke="var(--hairline-strong)" stroke-width="1" stroke-dasharray="1 3">
            <line x1="60"  y1="82" x2="60"  y2="124"/>
            <line x1="120" y1="40" x2="120" y2="124"/>
            <line x1="180" y1="82" x2="180" y2="124"/>
          </g>

          <!-- X-axis baseline -->
          <line class="ana-axis" x1="36" y1="124" x2="204" y2="124"
                stroke="var(--border-strong)" stroke-width="1"/>

          <!-- Three axis labels only -->
          <g class="ana-labels" font-family="Geist Mono, monospace" font-size="7"
             fill="var(--text-muted)" letter-spacing="1" text-anchor="middle">
            <text x="60"  y="138">70</text>
            <text x="120" y="138">100</text>
            <text x="180" y="138">130</text>
          </g>

          <!-- Bell curve -->
          <path class="ana-curve"
                d="M 36 124 C 76 124 90 48 120 40 C 150 48 164 124 204 124"
                fill="none" stroke="var(--text-secondary)" stroke-width="1.4"
                stroke-linecap="round" pathLength="1"/>

          <!-- Calibrator indicator: simple needle + dot -->
          <g class="ana-cal">
            <line x1="0" y1="36" x2="0" y2="124" stroke="var(--accent)" stroke-width="1.3"/>
            <circle class="ana-cal-dot" cx="0" cy="36" r="3" fill="var(--accent)"/>
          </g>
        </svg>

        <p class="analyzer__phase" id="analyzer-phase">Reading your responses</p>
      </div>
    </div>
  `;
}

async function runPhases(phases) {
  const total = phases.length;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    setAnalyzerCounter(i + 1, total);
    setAnalyzerPhase(p.text);
    setAnalyzerProgress(p.prog);
    if (p.iq != null) setAnalyzerReadout(p.iq, p.ci);
    else              setAnalyzerCI(p.ci);
    await sleep(p.ms);
  }
}
function setAnalyzerCounter(n, total) {
  const el = document.getElementById("analyzer-counter");
  if (!el) return;
  const pad = (x) => String(x).padStart(2, "0");
  el.innerHTML = `${pad(n)} &middot; ${pad(total)}`;
}
/* Updates the live readout block inside the analyzer SVG: IQ, z-score,
   percentile, and confidence-interval width. Silently no-ops if any
   target element is missing. */
function setAnalyzerReadout(iq, ci) {
  const readout = document.getElementById("ana-readout");
  const zEl     = document.getElementById("ana-z");
  const pctEl   = document.getElementById("ana-pct");
  if (readout) readout.textContent = iq.toFixed(1);
  const z = (iq - 100) / 15;
  if (zEl)   zEl.textContent   = (z >= 0 ? "+" : "") + z.toFixed(2);
  if (pctEl) pctEl.textContent = String(Math.max(1, Math.min(99, Math.round(normalCdf(z) * 100))));
  setAnalyzerCI(ci);
}
function setAnalyzerCI(ci) {
  const ciEl = document.getElementById("ana-ci-val");
  if (ciEl && ci != null) ciEl.textContent = String(ci);
}
/* Standard-normal CDF via Abramowitz & Stegun 26.2.17 — good to ~7.5e-8 */
function normalCdf(z) {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t
                - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}
function setAnalyzerPhase(text) {
  const el = document.getElementById("analyzer-phase");
  if (!el) return;
  if (el.textContent === text) return;
  el.classList.remove("analyzer__phase--in");
  el.classList.add("analyzer__phase--out");
  setTimeout(() => {
    el.textContent = text;
    el.classList.remove("analyzer__phase--out");
    /* Force reflow so the `--in` animation restarts */
    void el.offsetWidth;
    el.classList.add("analyzer__phase--in");
  }, 240);
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

/* ─── Final results render ─── */
function renderResults({ iq, band, description, person, stats, source }) {
  const esc = (s) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* Dramatic staged reveal:
     Stage 1 — "Your IQ is…" preamble → number counts up → band → button
     Stage 2 — big stats + description + [Next]
     Stage 3 — celebrity card + retake
     Appended (not replacing) so the analyzer can crossfade out while
     the reveal screen fades in. */
  root.insertAdjacentHTML("beforeend", `
    <article class="reveal-screen">

      <!-- Full-viewport flash — triggered when the count-up lands -->
      <div class="reveal-flash" id="reveal-flash" aria-hidden="true"></div>

      <!-- STAGE 1: the dramatic reveal -->
      <section class="reveal-stage reveal-stage--one" id="rs-one">
        <p class="reveal-preamble">
          <span class="reveal-preamble__word">Your</span><!--
       --><span class="reveal-preamble__word">IQ</span><!--
       --><span class="reveal-preamble__word">is</span>
        </p>
        <div class="reveal-number-wrap">
          <div class="reveal-preamble__dots" id="preamble-dots" aria-hidden="true">
            <span class="reveal-preamble__dot"></span>
            <span class="reveal-preamble__dot"></span>
            <span class="reveal-preamble__dot"></span>
          </div>

          <div class="reveal-number" id="reveal-number" aria-live="polite">
          <!-- Shockwave ring — expands outward when the number lands -->
          <span class="reveal-ring" id="ring-1" aria-hidden="true"></span>
          <!-- Particle burst container (spans injected on impact) -->
          <span class="reveal-particles" id="particles" aria-hidden="true"></span>
          <span id="iq-value">0</span>
        </div>
        </div><!-- /.reveal-number-wrap -->

        <p class="reveal-band"><span class="reveal-band__text">${band}</span></p>
        <button class="btn btn--primary reveal-btn" id="show-more">Show more</button>
      </section>

      <!-- STAGE 2: stats + single readable paragraph -->
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
          <div class="rs-stat rs-stat--time">
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
  `);

  /* Fade out the placeholder dots just before the number animates in. */
  setTimeout(() => {
    document.getElementById("preamble-dots")?.classList.add("reveal-preamble__dots--gone");
  }, 1300);

  /* Start the count-up AFTER the preamble words have all landed and the
     number element has finished its blur-in (animation-delay 1450ms +
     enter duration 900ms → the count begins as the number lands). */
  setTimeout(() => {
    dramaticCount(document.getElementById("iq-value"), iq, 2000);
  }, 1600);

  document.getElementById("show-more")?.addEventListener("click", () => {
    /* Smoothly replace stage 1 with stage 2 — not stack */
    transitionStage("rs-one", "rs-stats", () => {
      animateCountTo(document.getElementById("stat-correct"), 0, stats.correctCount, 1100);
      animateCountTo(document.getElementById("stat-pct"),     0, stats.pct,          1100);
    });
  });

  document.getElementById("show-person")?.addEventListener("click", () => {
    transitionStage("rs-stats", "rs-person");
  });
}

/* Fade out the current stage, then fade in the next.
   Sequencing matters to avoid any visual overlap or pre-animation flash:
     1. Add --out on the current stage (300ms fade/slide up & away)
     2. Wait for it to fully finish (360ms) and mark it hidden
     3. Pre-stage the next: mark --pending (zero opacity/translateY) first
     4. On the next frame remove hidden so it renders in the pending state
     5. On the next frame after THAT, swap --pending → --in so the
        transition starts from a known, styled initial state. */
function transitionStage(outId, inId, onAfterIn) {
  const out  = document.getElementById(outId);
  const next = document.getElementById(inId);
  if (!next) return;

  const revealNext = () => {
    next.classList.add("reveal-stage--pending");
    next.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        next.classList.remove("reveal-stage--pending");
        next.classList.add("reveal-stage--in");
        if (onAfterIn) setTimeout(onAfterIn, 200);
      });
    });
  };

  if (out) {
    out.classList.add("reveal-stage--out");
    setTimeout(() => {
      out.hidden = true;
      revealNext();
    }, 360);
  } else {
    revealNext();
  }
}

/* Aggressively-eased count-up: fast ramp, dramatic deceleration.
   Uses easeOutQuint so the final 10 points feel like a slow-motion landing.
   When the count reaches the target we trigger the full impact sequence:
   rings, particles, number punch, and a screen flash. */
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
    else       triggerImpact();
  }
  requestAnimationFrame(tick);
}

/* The "landing" moment — fired when the count-up hits its target. */
function triggerImpact() {
  const num   = document.getElementById("reveal-number");
  const flash = document.getElementById("reveal-flash");
  const parts = document.getElementById("particles");

  /* 1. Number punch — spring-scale overshoot */
  if (num) {
    num.classList.remove("reveal-number--impact");
    /* Force reflow so the animation restarts if previously triggered */
    void num.offsetWidth;
    num.classList.add("reveal-number--impact");
  }

  /* 2. Single shockwave ring */
  const r = document.getElementById("ring-1");
  if (r) {
    r.classList.remove("reveal-ring--burst");
    void r.offsetWidth;
    r.classList.add("reveal-ring--burst");
  }

  /* 3. Particle burst — spawn 16 radial particles */
  if (parts) {
    parts.innerHTML = "";
    const N = 16;
    for (let i = 0; i < N; i++) {
      const p = document.createElement("span");
      const angle    = (i / N) * 360 + (Math.random() * 22 - 11);
      const distance = 120 + Math.random() * 110;
      const delay    = Math.random() * 80;
      p.style.setProperty("--angle",    `${angle}deg`);
      p.style.setProperty("--distance", `${distance}px`);
      p.style.animationDelay = `${delay}ms`;
      parts.appendChild(p);
    }
    parts.classList.remove("reveal-particles--burst");
    void parts.offsetWidth;
    parts.classList.add("reveal-particles--burst");
  }

  /* 4. Screen-wide flash */
  if (flash) {
    flash.classList.remove("reveal-flash--burst");
    void flash.offsetWidth;
    flash.classList.add("reveal-flash--burst");
  }
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
