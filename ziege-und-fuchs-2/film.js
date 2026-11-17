// Bölüm 2: zaman çizelgesi, kamera, karakter durumları, olaylar, kompozisyon. 96 BPM, 4/4, ölçü = 2,5 sn.
import { layer, clear, line, fill, dab, handCircle, smooth, CAM, BOIL } from './engine/crayon.js';
import { group, clearGroup } from './engine/rig.js';
import { goat, fox } from './chars.js';
import { drawWorld, drawSun, bush, drawPrints, drawHoofPrints, drawWash, hillFlowers, printRevealT, PRINTS, BANDS, groundY, slope, FOOT, pr } from './world.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash, track, eo, eio, ss } from '/core/lib.js';
const K = PAL.crayon;
export const DUR = 45;
export const BPM = 96, BEAT = 60 / BPM;

// —— kamera ——
const camT = track([
  [0, [1600, 920, 0.62]], [0.8, [1600, 920, 0.62]], [4.6, [1690, 1170, 1.12]],          // 1: birinci filmin son karesi → ikili
  [11.6, [1680, 1150, 1.12]], [12.6, [1550, 990, 0.66]], [19.4, [1550, 990, 0.66]],     // 2–3: orta plan, sonra geniş (fırça)
  [20.6, [1700, 1130, 1.05]], [30.0, [1420, 1090, 1.05]],                               // 4: takip
  [33.0, [820, 980, 1.3]],                                                              // 5: siluete push
  [35.0, [900, 1010, 1.0]], [41.8, [920, 1010, 1.0]], [45.0, [1600, 920, 0.62]],        // 6–7: üçlü, sonra tam sayfa
]);

// —— konumlar ——
const G0 = 1560, G1 = 1250, G2 = 1960;            // keçi: başlangıç, tepe önü, eve dönüş
const F0 = 1900, F1 = 1640, F2 = 870;             // yavru tilki
const MOM = 450;                                   // anne tilki
const at = x => groundY(x) + FOOT;
const tilt = x => Math.atan(slope(x)) * 0.8;
const HOPS = [0, 1, 2, 3, 4, 5].map(i => 41.5 + i * 0.5);   // keçinin eve zıplayışları
const hopX = i => lerp(G1, G2, (i + 1) / HOPS.length);

// —— olaylar ——
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
ev(0, 'room'); ev(0, 'crickets', { dur: 45 });
ev(1.0, 'yawn', { pan: -0.6 });
ev(3.2, 'droop', { pan: 0.2 });
ev(5.0, 'scratch', { dur: 1.2, pan: -0.1 }); ev(6.2, 'scratch', { dur: 1.0, pan: -0.1 });
[7.5, 8.0, 8.5, 9.0].forEach(t => ev(t, 'sniff', { pan: 0.2 }));
[10.6, 11.0].forEach(t => ev(t, 'stomp', { pan: -0.1 }));
BANDS.forEach(b => ev(b.t0, 'brush', { dur: b.t1 - b.t0, dir: b.dir }));
PRINTS.forEach(P => ev(printRevealT(P), 'glint', { i: P.i, pan: clamp((P.x - 1550) / 1400, -1, 1) * 0.8 }));
ev(12.0, 'wind', { dur: 8 });
for (let t = 20.25; t < 30; t += 0.5) { ev(t, 'hoof', { pan: -0.1, g: 0.55 }); ev(t + 0.25, 'paw', { pan: 0.2, g: 0.6 }); }
[0, 1, 2, 3, 4].forEach(i => ev(22 + i * 1.6, 'scratch', { dur: 0.5, pan: -0.3, g: 0.6 }));
ev(26.0, 'twinkle', { pan: -0.3 });
ev(30.0, 'wind', { dur: 3.5 });
ev(31.2, 'blinkeyes', { pan: -0.4 }); ev(31.4, 'tick', { pan: 0, g: 1.4 });
ev(33.0, 'scribble', { dur: 1.4, pan: -0.4 });
[34.7, 35.1, 35.5, 35.9].forEach(t => ev(t, 'paw', { pan: -0.2 }));
ev(36.2, 'rub', { pan: -0.3 });
ev(37.0, 'scribble', { dur: 0.8, pan: -0.3, g: 0.7 });
ev(38.5, 'scribble', { dur: 0.6, pan: 0.1, g: 0.5 });
[40.1, 40.4, 40.7].forEach(t => ev(t, 'swish', { pan: -0.3 }));
ev(40.6, 'bell', { pan: 0.8 }); ev(41.6, 'bell', { pan: 0.8, g: 0.8 });
HOPS.forEach(t => ev(t + 0.36, 'hoof', { pan: 0.3, g: 0.7 }));
[['A', 0], ['B', 5], ['C', 12], ['D', 20], ['E', 30], ['F', 33], ['G', 40]].forEach(([id, t]) => ev(t, 'cue', { id }));

