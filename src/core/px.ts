// A small pixel surface and the primitives every sprite is drawn with.
//
// Deliberately NOT canvas2d paths. Canvas anti-aliases, and a single
// anti-aliased edge anywhere in a pixel-art scene reads as a mistake —
// it introduces colours that are not in the palette, which is the one
// rule the whole look depends on. Everything here writes whole pixels
// into an RGBA buffer and nothing ever blends.
//
// The one exception is `blend`, used for the soft shadow under objects,
// where a deliberate half-tone is wanted.

export class Px {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  private static parse(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  set(x: number, y: number, hex: string): void {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = Px.parse(hex);
    const i = (y * this.w + x) * 4;
    this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
  }

  /**
   * Rub a pixel out.
   *
   * Needed because some shapes are easier to describe as a
   * subtraction than as a drawing — a crescent moon is one disc minus
   * another, and cutting it that way gives a true arc where drawing it
   * by hand gives a banana.
   */
  clear(x: number, y: number): void {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = 0; this.data[i + 1] = 0; this.data[i + 2] = 0; this.data[i + 3] = 0;
  }

  /** Alpha-composite a colour — only for soft shadows, never for edges. */
  blend(x: number, y: number, hex: string, a: number): void {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = Px.parse(hex);
    const i = (y * this.w + x) * 4;
    const dst = this.data[i + 3] / 255;
    const out = a + dst * (1 - a);
    this.data[i] = (r * a + this.data[i] * dst * (1 - a)) / out;
    this.data[i + 1] = (g * a + this.data[i + 1] * dst * (1 - a)) / out;
    this.data[i + 2] = (b * a + this.data[i + 2] * dst * (1 - a)) / out;
    this.data[i + 3] = out * 255;
  }

  /**
   * Rewrite every colour in the buffer through a function.
   *
   * This is how the time of day works: each pixel steps along the ramp
   * it already belongs to, so a night scene is still strictly inside
   * the palette. ART-DIRECTION.md's rule, applied to the clock instead
   * of to the seasons — night is not a blue filter over daytime, it is
   * the same sprites reading a different row of the same table, which
   * is why it looks authored rather than filtered.
   */
  remap(fn: (hex: string) => string): void {
    const hex = (n: number): string => n.toString(16).padStart(2, '0');
    const seen = new Map<string, [number, number, number]>();
    for (let i = 0; i < this.data.length; i += 4) {
      if (this.data[i + 3] < 8) continue;
      const key = `#${hex(this.data[i])}${hex(this.data[i + 1])}${hex(this.data[i + 2])}`;
      let out = seen.get(key);
      if (!out) {
        const c = fn(key);
        const n = parseInt(c.slice(1), 16);
        out = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        seen.set(key, out);
      }
      this.data[i] = out[0];
      this.data[i + 1] = out[1];
      this.data[i + 2] = out[2];
    }
  }

  get(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.data[((y | 0) * this.w + (x | 0)) * 4 + 3] > 8;
  }

  rect(x: number, y: number, w: number, h: number, hex: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, hex);
  }

  /** Bresenham. Used for roof edges, masts, fences — anything straight. */
  line(x0: number, y0: number, x1: number, y1: number, hex: string): void {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, hex);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled ellipse, scanline — for canopies, heads, bushes. */
  ellipse(cx: number, cy: number, rx: number, ry: number, hex: string): void {
    for (let y = -ry; y <= ry; y++) {
      const t = 1 - (y * y) / (ry * ry);
      if (t < 0) continue;
      const half = Math.sqrt(t) * rx;
      for (let x = -Math.round(half); x <= Math.round(half); x++) this.set(cx + x, cy + y, hex);
    }
  }

  /** An isometric diamond: the shape of one ground tile's top face. */
  diamond(cx: number, cy: number, w: number, h: number, hex: string): void {
    const hw = w / 2, hh = h / 2;
    for (let y = -hh; y < hh; y++) {
      const f = 1 - Math.abs(y + 0.5) / hh;
      const half = Math.floor(hw * f);
      for (let x = -half; x < half; x++) this.set(cx + x, cy + y, hex);
    }
  }

