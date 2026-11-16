"""Partitur + Geräusche + Mischung → out/mix.wav. Liest events.json (aus film.js). 96 BPM, 4/4, Takt = 2,5 s."""
import json, os, sys
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB', '/root/lemo-opuscar')
sys.path.insert(0, LIB)
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add, limit, bp, lp, hp, noise, t_, env_exp, norm, compress

S.seed(11)
EV = json.load(open(os.path.join(HERE, 'events.json')))
DUR = EV['dur']; ev = EV['ev']
N = int((DUR + 0.5) * SR)
BEAT = 60 / 96; BAR = BEAT * 4
rng = np.random.default_rng(5)
b = lambda bar, beat=0: bar * BAR + beat * BEAT     # Takt (0-basiert) + Schlag → Sekunden

# ———————————————— Musik ————————————————
mus = np.zeros((N, 2)); score = []
def n(t, inst, p, d, v, pan=0, g=1): score.append((t, inst, p, d, v, pan, g))
def pl(t, preset, p, d, v, pan=0, g=1):
    x = P.pluck(preset, p, d, vel=v).astype(np.float64); add(mus, x, t, g, pan)

# A (0–5): Glockenspiel, ein Ton pro gezeichnetem Element
for t, p in [(0.2, 'G5'), (1.0, 'D6'), (3.0, 'C6'), (3.6, 'E6'), (4.0, 'G6'), (4.4, 'C7')]:
    n(t, 'glockenspiel', p, 1.6, .42, -.2)
# B (5–15): Nylongitarre wiegt (C–Am–F–G), Blockflöte singt ab Takt 5, Shaker leise
CH = {'C': ['C3', 'E4', 'G4', 'C5'], 'Am': ['A2', 'E4', 'A4', 'C5'], 'F': ['F2', 'F4', 'A4', 'C5'], 'G': ['G2', 'D4', 'G4', 'B4']}
def lilt(bar, ch, v=.55):
    bass, *up = CH[ch]
    pl(b(bar), 'nylon_guitar', bass, 2.4, v, -.25)
    for k, beat in enumerate([1, 2, 3]): pl(b(bar, beat), 'nylon_guitar', up[k % 3], .9, v * .7, -.25)
    pl(b(bar, 2.5), 'nylon_guitar', up[2], .5, v * .45, -.25)
for i, ch in enumerate(['C', 'Am', 'F', 'G']): lilt(2 + i, ch)
for t, p in [(5.0, 'G5'), (6.0, 'A5'), (7.0, 'C7')]: n(t, 'glockenspiel', p, 1.2, .35, -.1)
for k in range(32): n(b(2) + k * BEAT / 2, 'shaker', 'down' if k % 2 == 0 else 'up', None, .2 if k % 2 else .28, .35)
# Motiv A (erste Hälfte des Themas), dann verspielt — in Takt 5–6 (10–15 s), endet abrupt bei 15.0
mA = [('E5', 1), ('G5', 1), ('A5', .5), ('G5', .5), ('E5', 1), ('D5', 1), ('E5', .5), ('G5', .5), ('C6', 1), (None, 1)]
t = b(4)
for p, d in mA:
    if p: n(t, 'recorder', p, d * BEAT * .92, .55, .15)
    t += d * BEAT
# C (15–17,5): Stille.  D (17,5–25): Bass-Pizzicati schleichen chromatisch abwärts, Holzblock-Herz wird schneller
for k, p in enumerate(['A2', 'G#2', 'G2', 'F#2', 'F2', 'E2']):
    pl(17.5 + k * BEAT * 2, 'upright_bass_pizz', p, 1.2, .7, 0)
    if k >= 3: n(17.5 + k * BEAT * 2, 'marimba', p.replace('2', '3'), 1.0, .3, -.3)
hb, gap = 17.8, 1.25
while hb < 24.8:
    n(hb, 'woodblock', 'c', None, .34, -.1); n(hb + .16, 'woodblock', 'c', None, .22, -.1)
    hb += gap; gap = max(.55, gap * .86)
