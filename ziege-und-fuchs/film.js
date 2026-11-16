// Zeitachse, Kamera, Figurenzustände, Ereignisse, Bildaufbau. 96 BPM, 4/4, ein Takt = 2,5 s, 18 Takte = 45 s.
import { layer, clear, line, dab, CAM, BOIL } from './engine/crayon.js';
import { group, clearGroup } from './engine/rig.js';
import { goat, fox } from './chars.js';
import { drawWorld, bush, leaves, BUSH, GROUND, pr } from './world.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash, track, eo, eio } from '/core/lib.js';
const K = PAL.crayon;
export const DUR = 45;
export const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4;

// —— Kamera: [x, y, Zoom] ——
const camT = track([
  [0, [2400, 1230, 1.7]], [2.9, [2400, 1230, 1.7]],             // 1: Nahaufnahme, der Busch wird gekritzelt
  [5.2, [1600, 900, 0.6]], [5.6, [1600, 900, 0.6]],             // Pull zurück auf die leere Seite
  [8.2, [1560, 1215, 1.2]], [15.0, [1560, 1215, 1.2]],        // 2–4: Push auf die Ziege, dann still
  [17.5, [1560, 1215, 1.2]], [20.2, [1870, 1220, 1.2]],        // 5: Schwenk entlang ihres Blicks
  [25.0, [1900, 1222, 1.23]], [27.4, [2250, 1215, 1.5]],       // 6: Push auf den Busch, Atem anhalten
  [28.2, [2240, 1215, 1.48]], [30.4, [1700, 1215, 1.05]],        // 7: Pull zurück, der Fuchs kommt
  [35.0, [1700, 1215, 1.05]], [42.5, [1640, 1220, 1.15]],       // 8: Truck nach links, Annäherung
  [45.0, [1600, 920, 0.62]],                                    // 9: Pull zurück auf die ganze Seite
]);

// —— Zeitmarken ——
export const T = {
  hop: [10.0, 11.25, 12.5].map(t => t),       // Hüpfer auf jedem zweiten Schlag
  rustle: [15.0, 18.1, 20.6, 23.1],            // Rascheln, immer näher
  bushOpen: 26.0, eyes: 26.3, foxOut: 27.5, foxFill: 28.6,
  droop: 31.0, tear: 32.5, blink: 35.0, blush: 36.25, step: 38.75, sit: 40.0, echo: 43.1, end: 44.4,
};
const GOAT_X0 = 1350, GOAT_X1 = 1280, GOAT_X2 = 1420;
const FOX_X0 = 2400, FOX_X1 = 2120, FOX_X2 = 1860;

// —— Ereignisse (Geräusche und Musik-Cues, für mix.py) ——
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
ev(0, 'room');
ev(0.2, 'scratch', { dur: 1.0, pan: 0.2 }); ev(1.0, 'scribble', { dur: 1.8, pan: 0.2 });
ev(3.0, 'scratch', { dur: 0.9, pan: -0.2 }); ev(3.6, 'scratch', { dur: 0.7, pan: -0.7 }); ev(4.0, 'scribble', { dur: 0.9, pan: -0.6 }); ev(4.3, 'scribble', { dur: 1.0, pan: 0 });
ev(5.0, 'scratch', { dur: 1.0, pan: -0.1 }); ev(6.0, 'scribble', { dur: 1.0, pan: -0.1 }); ev(7.0, 'tick', { pan: -0.1 });
ev(2.8, 'birds', { dur: 12.3 });
T.hop.forEach((t, i) => { ev(t + 0.32, 'hoof', { pan: -0.1 }); ev(t + 0.36, 'hoof', { pan: -0.05, g: 0.7 }); });
[13.1, 13.75, 14.4].forEach(t => ev(t, 'nibble', { pan: 0 }));
T.rustle.forEach((t, i) => ev(t, 'rustle', { i, dur: 0.9, pan: 0.6 }));
ev(15.25, 'freeze'); ev(15.6, 'tick', { pan: -0.1, g: 1.4 });
ev(17.5, 'wind', { dur: 7.5 });
ev(19.4, 'scuff', { pan: -0.4 });
ev(25.0, 'crickets', { dur: 20 });
ev(26.0, 'rustle', { i: 4, dur: 0.6, pan: 0.3, g: 0.5 });
ev(26.3, 'blinkeyes', { pan: 0.3 });
ev(T.foxOut, 'paw', { pan: 0.3 }); ev(T.foxOut, 'scratch', { dur: 1.1, pan: 0.3 }); ev(T.foxFill, 'scribble', { dur: 1.4, pan: 0.2 });
[28.6, 29.0, 29.4].forEach(t => ev(t, 'paw', { pan: 0.25 }));
ev(29.9, 'whimper', { pan: 0.25 });
ev(T.tear, 'drip', { pan: 0.25 });
ev(T.blush, 'scribble', { dur: 0.65, pan: -0.2, g: 0.7 });
ev(35.5, 'birds', { dur: 9.5 });
[T.step, T.step + 0.31].forEach(t => ev(t, 'hoof', { pan: -0.1, g: 0.6 }));
ev(T.sit, 'sit', { pan: 0.2 });
ev(T.echo, 'rustle', { i: 5, dur: 1.0, pan: 0.4, g: 0.6 });
[43.2, 43.55, 43.9].forEach(t => ev(t, 'swish', { pan: 0.4 }));
// Musik-Cues (Abschnitte, Takte)
[['A', 0], ['B', 5], ['C', 15], ['D', 17.5], ['E', 25], ['F', 27.5], ['G', 35], ['H', 42.5]].forEach(([id, t]) => ev(t, 'cue', { id }));

