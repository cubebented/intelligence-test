/* Mental Rotation — interactive drag-to-rotate 3D cube.
   A TARGET cube is shown at a fixed orientation (non-interactive).
   User drags their own cube to match it. Correct if within tolerance.

   This is the core anti-AI mechanic: requires mouse drag & spatial matching. */

import { svgRoot, CUBE_GLYPHS } from "../svg.js";

function faceSvg(glyphKey) {
  return svgRoot(CUBE_GLYPHS[glyphKey](), { vb: "0 0 100 100" });
}

/* Snap an angle to [-180, 180] */
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

/* Circular distance between two angles in degrees */
const angDist = (a, b) => Math.abs(wrap(a - b));

export function generate(rng) {
  /* Six distinct glyphs, shuffle which face gets which */
  const glyphs = rng.shuffle(["A", "B", "C", "D", "E", "F"]);
  const faces = {
    front:  glyphs[0], back:   glyphs[1],
    right:  glyphs[2], left:   glyphs[3],
    top:    glyphs[4], bottom: glyphs[5],
  };

  /* Pick a non-trivial target orientation */
  const targetX = rng.pick([-90, -60, -30, 30, 60, 90]);
  const targetY = rng.pick([-120, -60, 60, 120, 180]);

  const tolerance = 18;  /* degrees */
  let userX = 0, userY = 0;
  let answered = false;

  const renderCube = (rx, ry, id) => {
    const facesHtml = Object.entries(faces).map(([k, g]) =>
      `<div class="cube__face cube__face--${k}">${faceSvg(g)}</div>`
    ).join("");
    return `<div class="cube ${id === "target" ? "cube--fixed" : ""}"
                 id="${id}"
                 style="transform: rotateX(${rx}deg) rotateY(${ry}deg);">
              ${facesHtml}
            </div>`;
  };

  return {
    type: "rotation",
    category: "Mental Rotation",
    prompt: "Drag the right cube to match the orientation of the left cube. Release when the faces line up.",

    render() {
      return `
        <div class="rotation">
          <div class="rotation__stage">
            <span class="rotation__label">Target</span>
            ${renderCube(targetX, targetY, "target")}
          </div>
          <div class="rotation__stage">
            <span class="rotation__label">Yours · drag to rotate</span>
            ${renderCube(0, 0, "user-cube")}
          </div>
        </div>
        <div class="rotation__readout">
          <p class="eyebrow" style="margin-top:var(--s-6);text-align:center;">
            <span id="rot-status">ROTATE · tolerance ±${tolerance}°</span>
          </p>
        </div>
      `;
    },

    attach(root, onAnswer) {
      const cube = root.querySelector("#user-cube");
      const status = root.querySelector("#rot-status");
      if (!cube) return;

      let dragging = false;
      let startX = 0, startY = 0;
      let baseRX = 0, baseRY = 0;
      let lockedAngles = null;

      const update = () => {
        cube.style.transform = `rotateX(${userX}deg) rotateY(${userY}deg)`;
        const dx = angDist(userX, targetX);
        const dy = angDist(userY, targetY);
        const close = dx <= tolerance && dy <= tolerance;
        if (close && !answered) {
          answered = true;
          lockedAngles = { x: userX, y: userY };
          cube.classList.add("cube--match");
          status.textContent = `MATCHED · lock-in committed`;
          status.style.color = "var(--accent)";
          onAnswer(lockedAngles);
        } else if (!answered) {
          status.textContent = `ROTATE · ΔX ${dx.toFixed(0)}° · ΔY ${dy.toFixed(0)}°`;
          status.style.color = "";
        } else {
          status.textContent = `MATCHED ✓ · press NEXT to continue`;
          status.style.color = "var(--accent)";
        }
      };

      const down = (e) => {
        dragging = true;
        cube.setPointerCapture?.(e.pointerId);
        const p = e.touches ? e.touches[0] : e;
        startX = p.clientX;
        startY = p.clientY;
        baseRX = userX;
        baseRY = userY;
        e.preventDefault();
      };
      const move = (e) => {
        if (!dragging) return;
        const p = e.touches ? e.touches[0] : e;
        const dx = p.clientX - startX;
        const dy = p.clientY - startY;
        userY = baseRY + dx * 0.6;   /* horizontal drag → Y */
        userX = baseRX - dy * 0.6;   /* vertical drag   → X */
        update();
      };
      const up = () => { dragging = false; };

      cube.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      cube.addEventListener("touchstart", down, { passive: false });
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("touchend", up);
    },

    restore(root, { answer: savedAnswer } = {}) {
      const a = savedAnswer ?? (answered ? { x: userX, y: userY } : null);
      if (!a) return;
      const cube = root.querySelector("#user-cube");
      const status = root.querySelector("#rot-status");
      if (cube) {
        cube.style.transform = `rotateX(${a.x}deg) rotateY(${a.y}deg)`;
        cube.classList.add("cube--fixed");
      }
      if (status) {
        status.textContent = "LOCKED ✓";
        status.style.color = "var(--accent)";
      }
    },

    getAnswer: () => answered ? { x: userX, y: userY } : null,
    hasAnswer: () => answered,
    evaluate: (a) => {
      if (!a) return false;
      return angDist(a.x, targetX) <= tolerance && angDist(a.y, targetY) <= tolerance;
    },
    correctAnswer: () => `X ${targetX}°, Y ${targetY}°`,
  };
}