# E (25–27,5): Fast-Stille.  F (27,5–35): Spieluhr allein, Am → F → C → G
box = [('A4', 0), ('C5', 1), ('E5', 2), ('C5', 3), ('F4', 4), ('A4', 5), ('C5', 6), ('A4', 7),
       ('C5', 8), ('E5', 9), ('G5', 10), ('D5', 11)]
for p, k in box: pl(27.5 + k * BEAT, 'music_box', p, 2.0, .6, .2)
# G (35–42,5): das Thema einmal vollständig — Blockflöte + Spieluhr, Gitarre darunter, Kadenz F–G–C
theme = [('E5', 1), ('G5', 1), ('A5', .5), ('G5', .5), ('E5', 1), ('D5', 1), ('E5', .5), ('D5', .5), ('C5', 2),
         ('A4', 1), ('C5', 1), ('D5', 1), ('G5', 1), ('E5', 2), ('D5', 2)]
t = 35.0
for p, d in theme:
    n(t, 'recorder', p, d * BEAT * .95, .6, .1)
    pl(t, 'music_box', p, 1.6, .38, .25)
    t += d * BEAT
for i, ch in enumerate(['C', 'Am', 'F']): lilt(14 + i, ch, .5)
# H (42,5–45): Spieluhr, letzter Ton sinkt ein wenig (die Feder läuft ab)
for t, p, v in [(42.5, 'E5', .5), (43.125, 'D5', .45), (43.75, 'E5', .42), (44.4, 71.75, .5)]:
    pl(t, 'music_box', p, 2.0, v, .2)
pl(42.5, 'nylon_guitar', 'C3', 2.4, .35, -.25); pl(42.5, 'nylon_guitar', 'G4', 2.4, .22, -.25)

mus += S.render(score, dur=N / SR, master=False)[:N]
mus = S.room(mus, size=.35, mix=.16)
mus[:, 0] = compress(mus[:, 0], .5, 2.0); mus[:, 1] = compress(mus[:, 1], .5, 2.0)

# ———————————————— Geräusche ————————————————
fx = np.zeros((N, 2)); amb = np.zeros((N, 2))
def crayon(d, speed=1.0):            # Wachsstift: Haft-Gleit-Rauschen, Körnung folgt der Strichgeschwindigkeit
    x = bp(noise(d), 1400, 5200); g = (rng.random(len(x)) < .004 * speed).astype(float)
    grain = lp(np.convolve(g, np.ones(int(.004 * SR)), 'same'), 600)
    e = np.minimum(1, t_(d) / .05) * np.minimum(1, (d - t_(d)) / .08)
    return norm(x * (0.4 + grain * 1.6)) * e
def scribble(d, rate=6.5):           # Ausmalen: rhythmisches Hin und Her
    x = crayon(d, 1.5); m = np.abs(np.sin(np.pi * rate * t_(d))) ** 1.5
    return x * (0.25 + 0.75 * m)
def soft_thump(f=90, v=1.0):
    d = .18; tt = t_(d); return (np.sin(2 * np.pi * f * tt) * env_exp(d, .03) + lp(noise(d), 900) * env_exp(d, .015) * .6) * v
def rustle(d, k=1.0):                # Laub: Bandrauschen mit Knistern
    x = bp(noise(d), 900, 6500) * (0.5 + 0.5 * np.abs(np.sin(np.pi * 9 * t_(d) + rng.random() * 3)))
    cr = hp(noise(d), 3000) * (rng.random(int(round(d * SR))) > .992) * 4
    e = np.minimum(1, t_(d) / .03) * np.exp(-t_(d) / (d * .45))
    return norm(x + cr) * e * k
def chirp(f0, f1, d=.09):
    tt = t_(d); ph = 2 * np.pi * np.cumsum(np.linspace(f0, f1, len(tt))) / SR
    return np.sin(ph) * np.sin(np.pi * tt / d) ** 2
