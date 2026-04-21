/* Landing page — generates & applies seeds, captures age, handles start. */

import { randomSeed } from "./rng.js";

const url = new URL(location.href);
const existingSeed = url.searchParams.get("t");

const seedInput = document.getElementById("seed-input");
const startBtn  = document.getElementById("start-btn");
const ageInput  = document.getElementById("age-input");
const ageHint   = document.getElementById("age-hint");

const current = () => (seedInput.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function apply(seed) {
  seedInput.value = seed;
}

apply(existingSeed || randomSeed());

/* Pre-fill the age field if we have one from a previous run, and validate.
   The Begin button is disabled until age is a real number in [8, 99]. */
const savedAge = sessionStorage.getItem("iq_user_age");
if (savedAge) ageInput.value = savedAge;

function readAge() {
  const v = Number(ageInput.value);
  if (!Number.isFinite(v) || v < 8 || v > 99) return null;
  return Math.floor(v);
}

function refreshAgeUI() {
  const age = readAge();
  startBtn.disabled = age === null;
  if (age === null) {
    ageHint.textContent = "Enter an age between 8 and 99 to begin.";
    ageHint.classList.toggle("landing__age-hint--err", ageInput.value !== "");
  } else {
    const band =
      age <= 12 ? "10–12 · younger set"
    : age <= 15 ? "13–15 · middle set"
    : age <= 18 ? "16–18 · older teen set"
    :             "adult set";
    ageHint.textContent = `Questions adapt to your age · ${band}`;
    ageHint.classList.remove("landing__age-hint--err");
  }
}
ageInput.addEventListener("input", refreshAgeUI);
refreshAgeUI();

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function begin() {
  if (startBtn.disabled) return;
  const age = readAge();
  if (age === null) { ageInput.focus(); return; }
  sessionStorage.setItem("iq_user_age", String(age));
  startBtn.disabled = true;

  const seed = current() || randomSeed();
  sessionStorage.removeItem("iq_run_seed");

  /* 1 — Fade the landing page out */
  const landing = document.querySelector(".landing");
  landing.classList.add("landing--exit");

  /* 2 — Spawn the overlay on top */
  const overlay = document.createElement("div");
  overlay.className = "countdown-overlay";
  document.body.appendChild(overlay);

  await sleep(180);
  overlay.classList.add("countdown-overlay--visible");
  await sleep(200);

  /* 3 — 3 … 2 … 1, each "beat" is 1.5 real seconds */
  for (const n of [3, 2, 1]) {
    /* Replace inner span so the @keyframes re-triggers cleanly each beat */
    const span = document.createElement("span");
    span.className = "countdown-n";
    span.textContent = n;
    overlay.innerHTML = "";
    overlay.appendChild(span);
    await sleep(1500);
  }

  /* 4 — Go */
  location.href = `test.html?t=${seed}`;
}

startBtn.addEventListener("click", begin);

document.addEventListener("keydown", e => {
  /* Enter only begins when age is valid; otherwise nudge focus to the input */
  if (e.key !== "Enter") return;
  if (startBtn.disabled) { ageInput.focus(); return; }
  begin();
});
