"""Bölüm 2: partisyon + sesler + miksaj → out/mix.wav. events.json'u okur (film.js'ten). 96 BPM, 4/4, ölçü = 2,5 sn."""
import json, os, sys
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB', '/root/lemo-opuscar')
sys.path.insert(0, LIB)
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add, limit, bp, lp, hp, noise, t_, env_exp, norm, compress

S.seed(23)
EV = json.load(open(os.path.join(HERE, 'events.json')))
DUR = EV['dur']; ev = EV['ev']
N = int((DUR + 0.5) * SR)
BEAT = 60 / 96; BAR = BEAT * 4
rng = np.random.default_rng(9)

# ———————————————— Müzik ————————————————
mus = np.zeros((N, 2)); score = []
def n(t, inst, p, d, v, pan=0, g=1): score.append((t, inst, p, d, v, pan, g))
def pl(t, preset, p, d, v, pan=0, g=1): add(mus, P.pluck(preset, p, d, vel=v).astype(np.float64), t, g, pan)
CH = {'C': ['C3', 'E4', 'G4', 'C5'], 'Am': ['A2', 'E4', 'A4', 'C5'], 'F': ['F2', 'F4', 'A4', 'C5'], 'G': ['G2', 'D4', 'G4', 'B4'],
      'Dm': ['D3', 'F4', 'A4', 'D5'], 'E': ['E2', 'E4', 'G#4', 'B4']}
def lilt(t0, ch, v=.5, upto=None):
    bass, *up = CH[ch]
    pl(t0, 'nylon_guitar', bass, 2.4, v, -.25)
    for k, beat in enumerate([1, 2, 3]):
        if upto is None or t0 + beat * BEAT < upto: pl(t0 + beat * BEAT, 'nylon_guitar', up[k % 3], .9, v * .7, -.25)
    if upto is None or t0 + 2.5 * BEAT < upto: pl(t0 + 2.5 * BEAT, 'nylon_guitar', up[2], .5, v * .45, -.25)

# A (0–5): akşam — müzik kutusu tek notalar (birinci filmin son notasından devam)
for t, p, v in [(0.5, 'E5', .45), (2.5, 'C5', .42), (3.75, 'G4', .38)]: pl(t, 'music_box', p, 2.2, v, .2)
# B (5–12): şaşkınlık — gitar Am–Dm–E, blok flüt "soru" motifi; 11,25'te sessizlik
lilt(5.0, 'Am'); lilt(7.5, 'Dm'); lilt(10.0, 'E', upto=11.2)
t = 7.5
for p, d in [('A4', 1), ('C5', 1), ('E5', 1), ('D5', 1)]:
    n(t, 'recorder', p, d * BEAT * .9, .5, .15); t += d * BEAT
