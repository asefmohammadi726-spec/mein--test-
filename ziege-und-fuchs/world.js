// Die Seite: Wiese, Sonne mit Gesicht, Wolke, Blumen, der Busch. Weltkoordinaten 3200×1800 (ganze Seite = CAM s 0.6)
import { line, fill, dab, ellipse, handCircle, smooth } from './engine/crayon.js';
import { part } from './engine/rig.js';
import { PAL } from './pal.js';
import { hash, clamp } from '/core/lib.js';
const K = PAL.crayon;
export const pr = (t, a, b) => clamp((t - a) / (b - a));
export const GROUND = 1400;                       // Fußlinie der Figuren
export const groundY = x => 1338 + 14 * Math.sin(x * 0.0042 + 0.8) + 8 * Math.sin(x * 0.013);
export const BUSH = { x: 2400, y: 1210, rx: 330, ry: 230 };
export const FLOWER = [1585, 1362];               // die Blume, an der die Ziege knabbert

// p: Zeichenfortschritt {gl, gf (Wiese), sl, sf (Sonne), cl (Wolke), fl (Blumen)}; face: Sonnengesicht 0..1; nib: Blume angeknabbert
export function drawWorld(F, L, p, o = {}) {
  const bo = 0.6;
  // Wiese
  const top = []; for (let x = -80; x <= 3280; x += 60) top.push([x, groundY(x)]);
  fill(F, [...top, [3280, 1880], [-80, 1880]], { col: K.green, p: 0.66, gap: 13, w: 14, ang: 1.2, seed: 11, draw: p.gf, boil: 0, over: 10 });
  line(L, top, { w: 7, seed: 12, col: K.dgreen, p: 0.9, draw: p.gl, boil: bo });
  // Grasbüschel
  for (let i = 0; i < 30; i++) {
    const x = 40 + i * 108 + hash(i) * 50, y = 1460 + hash(i + 3) * 280;
    if (p.gf < 0.6) break;
    line(L, [[x - 12, y + 8], [x - 5, y - 14], [x + 1, y + 6], [x + 8, y - 13], [x + 14, y + 8]], { w: 4.5, seed: 20 + i, col: K.dgreen, p: 0.75, boil: bo, draw: (p.gf - 0.6) / 0.4 });
  }
  // Sonne mit Gesicht (Kinderlogik)
  const S = [470, 360, 118];
  fill(F, handCircle(S[0], S[1], S[2], 31, 0, 40), { col: K.yellow, p: 0.9, gap: 10, w: 12, seed: 32, draw: p.sf, boil: 0, cross: true, crossP: 0.5 });
  line(L, handCircle(S[0], S[1], S[2], 33, 0.1), { w: 7, col: K.rust, seed: 34, p: 0.9, draw: p.sl, boil: bo });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * 6.283 + 0.2, r0 = S[2] + 30, r1 = S[2] + (i % 2 ? 78 : 104);
    line(L, [[S[0] + Math.cos(a) * r0, S[1] + Math.sin(a) * r0], [S[0] + Math.cos(a) * r1, S[1] + Math.sin(a) * r1]], { w: 7, col: K.yellow, p: 0.95, seed: 40 + i, draw: clamp(p.sl * 12 - i), boil: bo });
  }
  if ((o.face ?? 0) > 0) {
    const f = o.face;
    dab(L, S[0] - 38, S[1] - 18, 9, { col: K.rust, p: f, seed: 60 });
    dab(L, S[0] + 38, S[1] - 18, 9, { col: K.rust, p: f, seed: 61 });
    line(L, o.sunWorried ? [[S[0] - 34, S[1] + 42], [S[0], S[1] + 32], [S[0] + 34, S[1] + 42]] : [[S[0] - 40, S[1] + 26], [S[0], S[1] + 50], [S[0] + 40, S[1] + 26]], { w: 6, col: K.rust, seed: 62, draw: f, boil: bo });
    dab(F, S[0] - 64, S[1] + 22, 14, { col: K.pink, p: 0.5 * f, seed: 63 });
    dab(F, S[0] + 64, S[1] + 22, 14, { col: K.pink, p: 0.5 * f, seed: 64 });
  }
  // Wolke
  const cloud = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * 6.283; const b = 1 + 0.16 * Math.abs(Math.sin(a * 3)); cloud.push([1380 + Math.cos(a) * 190 * b, 330 + Math.sin(a) * 70 * b]); }
  fill(F, cloud, { col: K.sky, p: 0.35, gap: 12, w: 13, ang: 0.3, seed: 70, draw: p.cl, boil: 0 });
  line(L, cloud, { w: 6, col: K.sky, p: 0.9, seed: 71, draw: p.cl, boil: bo });
  // Blumen: Mohn rot und gelb, eine davon an der Stelle, wo die Ziege knabbert
  const FL = [[320, 1470, K.red], [760, 1560, K.yellow], [1120, 1450, K.red], [FLOWER[0], FLOWER[1], K.yellow], [2780, 1520, K.red], [3020, 1460, K.yellow], [1900, 1640, K.red]];
  FL.forEach(([x, y, c], i) => {
    const d = clamp(p.fl * FL.length - i * 0.7);
    if (d <= 0) return;
    line(L, [[x, y + 50], [x + 3, y + 6]], { w: 5, col: K.dgreen, seed: 80 + i, boil: bo, draw: d });
    const bitten = i === 3 && o.nib;
    for (let k = 0; k < 5; k++) {
      if (bitten && k >= 3) continue;
      const a = k / 5 * 6.28; dab(F, x + Math.cos(a) * 13, y + Math.sin(a) * 13, 10, { col: c, p: 0.9 * d, seed: 90 + i * 5 + k, boil: 0 });
    }
    dab(F, x, y, 7, { col: K.orange, p: 0.95 * d, seed: 130 + i, boil: 0 });
  });
}

