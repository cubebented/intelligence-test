/* Landing page — generates & applies seeds, handles start. */

import { randomSeed } from "./rng.js";

const url = new URL(location.href);
const existingSeed = url.searchParams.get("t");

const seedInput = document.getElementById("seed-input");
const startBtn  = document.getElementById("start-btn");

const current = () => (seedInput.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function apply(seed) {
  seedInput.value = seed;
}

apply(existingSeed || randomSeed());

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function begin() {
  if (startBtn.disabled) return;
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
  if (e.key === "Enter") begin();
});