// —— keçi ——
function goatState(t) {
  const o = { x: G0, y: at(G0), s: 1.5, seed: 100, pose: 'stand', ear: 'down', eye: 'happy', blush: 1, r: tilt(G0) };
  if (t > 3.2) { o.eye = 'dot'; o.blush = 0; }
  if (t > 10.5 && t < 11.25) { o.pose = 'step'; o.ph = Math.floor(t * 5) % 2; o.eye = 'closed'; o.shake = [0, Math.floor(t * 5) % 2 ? 3 : 0]; }
  if (t >= 14.0 && t < 20) { o.eye = t > 17.6 ? 'happy' : 'wide'; o.ear = t > 17.6 ? 'up' : 'down'; }
  if (t >= 19.6) o.flip = true;
  if (t >= 20 && t < 30) {
    const x = lerp(G0, G1, pr(t, 20, 30)); Object.assign(o, { x, y: at(x), r: tilt(x), pose: 'step', ph: Math.floor(t * 4) % 2, eye: 'dot', ear: 'down' });
  }
  if (t >= 30) { Object.assign(o, { x: G1, y: at(G1), r: tilt(G1), pose: 'stand', eye: 'dot' }); }
  if (t >= 31.2 && t < 34.4) { o.eye = 'wide'; o.ear = 'up'; if (t > 31.4) o.pose = 'crouch'; }
  if (t >= 34.4) { o.eye = 'dot'; o.ear = 'down'; }
  if (t >= 38.5) { o.blush = pr(t, 38.5, 39.1); o.eye = 'happy'; }
  if (t >= 40.7) { o.ear = 'up'; o.eye = 'dot'; }
  if (t >= 41.0) o.flip = false;
  if (t >= HOPS[0]) {        // eve zıplayarak
    let i = HOPS.length - 1; while (i > 0 && t < HOPS[i]) i--;
    const u = pr(t, HOPS[i], HOPS[i] + 0.36);
    const x0 = i ? hopX(i - 1) : G1, x1 = hopX(i), x = lerp(x0, x1, eo(u));
    Object.assign(o, { x, y: at(x) - 40 * Math.sin(u * Math.PI), r: tilt(x), pose: u < 1 ? 'hop' : 'stand', eye: 'happy', ear: 'down' });
  }
  return o;
}
function hoofXs(t) { return HOPS.filter(h => t >= h + 0.36).map((h, i) => hopX(i) + 30); }

// —— yavru tilki ——
function kitState(t) {
  const o = { x: F0, y: at(F0) + 2, s: 1.45, seed: 500, flip: true, pose: 'sit', ear: 'up', eye: 'happy', r: tilt(F0) };
  if (t > 3.2) { o.ear = 'droop'; o.eye = 'worried'; }
  if (t >= 7.5 && t < 9.5) { o.pose = 'stand'; o.r = tilt(F0) + (Math.floor(t * 4) % 2 ? -0.22 : -0.12); }
  if (t >= 9.5 && t < 20) o.pose = 'sit';
  if (t >= 17.6 && t < 20) { o.ear = 'up'; o.eye = 'dot'; }
  if (t >= 20 && t < 30) { const x = lerp(F0, F1, pr(t, 20, 30)); Object.assign(o, { x, y: at(x) + 2, r: tilt(x), pose: 'step', ph: Math.floor(t * 4 + 0.5) % 2, eye: 'dot', ear: 'up' }); }
  if (t >= 30) Object.assign(o, { x: F1, y: at(F1) + 2, r: tilt(F1), pose: 'stand', eye: 'dot' });
  if (t >= 31.2 && t < 34.4) { o.eye = 'worried'; o.ear = 'droop'; }
  if (t >= 34.4) { o.eye = 'happy'; o.ear = 'up'; }
  if (t >= 34.6) {            // annesine koşuyor
    const u = pr(t, 34.6, 36.2), x = lerp(F1, F2, eio(u));
    Object.assign(o, { x, y: at(x) + 2, r: tilt(x), pose: u < 1 ? 'step' : 'stand', ph: Math.floor(t * 8) % 2, eye: u < 1 ? 'dot' : 'happy' });
  }
  if (t >= 40.0) { o.flip = false; o.eye = 'happy'; o.wag = t < 41.2 ? (Math.floor(t * 6) % 2 ? 0.28 : -0.1) : 0.1; }
  return o;
}

// —— anne tilki ——
function momState(t) {
  const o = { x: MOM, y: at(MOM) + 2, s: 2.1, seed: 800, pose: 'stand', ear: 'up', eye: 'dot', r: tilt(MOM) };
  if (t < 33.0) { o.dark = true; o.lineDraw = pr(t, 30.5, 31.2); o.fillDraw = pr(t, 30.5, 31.2); o.glow = pr(t, 31.2, 31.4); return o; }
  o.fillDraw = pr(t, 33.0, 34.4); o.face = pr(t, 34.0, 34.3);
  if (t >= 36.2) o.eye = 'happy';
  if (t >= 40.0) o.wag = Math.floor(t * 4) % 2 ? 0.15 : 0;
  return o;
}

// —— katmanlar ——
const BG = { f: layer(), l: layer() }, BUSHG = group(), WASH = layer(), MOMG = group(), KIT = group(), GOAT = group(), FX = layer();