# C (12–20): fırça — her iz için bir glockenspiel notası (pentatonik yükselen), yumuşak marimba
PENTA = ['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7']
glints = sorted([e for e in ev if e['type'] == 'glint'], key=lambda e: e['t'])
for k, e in enumerate(glints): n(e['t'], 'glockenspiel', PENTA[min(k // 3, len(PENTA) - 1)], 1.4, .24, e.get('pan', 0))
for t, ps in [(12.0, ['C3', 'G3']), (14.5, ['F3', 'C4']), (17.0, ['G3', 'D4'])]:
    for p in ps: n(t, 'marimba', p, 2.0, .3, -.2)
# D (20–30): takip — temanın ilk yarısı iki kez, gitar C–Am–F–G
half = [('E5', 1), ('G5', 1), ('A5', .5), ('G5', .5), ('E5', 1), ('D5', 1), ('E5', .5), ('D5', .5), ('C5', 2)]
for t0, v in [(20.0, .45), (25.0, .55)]:
    t = t0
    for p, d in half: n(t, 'recorder', p, d * BEAT * .92, v, .1); t += d * BEAT
for i, ch in enumerate(['C', 'Am', 'F', 'G']): lilt(20.0 + i * BAR, ch, .45)
# E (30–33): neredeyse sessizlik; gözler parlayınca tek bir kontrbas notası
pl(31.2, 'upright_bass_pizz', 'A2', 1.5, .6, 0)
# F (33–43): tema tam — blok flüt + müzik kutusu, gitar C–Am–F–G–C
theme = [('E5', 1), ('G5', 1), ('A5', .5), ('G5', .5), ('E5', 1), ('D5', 1), ('E5', .5), ('D5', .5), ('C5', 2),
         ('A4', 1), ('C5', 1), ('D5', 1), ('G5', 1), ('E5', 2), ('D5', 2)]
t = 33.0
for p, d in theme:
    n(t, 'recorder', p, d * BEAT * .95, .58, .1); pl(t, 'music_box', p, 1.6, .36, .25); t += d * BEAT
for i, ch in enumerate(['C', 'Am', 'F', 'G']): lilt(33.0 + i * BAR, ch, .45)
# G (43–45): son nota biraz düşerek (yay boşalıyor)
pl(43.0, 'music_box', 'C5', 2.0, .4, .2); pl(43.0, 'nylon_guitar', 'C3', 2.0, .3, -.25); pl(44.4, 'music_box', 71.75, 1.5, .42, .2)

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

def wetbrush(d, direction):           # ıslak fırça: alçak geçişli gürültü + kıl dokusu, fırçayla birlikte panlı
    x = lp(noise(d), 1800) + .25 * bp(noise(d), 2500, 6000) * (rng.random(int(round(d * SR))) > .97)
    e = np.minimum(1, t_(d) / .15) * np.minimum(1, (d - t_(d)) / .4)
    return norm(x) * e
def bell(v=1.0):                      # uzak keçi çanı: uyumsuz kısmi sesler
    d = 1.6; tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * tt) * env_exp(d, tau) for f, a, tau in [(620, 1, .5), (1015, .6, .35), (1630, .4, .25), (2410, .2, .15)])
    clank = bp(noise(.04), 1500, 5000) * env_exp(.04, .008)
    x[:len(clank)] += clank * .5
    return lp(x, 4000) * v

room = norm(lp(noise(N / SR), 300)) * .006
amb[:len(room), 0] += room; amb[:len(room), 1] += room
for e in ev:
    t, ty, pan, g = e['t'], e['type'], e.get('pan', 0), e.get('g', 1)
    d = e.get('dur', .5)
    if ty == 'scratch': add(fx, crayon(d), t, .16 * g, pan)
    elif ty == 'scribble': add(fx, scribble(d), t, .14 * g, pan)
    elif ty == 'tick': add(fx, hp(noise(.03), 1500) * env_exp(.03, .006), t, .25 * g, pan)
    elif ty == 'hoof':
        add(fx, lp(S.hit('woodblock', 'a', .5).astype(float), 2500), t, .16 * g, pan); add(fx, soft_thump(110), t, .22 * g, pan)
    elif ty == 'paw': add(fx, soft_thump(150, .7), t, .2 * g, pan)
    elif ty == 'crickets': crickets(t, d, amb, .022)
    elif ty == 'wind': w = norm(lp(noise(d), 450)) * np.sin(np.pi * t_(d) / d) ** 2; add(amb, w, t, .04, -.3)
    elif ty == 'blinkeyes': [add(fx, S.note('glockenspiel', p, .4, .25).astype(float), t + j * .09, .25, pan) for j, p in enumerate(['E7', 'G7'])]
    elif ty == 'swish': add(fx, bp(noise(.22), 600, 4000) * np.sin(np.pi * t_(.22) / .22) ** 2, t, .12, pan)
    elif ty == 'yawn':
        tt = t_(1.2); f = 260 - 90 * tt / 1.2; x = bp(noise(1.2), 300, 1800) * .5 + np.sin(2 * np.pi * np.cumsum(f) / SR) * .3
        add(fx, x * np.sin(np.pi * tt / 1.2) ** 2, t, .1, pan)
    elif ty == 'droop': add(fx, chirp(900, 600, .25), t, .06, pan)
    elif ty == 'sniff': [add(fx, bp(noise(.07), 1500, 6000) * np.sin(np.pi * t_(.07) / .07), t + j * .11, .12, pan) for j in range(2)]
    elif ty == 'stomp': add(fx, soft_thump(80, 1.0), t, .35, pan)
    elif ty == 'brush': add(fx, wetbrush(d, e.get('dir', 1)), t, .1, -.6 * e.get('dir', 1))
    elif ty == 'twinkle': add(fx, S.note('glockenspiel', 'C8', .6, .3).astype(float), t, .3, pan)
    elif ty == 'rub': add(fx, bp(noise(.5), 800, 3000) * np.sin(np.pi * t_(.5) / .5) ** 2, t, .1, pan)
    elif ty == 'bell': add(amb, bell(), t, .1 * g, pan)

# ———————————————— Miksaj ————————————————
mix = mus + fx + amb
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
mix = mix[:int(DUR * SR)]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
sf.write(os.path.join(HERE, 'out', 'music.wav'), mus[:int(DUR * SR)].astype(np.float32), SR)
print('mix', mix.shape, 'peak', float(np.abs(mix).max()))
