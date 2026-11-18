// Bölüm 2'nin sayfası: birinci filmle aynı çayır ve çalı, solda yeni bir tepe, batan güneş,
// beyaz mumla çizilmiş gizli pati izleri, üç suluboya bandı. Dünya koordinatları 3200×1800.
import { line, fill, dab, ellipse, handCircle, CAM, W, H } from './engine/crayon.js';
import { part } from './engine/rig.js';
import { PAL } from './pal.js';
import { hash, clamp, lerp, mulberry } from '/core/lib.js';
const K = PAL.crayon;
export const pr = (t, a, b) => clamp((t - a) / (b - a));
export const FOOT = 62;                                    // figürlerin ayakları çizginin bu kadar altında
const base = x => 1338 + 14 * Math.sin(x * 0.0042 + 0.8) + 8 * Math.sin(x * 0.013);
export const HILL = { x: 650, h: 330, w: 620 };
export const groundY = x => base(x) - HILL.h * Math.exp(-(((x - HILL.x) / HILL.w) ** 2));
export const slope = x => (groundY(x + 20) - groundY(x - 20)) / 40;
export const BUSH = { x: 2400, y: 1210, rx: 330, ry: 230 };
export const SUN = { x: 470, r: 118 };
export const sunY = t => lerp(360, 1260, clamp((t - 2.0) / 8.0) ** 1.3);

// pati izleri: çalının önünden tepenin üstüne
export const PRINTS = [];
{
  const n = 22;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), x = lerp(2230, 760, u);
    const side = i % 2 ? 1 : -1;
    PRINTS.push({ x, y: groundY(x) + 52 + side * 14, a: Math.atan(slope(x)), i });
  }
}

// p: {hillF: tepe çiçeklerinin çizim ilerlemesi}
export function drawWorld(F, L) {
  const bo = 0.6;
  // çayır ve tepe
  const xr = -80;
  const top = []; for (let x = 3280; x >= -80; x -= 40) if (x >= xr) top.push([x, groundY(x)]);
  if (top.length > 1) {
    fill(F, [...top, [xr, 1880], [3280, 1880]], { col: K.green, p: 0.66, gap: 13, w: 14, ang: 1.2, seed: 11, boil: 0, over: 10 });
    line(L, top, { w: 7, seed: 12, col: K.dgreen, p: 0.9, boil: bo });
  }
  for (let i = 0; i < 30; i++) {
    const x = 40 + i * 108 + hash(i) * 50, y = groundY(x) + 120 + hash(i + 3) * 260;
    if (x < xr) continue;
    line(L, [[x - 12, y + 8], [x - 5, y - 14], [x + 1, y + 6], [x + 8, y - 13], [x + 14, y + 8]], { w: 4.5, seed: 20 + i, col: K.dgreen, p: 0.75, boil: bo });
  }
  // çiçekler (birinci filmdekiler, tepeye düşenler hariç); ısırılan çiçek yine ısırılmış
  [[1120, 1450, K.red], [1585, 1362, K.yellow, true], [2780, 1520, K.red], [3020, 1460, K.yellow], [1900, 1640, K.red]].forEach(([x, y, c, bit], i) => {
    if (x < xr) return;
    line(L, [[x, y + 50], [x + 3, y + 6]], { w: 5, col: K.dgreen, seed: 80 + i, boil: bo });
    for (let k = 0; k < 5; k++) { if (bit && k >= 3) continue; const a = k / 5 * 6.28; dab(F, x + Math.cos(a) * 13, y + Math.sin(a) * 13, 10, { col: c, p: 0.9, seed: 90 + i * 5 + k, boil: 0 }); }
    dab(F, x, y, 7, { col: K.orange, p: 0.95, seed: 130 + i, boil: 0 });
  });
  // bulut
  const cloud = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * 6.283; const b = 1 + 0.16 * Math.abs(Math.sin(a * 3)); cloud.push([1380 + Math.cos(a) * 190 * b, 330 + Math.sin(a) * 70 * b]); }
  fill(F, cloud, { col: K.sky, p: 0.35, gap: 12, w: 13, ang: 0.3, seed: 70, boil: 0 });
  line(L, cloud, { w: 6, col: K.sky, p: 0.9, seed: 71, boil: bo });
}

// tepe çiçekleri: yürüyenlerin hemen önünde çiziliyor (drawn live); suluboyadan sonra, en üst katmanda
export function hillFlowers(F, L, hillF) {
  [[1330, K.pink], [1150, K.yellow], [980, K.red], [820, K.pink], [700, K.yellow]].forEach(([x, c], i) => {
    const d = (hillF || [])[i] ?? 0; if (d <= 0) return;
    const y = groundY(x) + 30;
    line(L, [[x, y + 46], [x + 3, y + 4]], { w: 5, col: K.dgreen, seed: 160 + i, boil: 0.6, draw: clamp(d * 2) });
    if (d > 0.5) for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; dab(F, x + Math.cos(a) * 12, y + Math.sin(a) * 12, 9, { col: c, p: 0.9 * clamp(d * 2 - 1), seed: 170 + i * 5 + k, boil: 0 }); }
  });
}

