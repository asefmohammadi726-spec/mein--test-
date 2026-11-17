// Die Figuren: die kleine weiße Ziege und der verirrte kleine Fuchs.
// Lokaler Ursprung = Mitte zwischen den Füßen am Boden, Blick nach rechts (flip = nach links).
import { line, fill, dab, ellipse, handCircle, smooth, xf } from './engine/crayon.js';
import { part, tube } from './engine/rig.js';
import { PAL } from './pal.js';
import { clamp } from '/core/lib.js';
const K = PAL.crayon;

const OUT = (seed, o = {}) => ({ w: 7, seed, col: K.ink, p: 0.95, ...o });

// ————————————————— Ziege —————————————————
// o: x, y, s, r, flip, seed
//    lineDraw, fillDraw (0..1: live gezeichnet), face (0..1: Augen/Wange erscheinen)
//    pose: 'stand' | 'hop' | 'crouch' | 'step'   ph (Schrittphase 0/1)
//    head: 0 = normal, 1 = gesenkt (Knabbern), chew (0/1)
//    ear: 'down' | 'up' | 'flat'
//    eye: 'dot' | 'wide' | 'happy' | 'closed'
//    blush (0..1, Wangen werden gekritzelt), shake ([dx, dy] Zittern)
export function goat(C, o) {
  const sd = o.seed ?? 100, s = o.s ?? 1;
  const [shx, shy] = o.shake || [0, 0];
  const T = pts => xf(pts, { x: (o.x ?? 0) + shx, y: (o.y ?? 0) + shy, s, r: o.r ?? 0, sx: o.flip ? -1 : 1 });
  const ld = o.lineDraw ?? 1, fd = o.fillDraw ?? 1, face = o.face ?? 1;
  const pose = o.pose || 'stand';
  const lift = pose === 'hop' ? 46 : 0, crouch = pose === 'crouch' ? 14 : 0;
  const fur = { col: K.white, p: 0.95, gap: 8, w: 10, ang: 0.5, seed: sd, draw: fd, over: 3 };
  const by = -lift + crouch;     // Körper-Verschiebung
  // Beine: [Hüfte, Fuß] je nach Pose
  const legs = (near) => {
    const xs = near ? [-58, 50] : [-42, 36];
    return xs.map((x, i) => {
      let fx = x, fy = -lift;
      if (pose === 'hop') fx = x + (i ? -14 : 14), fy = -lift - 6;
      if (pose === 'crouch') fx = x + (i ? 10 : 18);
      if (pose === 'step') fx = x + ((i + (o.ph || 0) + (near ? 0 : 1)) % 2 ? 14 : -10);
      return [[x, by - 44], [fx, fy]];
    });
  };
  // 1) hintere Beine
  legs(false).forEach((L, i) => {
    part(C, T(tube(L, 19, 16)), { ...fur, seed: sd + 1 + i, ang: 1.5 }, ld > 0 ? OUT(sd + 3 + i, { w: 6, draw: ld }) : null);
    part(C, T(ellipse(L[1][0], L[1][1] - 5, 9, 7, 12)), { col: K.brown, p: 0.9, gap: 4, w: 6, seed: sd + 5 + i, draw: fd }, null);
  });
  // 2) Schwänzchen
  const tail = [[-74, by - 98], [-96, by - 120], [-90, by - 100], [-100, by - 96], [-80, by - 86]];
  part(C, T(smooth(tail, 5)), { ...fur, seed: sd + 8 }, OUT(sd + 9, { w: 6, draw: ld }));
  // 3) Körper
  const body = handCircle(0, 0, 1, sd + 10, 0.06, 60).map(([px, py]) => [px * 84, by - 76 + py * 46]);
  part(C, T(body), { ...fur, seed: sd + 11, cross: true, crossP: 0.5 }, OUT(sd + 12, { draw: ld }));
  // Bauch-Schatten: leicht himmelblau, damit das Weiß auf dem Papier lesbar bleibt
  if (fd > 0.5) fill(C.f, T([[-70, by - 58], [-30, by - 40], [30, by - 38], [72, by - 56], [60, by - 44], [0, by - 30], [-58, by - 44]]), { col: K.sky, p: 0.42, gap: 7, w: 8, ang: 0.2, seed: sd + 13, draw: (fd - 0.5) * 2 });
  // 4) vordere Beine
  legs(true).forEach((L, i) => {
    part(C, T(tube(L, 20, 17)), { ...fur, seed: sd + 14 + i, ang: 1.5 }, OUT(sd + 16 + i, { w: 6.5, draw: ld }));
    part(C, T(ellipse(L[1][0], L[1][1] - 5, 10, 7, 12)), { col: K.brown, p: 0.9, gap: 4, w: 6, seed: sd + 18 + i, draw: fd }, OUT(sd + 20 + i, { w: 4.5, draw: ld }));
  });
  // 5) Kopf (gesenkt beim Knabbern)
  const hd = clamp(o.head ?? 0);
  const hx = 86 + 22 * hd, hy = by - 128 + 70 * hd, hr = 0.35 + 0.55 * hd;
  const H = pts => xf(pts, { x: hx, y: hy, r: hr });
  const chew = o.chew ? 3 : 0;
  // Hals
  part(C, T([[44, by - 104], [hx - 18, hy - 22], [hx + 4, hy + 18], [62, by - 52]]), { ...fur, seed: sd + 22 }, null);
  line(C.l, T([[46, by - 108], [hx - 22, hy - 24]]), OUT(sd + 23, { w: 6.5, draw: ld }));
  // Horn (hinter dem Kopf)
  const horn = (dx, k) => part(C, T(H(tube([[dx, -26], [dx - 10, -48], [dx - 30, -58]], 13, 6))), { col: K.ochre, p: 0.95, gap: 4, w: 6, ang: 1.2, seed: sd + 24 + k, draw: fd }, OUT(sd + 26 + k, { w: 5, draw: ld }));
  horn(-6, 0); horn(8, 1);
  // Kopf
  const head = handCircle(0, 0, 1, sd + 30, 0.06, 48).map(([px, py]) => [px * 44, py * 33]);
  const snout = [[24, -4], [46, 0], [52, 12], [42 + chew, 24], [18, 24]];
  part(C, T(H([...head])), { ...fur, seed: sd + 31 }, OUT(sd + 32, { draw: ld }));
  part(C, T(H(smooth(snout, 6))), { ...fur, seed: sd + 33 }, OUT(sd + 34, { w: 6.5, draw: ld }));
  // Bärtchen
  part(C, T(H([[30, 22], [36, 42], [24, 24]])), { ...fur, seed: sd + 35 }, OUT(sd + 36, { w: 5, draw: ld }));
  // Ohr: hängend, aufgestellt oder angelegt
  const ear = o.ear || 'down';
  const ea = ear === 'up' ? -1.0 : ear === 'flat' ? 0.15 : 0.55;
  part(C, T(H(ellipse(-42, -2, 26, 10, 18, 0, 6.3, ea + Math.PI))), { ...fur, seed: sd + 37 }, OUT(sd + 38, { w: 6, draw: ld }));
  if (fd > 0.6) dab(C.f, ...T(H([[-48, -4]]))[0], 5 * s, { col: K.pink, p: 0.7, seed: sd + 39, sq: 0.6 });
  if (ld < 0.95 || face <= 0) return;
  // Gesicht
  const [ex, ey] = T(H([[6, -10]]))[0];
  const eye = o.eye || 'dot';
  if (eye === 'wide') {
    line(C.l, T(H(handCircle(6, -10, 11, sd + 40, 0.1, 24))), OUT(sd + 41, { w: 4.5, draw: face }));
    dab(C.l, ex, ey, 5.5 * s, { col: K.ink, p: 1, seed: sd + 42, gap: 2.5, w: 4 });
  } else if (eye === 'happy') {
    line(C.l, T(H([[-2, -8], [6, -16], [14, -8]])), OUT(sd + 43, { w: 5, draw: face }));
  } else if (eye === 'closed') {
    line(C.l, T(H([[-2, -10], [14, -10]])), OUT(sd + 44, { w: 5, draw: face }));
  } else {
    dab(C.l, ex, ey, 6.5 * s * face, { col: K.ink, p: 1, seed: sd + 45, gap: 2.5, w: 4 });
    dab(C.l, ex - 2 * s, ey - 2.5 * s, 2 * s * face, { col: K.white, p: 1, seed: sd + 46, gap: 1.5, w: 2.5 });
  }
  // Nase und Mund
  dab(C.l, ...T(H([[47, 6]]))[0], 3.5 * s * face, { col: K.ink, p: 1, seed: sd + 47, gap: 2, w: 3 });
  const m = eye === 'wide' ? [[30, 18], [36, 15], [42, 18]] : [[30, 15], [37, 20], [44, 15]];
  line(C.l, T(H(m)), OUT(sd + 48, { w: 4, draw: face }));
  // Wangen: immer ein Hauch, beim Erröten dicht gekritzelt
  const [cx, cy] = T(H([[4, 10]]))[0];
  dab(C.f, cx, cy, 9 * s, { col: K.pink, p: 0.45 * face, seed: sd + 49 });
  if ((o.blush ?? 0) > 0) fill(C.l, T(H(handCircle(4, 10, 11, sd + 50, 0, 20))), { col: K.pink, p: 0.95, gap: 3.6, w: 5, ang: 0.7, over: 4, seed: sd + 51, draw: o.blush });
}