export function frame(comp, t) {
  [CAM.x, CAM.y, CAM.s] = camT(t);
  BOIL.amp = t > 43.5 ? 0.55 : (t > 30 && t < 33 ? 0.7 : 1);
  [BG.f, BG.l, WASH, FX].forEach(clear);
  clearGroup(BUSHG); clearGroup(MOMG); clearGroup(KIT); clearGroup(GOAT);
  drawWorld(BG.f, BG.l);
  drawSun(BG.f, BG.l, t);
  drawPrints(BG.l, 0.6);
  bush(BUSHG, { t });
  if (t >= BANDS[0].t0) drawWash(WASH, t);
  // tepe çiçekleri ve toynak izleri (suluboyanın üstünde)
  hillFlowers(FX, FX, [0, 1, 2, 3, 4].map(i => pr(t, 22 + i * 1.6, 22.6 + i * 1.6)));
  drawHoofPrints(FX, hoofXs(t));
  // düşünce balonu (5,0–11,6)
  if (t >= 5.0 && t < 11.6) {
    const g = goatState(t), bx = g.x - 120, by = at(G0) - 470;
    const d = pr(t, 5.0, 6.2);
    line(FX, handCircle(g.x - 10, at(G0) - 330, 12, 41, 0.1, 20), { w: 5, col: K.ink, seed: 410, draw: clamp(d * 3) });
    line(FX, handCircle(g.x - 50, at(G0) - 380, 20, 42, 0.1, 24), { w: 5, col: K.ink, seed: 411, draw: clamp(d * 3 - 1) });
    const cloud = []; for (let i = 0; i <= 90; i++) { const a = i / 90 * 6.283; const b = 1 + 0.13 * Math.abs(Math.sin(a * 4)); cloud.push([bx + Math.cos(a) * 170 * b, by - 30 + Math.sin(a) * 120 * b]); }
    line(FX, cloud, { w: 6, col: K.ink, seed: 412, draw: clamp(d * 3 - 2) });
    if (t >= 6.2) fox(KIT, { x: bx - 10, y: by + 50, s: 0.62, seed: 820, pose: 'sit', flip: true, eye: 'dot', lineDraw: pr(t, 6.2, 6.9), fillDraw: pr(t, 6.6, 7.2), face: pr(t, 6.9, 7.1) });
  }
  // ilk yıldız (26,0)
  if (t >= 26.0) {
    const tw = 1 + 0.15 * Math.sin(Math.floor(t * 12) * 1.3), r = 26 * tw * pr(t, 26.0, 26.3);
    const pts = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.45 : r; pts.push([700 + Math.cos(a) * rr, 520 + Math.sin(a) * rr]); }
    fill(FX, pts, { col: K.yellow, p: 1, gap: 4, w: 6, seed: 430 });
    line(FX, pts, { w: 4, col: K.ochre, seed: 431 });
  }
  // "!" (31,4–33,0)
  if (t >= 31.4 && t < 33.0) {
    const g = goatState(t), bx = g.x - 60, by = g.y - 410 - 8 * Math.sin(Math.floor(t * 12) * 1.7), d = pr(t, 31.4, 31.6);
    line(FX, [[bx, by - 90], [bx + 5, by - 14]], { w: 15, col: K.red, p: 1, seed: 400, draw: d, taper: 0.5 });
    if (d >= 1) dab(FX, bx + 6, by + 16, 10, { col: K.red, p: 1, seed: 401 });
  }
  // kalp (37,0–40,0)
  if (t >= 37.0 && t < 40.5) {
    const cx = 700, cy = 700 - 30 * pr(t, 37.8, 40.5);
    const heart = smooth([[cx, cy + 50], [cx - 60, cy - 5], [cx - 42, cy - 48], [cx, cy - 22], [cx + 42, cy - 48], [cx + 60, cy - 5]], 8);
    fill(FX, heart, { col: K.red, p: 1, gap: 5, w: 7, seed: 440, draw: pr(t, 37.0, 37.8), over: 5 });
  }
  // karakterler
  if (t >= 30.5) fox(MOMG, momState(t));
  fox(KIT, kitState(t));
  goat(GOAT, goatState(t));
  // kompozisyon: kâğıt, arka plan (beyaz mum izleri dahil), çalı, suluboya, karakterler, efektler
  comp.paperCam(CAM.x * 0.6, CAM.y * 0.6, CAM.s / 0.6);
  comp.begin();
  comp.crayon(BG.f.c); comp.crayon(BG.l.c);
  const go = [hash(BOIL.step) * 300, hash(BOIL.step + 7) * 300];
  comp.group(BUSHG, { goff: go });
  if (t >= BANDS[0].t0) comp.wash(WASH.c, { color: PAL.wash });
  comp.group(MOMG, { goff: go });
  comp.group(KIT, { goff: go });
  comp.group(GOAT, { goff: go });
  comp.crayon(FX.c, { goff: go });
  comp.finish({ vig: 0.3 });
}
export function modelSheet(comp, t) { frame(comp, t); }