def birds(t0, d, buf, g=.05):
    k = t0
    while k < t0 + d - .4:
        f = 2800 + rng.random() * 1800
        for j in range(int(2 + rng.random() * 3)): add(buf, chirp(f, f * (1.25 + rng.random() * .3), .07), k + j * .1, g * (.6 + .4 * rng.random()), -.7 + rng.random() * .6)
        k += .8 + rng.random() * 1.6
def crickets(t0, d, buf, g=.03):
    k = t0
    while k < t0 + d:
        tt = t_(.12); x = np.sin(2 * np.pi * 4600 * tt) * (np.sin(np.pi * 40 * tt) > 0) * np.sin(np.pi * tt / .12)
        add(buf, x, k, g, .55); k += .45 + rng.random() * .25

room = lp(noise(N / SR), 300); room = norm(room) * .006
amb[:len(room), 0] += room; amb[:len(room), 1] += room
for e in ev:
    t, ty, pan, g = e['t'], e['type'], e.get('pan', 0), e.get('g', 1)
    d = e.get('dur', .5)
    if ty == 'scratch': add(fx, crayon(d), t, .16 * g, pan)
    elif ty == 'scribble': add(fx, scribble(d), t, .14 * g, pan)
    elif ty == 'tick': add(fx, hp(noise(.03), 1500) * env_exp(.03, .006), t, .25 * g, pan)
    elif ty == 'hoof':
        add(fx, lp(S.hit('woodblock', 'a', .5).astype(float), 2500), t, .18 * g, pan); add(fx, soft_thump(110), t, .25 * g, pan)
    elif ty == 'nibble': [add(fx, hp(noise(.025), 2500) * env_exp(.025, .005), t + j * .07, .2, pan) for j in range(3)]
    elif ty == 'rustle': add(fx, rustle(d, .5 + .17 * min(e.get('i', 0), 3)), t, .7 * g, pan)
    elif ty == 'freeze': add(fx, S.hit('woodblock', 'b', .5).astype(float), t, .3, 0)
    elif ty == 'wind': w = lp(noise(d), 450); w = norm(w) * np.sin(np.pi * t_(d) / d) ** 2; add(amb, w, t, .035, -.3)
    elif ty == 'scuff': add(fx, bp(noise(.25), 500, 3000) * np.exp(-t_(.25) / .08), t, .15, pan)
    elif ty == 'crickets': crickets(t, d, amb)
    elif ty == 'birds': birds(t, d, amb)
    elif ty == 'blinkeyes': [add(fx, S.note('glockenspiel', p, .4, .25).astype(float), t + j * .09, .25, pan) for j, p in enumerate(['E7', 'G7'])]
    elif ty == 'paw': add(fx, soft_thump(150, .7), t, .22, pan)
    elif ty == 'whimper':
        tt = t_(.55); f = 900 - 260 * tt / .55 + 25 * np.sin(2 * np.pi * 7 * tt)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / .55) ** 1.5; add(fx, lp(x + .3 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR) * np.sin(np.pi * tt / .55), 3000), t, .05, pan)
    elif ty == 'drip': add(fx, chirp(700, 1500, .07), t, .1, pan)
    elif ty == 'sit': add(fx, soft_thump(100, .8) + lp(noise(.18), 1500) * env_exp(.18, .05) * .3, t, .22, pan)
    elif ty == 'swish': add(fx, bp(noise(.22), 600, 4000) * np.sin(np.pi * t_(.22) / .22) ** 2, t, .12, pan)

# ———————————————— Mischung ————————————————
mix = mus * 1.0 + fx * 1.0 + amb * 1.0
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
mix = mix[:int(DUR * SR)]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
sf.write(os.path.join(HERE, 'out', 'music.wav'), mus[:int(DUR * SR)].astype(np.float32), SR)
print('mix', mix.shape, 'peak', float(np.abs(mix).max()))