// —— Zustand der Ziege ——
function goatState(t) {
  const o = { x: GOAT_X0, y: GROUND, s: 1.5, seed: 100, pose: 'stand', ear: 'down', eye: 'dot', head: 0 };
  o.lineDraw = pr(t, 5.0, 6.0); o.fillDraw = pr(t, 6.0, 7.0); o.face = pr(t, 7.0, 7.4);
  // Hüpfen: Substitution, ein neues Bild pro Pose
  for (const h of T.hop) if (t >= h && t < h + 0.34) { o.pose = 'hop'; o.y = GROUND - 45 * Math.sin(pr(t, h, h + 0.34) * Math.PI); o.eye = 'happy'; }
  // Knabbern: zwei Bilder im Wechsel
  if (t >= 13.0 && t < 15.0) { o.head = 1; o.chew = Math.floor(t * 6) % 2; o.eye = 'happy'; }
  // Schreck
  if (t >= 15.0) { o.head = t < 15.25 ? 1 : 0; o.ear = 'up'; o.eye = 'wide'; }
  if (t >= 19.4) {          // weicht zurück, duckt sich
    o.x = lerp(GOAT_X0, GOAT_X1, eo(pr(t, 19.4, 19.9)));
    o.pose = 'crouch'; o.ear = 'flat'; o.r = -0.05;
  }
  // Zittern: zwei Zeichnungen im Wechsel, ab 33,5 s ruhiger
  if (t >= 20.0 && t < 35.0) {
    const k = t < 28.0 ? 1 : t < 33.5 ? 0.5 : 0;
    const ph = Math.floor(t * 12) % 2;
    o.shake = [(ph ? 2.5 : -2.5) * k, (ph ? -1 : 1) * k];
  }
  if (t >= 33.5) { o.pose = 'stand'; o.r = 0; o.ear = 'down'; o.eye = 'wide'; }
  if (t >= T.blink && t < T.blink + 0.17) o.eye = 'closed';
  else if (t >= T.blink + 0.17) o.eye = 'dot';
  if (t >= T.blush) { o.blush = pr(t, T.blush, T.blush + 0.65); o.eye = t > 37.0 ? 'happy' : 'dot'; }
  if (t >= T.step) {        // ein Schritt auf den Fuchs zu
    o.x = lerp(GOAT_X1, GOAT_X2, eio(pr(t, T.step, T.step + 0.62)));
    if (t < T.step + 0.62) { o.pose = 'step'; o.ph = Math.floor(t * 6) % 2; o.eye = 'dot'; }
    else o.eye = t > 40.6 ? 'happy' : 'dot';
  }
  return o;
}

// —— Zustand des Fuchses ——
function foxState(t) {
  const o = { x: FOX_X0, y: GROUND + 2, s: 1.45, seed: 500, flip: true, pose: 'stand', ear: 'up', eye: 'worried' };
  o.lineDraw = pr(t, T.foxOut, T.foxOut + 1.1); o.fillDraw = pr(t, T.foxFill, T.foxFill + 1.4); o.face = pr(t, T.foxOut + 0.7, T.foxOut + 1.0);
  if (t < T.foxFill) o.x = lerp(FOX_X0, FOX_X1, eo(pr(t, T.foxOut, T.foxOut + 0.9)));
  else if (t < 29.8) { o.x = lerp(FOX_X1, FOX_X2, pr(t, T.foxFill, 29.8)); o.pose = 'step'; o.ph = Math.floor(t * 4) % 2; }
  else o.x = FOX_X2;
  // sich umschauen: Substitution, kurz zurück zum Busch gedreht
  if (t >= 30.4 && t < 31.0) o.flip = false;
  if (t >= T.droop) o.ear = 'droop';
  if (t >= T.tear && t < T.sit) o.tear = pr(t, T.tear, T.tear + 1.6);
  if (t >= T.sit) {
    o.pose = 'sit'; o.x = FOX_X2 - 10; o.ear = t > 40.3 ? 'up' : 'droop';
    o.eye = t > 40.6 ? 'happy' : 'dot';
    o.wag = 0.12 * Math.sin(pr(t, T.sit, T.sit + 0.6) * Math.PI);
  }
  if (t >= T.echo) {          // Schwanzwedeln: zwei Zeichnungen im Wechsel
    const w = t < T.echo + 1.2 ? (Math.floor(t * 6) % 2 ? 0.28 : -0.1) : 0;
    o.wag = w;
  }
  return o;
}

// —— Ebenen ——
const BG = { f: layer(), l: layer() }, FOX = group(), BUSHG = group(), GOAT = group(), FX = layer();