// ————————————————— Fuchs —————————————————
// o: x, y, s, flip, seed, lineDraw, fillDraw, face
//    pose: 'stand' | 'step' | 'sit'   ph
//    ear: 'up' | 'droop' (ein Ohr hängt)
//    eye: 'worried' | 'happy' | 'dot'
//    tear (0..1), wag (Schwanzwinkel, Bogenmaß), look (0 = nach vorn)
export function fox(C, o) {
  const sd = o.seed ?? 500, s = o.s ?? 1;
  const T = pts => xf(pts, { x: o.x ?? 0, y: o.y ?? 0, s, r: o.r ?? 0, sx: o.flip ? -1 : 1 });
  const ld = o.lineDraw ?? 1, fd = o.fillDraw ?? 1, face = o.face ?? 1;
  const pose = o.pose || 'stand', sit = pose === 'sit';
  const DK = '#3b3060', dk = !!o.dark;
  const fpart = (C_, poly, fo, lo, opt = {}) => part(C_, poly, fo, lo, dk ? { ...opt, kn: false } : opt);   // karanlıkta kâğıt açılmaz: suluboya görünür kalır
  const WH = dk ? DK : K.white, RU = dk ? DK : K.rust, BR = dk ? DK : K.brown;
  const coat = { col: dk ? DK : K.orange, p: 0.95, gap: 8, w: 10, ang: 0.6, seed: sd, draw: fd, over: 4 };
  const sock = { col: BR, p: 0.95, gap: 5, w: 7, ang: 1.5, seed: sd + 1, draw: fd };
  // 1) Schwanz (hinten, buschig, mit weißer Spitze)
  const wag = o.wag ?? 0;
  const W = pts => xf(pts, { x: -50, y: sit ? -24 : -52, r: wag });
  const tailPts = [[0, -10], [-40, -30], [-80, -46], [-108, -80], [-94, -48], [-70, -8], [-30, 12], [4, 10]];
  fpart(C, T(W(smooth(tailPts, 6))), { ...coat, seed: sd + 2, ang: 0.3 }, OUT(sd + 3, { draw: ld }));
  fpart(C, T(W(smooth([[-90, -58], [-108, -80], [-100, -50], [-84, -40]], 5))), { col: WH, p: 0.95, gap: 5, w: 7, seed: sd + 4, draw: fd }, OUT(sd + 5, { w: 5, draw: ld }), { occ: true });
  // 2) hintere Beine
  const legX = sit ? [[-34, -12, -20, 0], [30, -30, 34, 0]] : [[-36, -34, -40, 0], [30, -34, 34, 0]];
  const step = (i, near) => pose === 'step' ? ((i + (o.ph || 0) + (near ? 0 : 1)) % 2 ? 10 : -8) : 0;
  legX.forEach(([x0, y0, x1, y1], i) => fpart(C, T(tube([[x0 + 8, y0 - 6], [x1 + 8 + step(i, false), y1]], 12, 10)), { ...sock, seed: sd + 6 + i }, OUT(sd + 8 + i, { w: 5.5, draw: ld })));
  // 3) Körper
  const body = sit
    ? smooth([[-52, -10], [-40, -64], [6, -92], [40, -84], [42, -30], [20, -4]], 6)
    : handCircle(0, 0, 1, sd + 10, 0.06, 56).map(([px, py]) => [px * 62, -58 + py * 30]);
  fpart(C, T(body), { ...coat, seed: sd + 11, cross: true, crossP: 0.4 }, OUT(sd + 12, { draw: ld }));
  if (fd > 0.4) fill(C.f, T(sit ? [[-40, -14], [0, -6], [30, -10], [20, -30], [-20, -30]] : [[-50, -44], [0, -32], [50, -42], [40, -36], [0, -28], [-46, -38]]), { col: RU, p: 0.6, gap: 7, w: 8, ang: 0.2, seed: sd + 13, draw: (fd - 0.4) / 0.6 });
  // weiße Brust
  fpart(C, T(smooth(sit ? [[24, -80], [44, -76], [44, -40], [28, -30]] : [[38, -76], [62, -66], [56, -42], [40, -46]], 5)), { col: WH, p: 0.95, gap: 5, w: 7, seed: sd + 14, draw: fd }, null);
  // 4) vordere Beine
  const near = sit ? [[[32, -40], [36, 0]], [[14, -36], [16, 0]]] : [[[-46, -40], [-50, 0]], [[42, -40], [46, 0]]];
  near.forEach((L, i) => fpart(C, T(tube([L[0], [L[1][0] + step(i, true), L[1][1]]], 13, 11)), { ...sock, seed: sd + 16 + i }, OUT(sd + 18 + i, { w: 6, draw: ld })));
  // 5) Kopf (größer als nötig: Kindchenschema)
  const hx = sit ? 44 : 66, hy = sit ? -116 : -96;
  const lk = o.look ?? 0;
  const H = pts => xf(pts, { x: hx, y: hy, r: lk * 0.15 });
  // Ohren (hinter dem Kopf); das linke hängt, wenn er traurig ist
  const earL = o.ear === 'droop'
    ? [[-24, -14], [-50, -6], [-30, 4]]
    : [[-24, -20], [-26, -66], [-4, -28]];
  fpart(C, T(H(earL)), { ...coat, seed: sd + 20 }, OUT(sd + 21, { w: 6, draw: ld }));
  fpart(C, T(H([[4, -28], [20, -70], [26, -22]])), { ...coat, seed: sd + 22 }, OUT(sd + 23, { w: 6, draw: ld }));
  if (fd > 0.5) fill(C.f, T(H([[10, -30], [19, -58], [21, -28]])), { col: BR, p: 0.85, gap: 3, w: 4, seed: sd + 24 });
  // Kopf + Schnauze
  const head = handCircle(0, 0, 1, sd + 25, 0.06, 44).map(([px, py]) => [px * 36, py * 32]);
  fpart(C, T(H(head)), { ...coat, seed: sd + 26 }, OUT(sd + 27, { draw: ld }));
  fpart(C, T(H(smooth([[16, -10], [52, 2], [50, 12], [14, 24], [-4, 20], [-14, 8]], 6))), { col: WH, p: 0.95, gap: 5, w: 7, seed: sd + 28, draw: fd }, OUT(sd + 29, { w: 6, draw: ld }));
  // zerzaustes Fell: drei Büschel auf dem Kopf
  if (ld > 0.9) line(C.l, T(H([[-14, -30], [-8, -42], [-2, -32], [4, -44], [8, -31]])), OUT(sd + 30, { w: 5 }));
  if (dk) {   // im Dunkeln: nur zwei leuchtende Augen
    if ((o.glow ?? 1) > 0) [[10, -6], [26, -8]].forEach(([x, y], i) => { const [px, py] = T(H([[x, y]]))[0]; dab(C.l, px, py, 7 * s * (o.glow ?? 1), { col: K.yellow, p: 1, seed: sd + 60 + i, gap: 2.5, w: 4 }); });
    return;
  }
  if (ld < 0.95 || face <= 0) return;
  // Gesicht
  dab(C.l, ...T(H([[52, 4]]))[0], 5 * s * face, { col: K.ink, p: 1, seed: sd + 31, gap: 2, w: 3 });
  const [ex, ey] = T(H([[16, -6]]))[0];
  const eye = o.eye || 'worried';
  if (eye === 'happy') line(C.l, T(H([[8, -4], [16, -12], [24, -4]])), OUT(sd + 32, { w: 5, draw: face }));
  else {
    dab(C.l, ex, ey, 8 * s * face, { col: K.ink, p: 1, seed: sd + 33, gap: 2.5, w: 4 });
    dab(C.l, ex - 2.5 * s, ey - 3 * s, 2.6 * s * face, { col: WH, p: 1, seed: sd + 34, gap: 1.5, w: 2.5 });
    // besorgte Augenbraue: innen hoch (zur Schnauze hin)
    if (eye === 'worried') line(C.l, T(H([[4, -18], [24, -24]])), OUT(sd + 35, { w: 4.5, draw: face }));
  }
  // Mund
  const m = eye === 'happy' ? [[26, 14], [34, 19], [42, 14]] : [[28, 16], [35, 13], [42, 16]];
  line(C.l, T(H(m)), OUT(sd + 36, { w: 4, draw: face }));
  dab(C.f, ...T(H([[22, 10]]))[0], 7 * s, { col: K.pink, p: 0.4 * face, seed: sd + 37 });
  // Träne
  const tr = clamp(o.tear ?? 0);
  if (tr > 0) {
    const ty = 4 + 18 * tr;
    fill(C.l, T(H(smooth([[12, ty - 8], [17, ty + 2], [12, ty + 7], [7, ty + 2]], 5))), { col: K.sky, p: 1, gap: 2.4, w: 4, seed: sd + 38 });
  }
}
