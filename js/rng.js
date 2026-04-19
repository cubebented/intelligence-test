/* Seeded random (mulberry32) + helpers.
   Export-style ES modules. Every generator takes an RNG, never Math.random —
   so the same seed always reproduces the same instance.                        */

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function strToSeed(str) {
  let h = 2166136261 >>> 0;          // FNV-1a basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

export function randomSeed() {
  const a = Math.floor(Math.random() * 4294967295);
  return (a >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
}

export class RNG {
  constructor(seed) {
    this.seed = typeof seed === "string" ? strToSeed(seed) : (seed >>> 0);
    this.next = mulberry32(this.seed);
  }
  /** float in [0,1) */
  r()                    { return this.next(); }
  /** integer in [min,max) inclusive of min, exclusive of max */
  int(min, max)          { return Math.floor(this.next() * (max - min)) + min; }
  /** integer in [0,n) */
  n(n)                   { return Math.floor(this.next() * n); }
  /** pick a random element */
  pick(arr)              { return arr[this.n(arr.length)]; }
  /** true with prob p */
  bool(p = 0.5)          { return this.next() < p; }
  /** sign: -1 or 1 */
  sign()                 { return this.bool() ? 1 : -1; }
  /** Fisher-Yates shuffle (returns new array) */
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.n(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** pick k distinct items from arr */
  sample(arr, k) {
    return this.shuffle(arr).slice(0, k);
  }
  /** branching sub-rng so nested generation stays deterministic */
  branch(tag = "") {
    const s = (this.seed + strToSeed(tag)) >>> 0;
    return new RNG(s);
  }
}