// Der Busch: eine eigene Gruppe, damit er den Fuchs dahinter verdeckt (Knock-out)
// o: lineDraw, fillDraw, shake (0..1 Rascheln), t (für die Raschel-Bewegung), open (0..1 teilt sich links), eyes (0..1 Augen im Dunkeln)
export function bush(C, o) {
  const { x, y, rx, ry } = BUSH;
  const sh = o.shake ?? 0, t = o.t ?? 0, op = o.open ?? 0;
  const st = Math.floor(t * 12);                   // Rascheln auf Zwölfteln, wie gezeichnet
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const a = i / 96 * 6.283;
    let r = 1 + 0.1 * Math.abs(Math.sin(a * 5.5)) + 0.04 * Math.sin(a * 13);
    r += sh * 0.05 * Math.sin(a * 7 + st * 2.1) * (hash(st * 0.37 + i * 0.01) * 0.8 + 0.4);
    // links teilt sich der Busch: eine Delle, aus der der Fuchs kommt
    const left = Math.max(0, -Math.cos(a)) * Math.max(0, Math.sin(a) + 0.3);
    r -= op * 0.22 * left;
    pts.push([x + Math.cos(a) * rx * r, Math.min(GROUND + 8, y + Math.sin(a) * ry * r)]);
  }
  part(C, pts, { col: K.dgreen, p: 1.05, gap: 9, w: 12, ang: 0.9, seed: 200, draw: o.fillDraw ?? 1, over: 8, cross: true, crossP: 0.75, boil: 1 + sh },
    { w: 8, col: K.dgreen, p: 1, seed: 201, draw: o.lineDraw ?? 1, boil: 1 + sh * 2 });
  // Blattkringel im Busch
  if ((o.fillDraw ?? 1) > 0.8) for (let i = 0; i < 9; i++) {
    const lx = x - 230 + (i % 3) * 200 + hash(i) * 70, ly = y - 140 + Math.floor(i / 3) * 110 + hash(i + 9) * 30;
    const j = sh * 6 * Math.sin(st * 1.7 + i);
    line(C.l, ellipse(lx + j, ly, 22, 12, 14, 0.3, 5.9, 0.4 + i), { w: 5, col: K.green, p: 0.85, seed: 210 + i, boil: 1 + sh });
  }
  // Augen im Dunkeln (weißes Wachs)
  if ((o.eyes ?? 0) > 0) [[x - 215, y + 40], [x - 165, y + 34]].forEach(([ex, ey], i) => {
    dab(C.l, ex, ey, 11 * o.eyes, { col: K.white, p: 1, seed: 230 + i, gap: 3, w: 5, sq: o.eyes });
    dab(C.l, ex - 3, ey + 1, 5 * o.eyes, { col: K.ink, p: 1, seed: 232 + i, gap: 2, w: 3 });
  });
}

// fliegende Blätter beim Rascheln
export function leaves(L, t, t0, n = 4, big = 1) {
  const u = (t - t0) / 0.9; if (u < 0 || u > 1) return;
  const q = Math.floor(u * 0.9 * 12) / (0.9 * 12);
  for (let i = 0; i < n; i++) {
    const a = -2.0 + i * 0.5 + hash(t0 + i) * 0.4;
    const d = (120 + 140 * hash(t0 * 3 + i)) * big * q;
    const lx = BUSH.x - 60 + Math.cos(a) * (200 + d), ly = BUSH.y - 60 + Math.sin(a) * (120 + d) + 260 * q * q;
    fill(L, ellipse(lx, ly, 14, 7, 12, 0, 6.3, a + q * 6), { col: K.dgreen, p: 0.95 * (1 - q * 0.5), gap: 3, w: 5, seed: 300 + i });
  }
}