  /**
   * A checkerboard of `hex` over whatever is already there. The classic
   * pixel-art gradient: two ramp steps dithered together read as a third
   * without adding a colour to the palette.
   */
  dither(x: number, y: number, w: number, h: number, hex: string, phase = 0): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (((x + i + y + j + phase) & 1) === 0) continue;
        if (!this.get(x + i, y + j)) continue;      // never dither onto nothing
        this.set(x + i, y + j, hex);
      }
    }
  }

  /**
   * Outline everything opaque with the ink, on the outside. Selective:
   * only where a pixel borders empty space, so interior detail keeps its
   * own colours and the sprite reads as drawn rather than as traced.
   */
  outline(hex: string): void {
    const src = new Uint8ClampedArray(this.data);
    const opaque = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < this.w && y < this.h && src[(y * this.w + x) * 4 + 3] > 8;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (opaque(x, y)) continue;
        if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
          this.set(x, y, hex);
        }
      }
    }
  }

  /**
   * Rim the sprite the way a pixel artist does, which is NOT a black
   * line all the way round.
   *
   * A uniform ink outline is the single loudest "drawn in Paint" signal
   * available: it flattens every object to a sticker, throws away the
   * light direction, and makes a tree and a house look like the same
   * kind of thing. What real pixel art does instead is shade the edge —
   * a darker step of the object's OWN colour along the lit side, so the
   * form keeps reading, and true ink only where it meets the ground or
   * turns away from the light entirely.
   *
   * `darken` maps a colour to its own darker step, supplied by the
   * caller because only the sprite knows which ramp it was drawn from.
   */
  rim(darken: (hex: string) => string, ink: string): void {
    const src = new Uint8ClampedArray(this.data);
    const opaque = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < this.w && y < this.h && src[(y * this.w + x) * 4 + 3] > 8;
    const colAt = (x: number, y: number): string => {
      const i = (y * this.w + x) * 4;
      const h = (n: number): string => n.toString(16).padStart(2, '0');
      return `#${h(src[i])}${h(src[i + 1])}${h(src[i + 2])}`;
    };
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (opaque(x, y)) continue;
        const up = opaque(x, y - 1), down = opaque(x, y + 1);
        const lf = opaque(x - 1, y), rt = opaque(x + 1, y);
        if (!(up || down || lf || rt)) continue;
        // Light is upper-left. The underside and the right are turned
        // away, so they take ink; the top and the left take a shaded
        // step of whatever colour they are bordering.
        if (up || lf) {
          const src2 = up ? colAt(x, y - 1) : colAt(x - 1, y);
          this.set(x, y, darken(src2));
        } else {
          this.set(x, y, ink);
        }
      }
    }
  }

  /**
   * Soften the staircase on curves by inserting a mid pixel at inside
   * corners. This is what pixel artists do by hand and call "AA", and
   * without it every round canopy reads as a flight of steps.
   *
   * Only inside corners, and only one pixel deep: overdo it and the
   * sprite goes blurry, which looks worse than the staircase did.
   */
  antialias(mid: (a: string, b: string) => string): void {
    const src = new Uint8ClampedArray(this.data);
    const at = (x: number, y: number): string | null => {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
      const i = (y * this.w + x) * 4;
      if (src[i + 3] < 8) return null;
      const h = (n: number): string => n.toString(16).padStart(2, '0');
      return `#${h(src[i])}${h(src[i + 1])}${h(src[i + 2])}`;
    };
    for (let y = 1; y < this.h - 1; y++) {
      for (let x = 1; x < this.w - 1; x++) {
        const c = at(x, y);
        if (!c) continue;
        // a step is a pixel whose two orthogonal neighbours on one side
        // differ from it while the diagonal between them matches
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
          const h = at(x + dx, y), v = at(x, y + dy);
          if (h && v && h === v && h !== c) {
            this.set(x, y, mid(c, h));
            break;
          }
        }
      }
    }
  }

  /** A soft contact shadow, drawn UNDER a sprite by the renderer. */
  static shadow(w: number, h: number, hex: string): Px {
    const p = new Px(w, h);
    const cx = w / 2, cy = h / 2, rx = w / 2 - 1, ry = h / 2 - 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        p.blend(x, y, hex, 0.30 * (1 - d) + 0.06);
      }
    }
    return p;
  }

  toCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    // willReadFrequently on every SOURCE canvas, not only the frame
    // buffer. The buffer is CPU-pinned; a plain-context source lives on
    // the GPU in real Chrome, and drawing a GPU canvas into a CPU canvas
    // is a GPU-to-CPU readback PER drawImage, thousands of times a
    // frame. That was the difference between 17ms in the all-software
    // harness and 194ms on Patrick's machine: the harness never pays for
    // mixed surfaces, real Chrome always does. CPU-to-CPU is a memcpy.
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

/** Deterministic per-sprite randomness, so a house always looks the same. */
export function rand(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a ^= a << 13; a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5; a >>>= 0;
    return a / 4294967296;
  };
}