export function frame(comp, t) {
  const cam = camT(t);
  [CAM.x, CAM.y, CAM.s] = cam;
  BOIL.amp = t > 43.0 ? 0.55 : (t > 25 && t < 27.5 ? 0.7 : 1);
  [BG.f, BG.l, FX].forEach(clear);
  clearGroup(FOX); clearGroup(BUSHG); clearGroup(GOAT);
  const p = { gl: pr(t, 3.0, 3.9), gf: pr(t, 3.9, 5.0), sl: pr(t, 3.6, 4.3), sf: pr(t, 4.3, 4.9), cl: pr(t, 4.0, 4.6), fl: pr(t, 4.4, 5.0) };
  const sunFace = pr(t, 7.4, 7.7);
  drawWorld(BG.f, BG.l, p, { face: sunFace, sunWorried: t > 15.2 && t < 36.5, nib: t > 13.75 });
  // Rascheln: Stärke pro Ereignis
  let shake = 0;
  T.rustle.forEach((r, i) => { const u = (t - r) / 0.9; if (u >= 0 && u < 1) shake = Math.max(shake, (0.6 + 0.25 * i) * (1 - u)); });
  if (t >= 26.0 && t < 26.6) shake = Math.max(shake, 0.4);
  if (t >= T.foxOut && t < T.foxOut + 0.8) shake = Math.max(shake, 0.5 * (1 - pr(t, T.foxOut, T.foxOut + 0.8)));
  if (t >= T.echo && t < T.echo + 1.2) shake = Math.max(shake, 0.45);
  const open = t < T.bushOpen ? 0 : t < 30 ? eo(pr(t, T.bushOpen, T.bushOpen + 0.5)) : 1 - eo(pr(t, 30, 30.8));
  const eyes = t >= T.eyes && t < T.foxOut ? (Math.floor((t - T.eyes) * 24) % 24 === 10 ? 0.2 : pr(t, T.eyes, T.eyes + 0.25)) : 0;
  bush(BUSHG, { lineDraw: pr(t, 0.2, 1.1), fillDraw: pr(t, 1.0, 2.8), shake, t, open, eyes });
  T.rustle.forEach((r, i) => leaves(FX, t, r + 0.05, 2 + i, 0.6 + 0.2 * i));
  if (t > 5.0) goat(GOAT, goatState(t));
  if (t >= T.foxOut) fox(FOX, foxState(t));
  // "!" über der Ziege (Kinderlogik)
  if (t >= 15.6 && t < 19.2) {
    const g = goatState(t), d = pr(t, 15.6, 15.78);
    const bx = g.x + 110, by = GROUND - 400 - 8 * Math.sin(Math.floor(t * 12) * 1.7);
    line(FX, [[bx, by - 90], [bx + 5, by - 14]], { w: 15, col: K.red, p: 1, seed: 400, draw: d, taper: 0.5 });
    if (d >= 1) dab(FX, bx + 6, by + 16, 10, { col: K.red, p: 1, seed: 401 });
  }
  // Komposition: Papier, Hintergrund, Fuchs, Busch (verdeckt den Fuchs), Ziege, Effekte
  comp.paperCam(CAM.x * 0.6, CAM.y * 0.6, CAM.s / 0.6);
  comp.begin();
  comp.crayon(BG.f.c); comp.crayon(BG.l.c);
  const go = [hash(BOIL.step) * 300, hash(BOIL.step + 7) * 300];
  comp.group(FOX, { goff: go });
  comp.group(BUSHG, { goff: go });
  comp.group(GOAT, { goff: go });
  comp.crayon(FX.c, { goff: go });
  comp.finish({ vig: 0.3 });
}

// Model Sheet: ?test=model
export function modelSheet(comp, t) {
  [CAM.x, CAM.y, CAM.s] = [960, 540, 1];
  [BG.f, BG.l, FX].forEach(clear); clearGroup(FOX); clearGroup(BUSHG); clearGroup(GOAT);
  const gs = [
    { x: 160, pose: 'stand' }, { x: 420, pose: 'hop', eye: 'happy' }, { x: 680, head: 1, eye: 'happy' }, { x: 950, pose: 'crouch', ear: 'flat', eye: 'wide' },
    { x: 1220, ear: 'up', eye: 'wide' }, { x: 1490, blush: 1, eye: 'happy' }, { x: 1760, pose: 'step', eye: 'closed', flip: true },
  ];
  gs.forEach((g, i) => goat(GOAT, { y: 480, s: 0.9, seed: 100, ...g }));
  const fs = [
    { x: 220, flip: true }, { x: 520, ear: 'droop', tear: 0.6, flip: true }, { x: 820, pose: 'step', flip: true },
    { x: 1120, pose: 'sit', eye: 'happy', flip: true }, { x: 1420, pose: 'sit', wag: 0.28 }, { x: 1720, eye: 'dot' },
  ];
  fs.forEach(f => fox(FOX, { y: 980, s: 1.0, seed: 500, ...f }));
  comp.paperCam(0, 0, 1);
  comp.begin();
  comp.group(FOX); comp.group(GOAT);
  comp.finish({ vig: 0.15 });
}