// güneş: esner, tepenin arkasına iner (çizginin altında kalan kısmı kesilir)
export function drawSun(F, L, t) {
  const cy = sunY(t), cx = SUN.x + (cy - 360) * 0.12, R = SUN.r;
  if (cy - R > 1400) return;
  const clipY = x => groundY(x) - 4;
  const cut = pts => pts.map(([x, y]) => [x, Math.min(y, clipY(x))]);
  fill(F, cut(handCircle(cx, cy, R, 31, 0, 40)), { col: K.yellow, p: 0.9, gap: 10, w: 12, seed: 32, boil: 0, cross: true, crossP: 0.5 });
  const ring = handCircle(cx, cy, R, 33, 0.1).filter(([x, y]) => y < clipY(x));
  if (ring.length > 2) line(L, ring, { w: 7, col: K.rust, seed: 34, p: 0.9, boil: 0.6 });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * 6.283 + 0.2, r0 = R + 30, r1 = R + (i % 2 ? 78 : 104);
    const a0 = [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], a1 = [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1];
    if (a1[1] < clipY(a1[0]) && a0[1] < clipY(a0[0])) line(L, [a0, a1], { w: 7, col: K.yellow, p: 0.95, seed: 40 + i, boil: 0.6 });
  }
  // yüz: 1,0–2,2 esner, sonra uykulu gözler
  const yawn = t > 1.0 && t < 2.2 ? Math.sin(pr(t, 1.0, 2.2) * Math.PI) : 0;
  const ok = (x, y) => y < clipY(x) - 8;
  const eyes = [[cx - 38, cy - 18], [cx + 38, cy - 18]];
  eyes.forEach(([x, y], i) => { if (!ok(x, y)) return; if (t > 2.2 || yawn > 0.3) line(L, [[x - 14, y], [x, y + 8], [x + 14, y]], { w: 6, col: K.rust, seed: 60 + i, boil: 0.6 }); else dab(L, x, y, 9, { col: K.rust, p: 1, seed: 60 + i }); });
  if (ok(cx, cy + 40)) {
    if (yawn > 0.05) line(L, ellipse(cx, cy + 38, 16 + 8 * yawn, 10 + 22 * yawn, 20), { w: 6, col: K.rust, seed: 62, boil: 0.6 });
    else line(L, [[cx - 40, cy + 26], [cx, cy + 50], [cx + 40, cy + 26]], { w: 6, col: K.rust, seed: 62, boil: 0.6 });
  }
}

// çalı (birinci filmle aynı)
export function bush(C, o = {}) {
  const { x, y, rx, ry } = BUSH; const sh = o.shake ?? 0, st = Math.floor((o.t ?? 0) * 12);
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const a = i / 96 * 6.283;
    let r = 1 + 0.1 * Math.abs(Math.sin(a * 5.5)) + 0.04 * Math.sin(a * 13) + sh * 0.05 * Math.sin(a * 7 + st * 2.1);
    pts.push([x + Math.cos(a) * rx * r, Math.min(1408, y + Math.sin(a) * ry * r)]);
  }
  part(C, pts, { col: K.dgreen, p: 1.05, gap: 9, w: 12, ang: 0.9, seed: 200, over: 8, cross: true, crossP: 0.75, boil: 1 }, { w: 8, col: K.dgreen, p: 1, seed: 201, boil: 1 });
  for (let i = 0; i < 9; i++) {
    const lx = x - 230 + (i % 3) * 200 + hash(i) * 70, ly = y - 140 + Math.floor(i / 3) * 110 + hash(i + 9) * 30;
    line(C.l, ellipse(lx, ly, 22, 12, 14, 0.3, 5.9, 0.4 + i), { w: 5, col: K.green, p: 0.85, seed: 210 + i });
  }
}

// beyaz mum pati izleri: filmin başından beri sayfada, suluboyadan önce neredeyse görünmez
export function drawPrints(L, p = 0.75) {
  for (const P of PRINTS) {
    const c = Math.cos(P.a - Math.PI / 2), s = Math.sin(P.a - Math.PI / 2);
    const at = (dx, dy) => [P.x + dx * Math.cos(P.a) - dy * Math.sin(P.a), P.y + dx * Math.sin(P.a) + dy * Math.cos(P.a)];
    const pad = at(0, 4); dab(L, pad[0], pad[1], 9, { col: K.white, p, seed: 600 + P.i, gap: 3, w: 4, sq: 0.8, boil: 0.2 });
    [[-11, -9], [-4, -15], [4, -15], [11, -9]].forEach(([dx, dy], k) => { const q = at(dx, dy); dab(L, q[0], q[1], 4.2, { col: K.white, p, seed: 620 + P.i * 4 + k, gap: 2, w: 3, boil: 0.2 }); });
  }
}
// toynak izleri (keçi eve koşarken): xs = bırakılmış izlerin x'leri
export function drawHoofPrints(L, xs) {
  xs.forEach((x, i) => {
    const y = groundY(x) + 58 + (i % 2 ? 10 : -6);
    dab(L, x - 6, y, 6, { col: K.brown, p: 0.85, seed: 700 + i * 2, gap: 2.5, w: 3.5, sq: 1.4 });
    dab(L, x + 6, y, 6, { col: K.brown, p: 0.85, seed: 701 + i * 2, gap: 2.5, w: 3.5, sq: 1.4 });
  });
}

// suluboya: üç bant, soldan sağa (sağdan sola) — akşam çöküyor
export const BANDS = [
  { y0: -160, y1: 700, t0: 12.0, t1: 14.4, dir: 1, seed: 1 },
  { y0: 600, y1: 1180, t0: 14.2, t1: 16.8, dir: -1, seed: 2 },
  { y0: 1080, y1: 1900, t0: 16.6, t1: 19.4, dir: 1, seed: 3 },
];
const X0 = -260, X1 = 3460;
export function bandFront(b, t) { const u = clamp((t - b.t0) / (b.t1 - b.t0)); const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; const v = 0.15 * u + 0.85 * e; return b.dir > 0 ? lerp(X0, X1, v) : lerp(X1, X0, v); }
export function printRevealT(P) {   // bir izin üstünden ıslak ön kenarın geçtiği an
  const b = BANDS.find(b => P.y >= b.y0 && P.y <= b.y1) || BANDS[2];
  for (let k = 0; k <= 200; k++) { const t = b.t0 + (b.t1 - b.t0) * k / 200; const f = bandFront(b, t); if (b.dir > 0 ? f >= P.x : f <= P.x) return t; }
  return b.t1;
}
export function drawWash(LW, t) {
  const g = LW.g; g.save();
  g.setTransform(CAM.s, 0, 0, CAM.s, W / 2 - CAM.x * CAM.s, H / 2 - CAM.y * CAM.s);
  for (const b of BANDS) {
    if (t < b.t0) continue;
    const f = bandFront(b, t), moving = t < b.t1;
    const top = [], bot = [];
    for (let x = X0; x <= X1; x += 40) {
      top.push([x, b.y0 + 12 * (Math.sin(x * 0.006 + b.seed) + 0.6 * Math.sin(x * 0.017 + b.seed * 3)) + 12 * hash(x * 0.37 + b.seed)]);
      bot.push([x, b.y1 + 14 * (Math.sin(x * 0.005 + b.seed * 2) + 0.5 * Math.sin(x * 0.019 + b.seed)) + 14 * hash(x * 0.71 + b.seed)]);
    }
    const frontX = y => f + b.dir * 70 * Math.sin(clamp((y - b.y0) / (b.y1 - b.y0)) * Math.PI) + 12 * Math.sin(y * 0.05);
    g.save(); g.beginPath();
    if (b.dir > 0) { g.moveTo(X0 - 50, b.y0 - 200); for (let y = b.y0 - 200; y <= b.y1 + 200; y += 20) g.lineTo(frontX(y), y); g.lineTo(X0 - 50, b.y1 + 200); }
    else { g.moveTo(X1 + 50, b.y0 - 200); for (let y = b.y0 - 200; y <= b.y1 + 200; y += 20) g.lineTo(frontX(y), y); g.lineTo(X1 + 50, b.y1 + 200); }
    g.closePath(); g.clip();
    const shape = new Path2D(); top.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); for (let i = bot.length - 1; i >= 0; i--) shape.lineTo(bot[i][0], bot[i][1]); shape.closePath();
    g.fillStyle = '#000'; g.globalAlpha = 0.72; g.fill(shape);
    g.save(); g.clip(shape);
    const R = mulberry(b.seed * 97);
    for (let i = 0; i < 26; i++) {
      const yy = lerp(b.y0, b.y1, R()), wdt = 6 + R() * 30, dark = R() < 0.55;
      g.beginPath(); for (let x = X0; x <= X1; x += 60) { const y = yy + 14 * Math.sin(x * 0.002 + i) + 6 * Math.sin(x * 0.01 + i * 2); x === X0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.lineWidth = dark ? wdt : wdt * 0.5; g.globalCompositeOperation = dark ? 'source-over' : 'destination-out'; g.globalAlpha = dark ? 0.08 + R() * 0.08 : 0.05 + R() * 0.07; g.strokeStyle = '#000'; g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); for (let y = b.y0 - 80; y <= b.y1 + 80; y += 16) { const x = frontX(y) - b.dir * 14; y === b.y0 - 80 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.lineWidth = moving ? 34 : 22; g.globalAlpha = moving ? 0.3 : 0.14; g.stroke();
    g.restore(); g.restore();
  }
  g.restore();
}
