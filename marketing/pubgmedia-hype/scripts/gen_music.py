"""Synthesises the 30s hype track (120 BPM, A minor) to public/music.wav.

Grid: 1 beat = 0.5s = 15 frames @30fps, 1 bar = 60 frames. The arrangement
mirrors the edit in src/timeline.ts, so every scene cut lands on a hit.
"""
import wave
import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
DUR = 30.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
out = np.zeros((N, 2))


def t_of(n):
    return np.arange(n) / SR


def place(buf, start_s, gain=1.0, pan=0.0):
    i = int(start_s * SR)
    if i >= N:
        return
    buf = buf[: N - i]
    left = gain * np.cos((pan + 1) * np.pi / 4)
    right = gain * np.sin((pan + 1) * np.pi / 4)
    out[i : i + len(buf), 0] += buf * left * 1.414
    out[i : i + len(buf), 1] += buf * right * 1.414


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def kick(length=0.45, punch=1.0):
    t = t_of(int(SR * length))
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.35
    return np.tanh((body + click) * 1.8 * punch)


def clap():
    t = t_of(int(SR * 0.3))
    n = rng.standard_normal(len(t))
    env = np.zeros_like(t)
    for d in (0, 0.011, 0.022):
        env += np.where(t >= d, np.exp(-(t - d) * 60), 0)
    env += np.exp(-t * 14) * 0.5
    hp = n - lowpass(n, 1200)
    return hp * env * 0.55


def hat(open_=False):
    t = t_of(int(SR * (0.25 if open_ else 0.06)))
    n = rng.standard_normal(len(t))
    hp = n - lowpass(n, 7000)
    return hp * np.exp(-t * (14 if open_ else 70)) * 0.22


def impact(length=2.5):
    t = t_of(int(SR * length))
    f = 30 + 90 * np.exp(-t * 6)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    n = rng.standard_normal(len(t))
    noise = lowpass(n, 2500) * np.exp(-t * 3.0) * 0.9
    return np.tanh((sub * 1.4 + noise) * 1.6) * 0.9


def riser(length):
    t = t_of(int(SR * length))
    n = rng.standard_normal(len(t))
    prog = t / length
    # crude sweep: blend low- and high-passed noise as it rises
    lp = lowpass(n, 600)
    x = lp * (1 - prog) + (n - lp) * prog
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1400 * prog**2) / SR) * 0.25
    return (x * 0.35 + tone) * prog**1.6


def saw(freq, length, cutoff=900, decay=3.0):
    t = t_of(int(SR * length))
    x = 2 * ((t * freq) % 1) - 1
    x += 2 * ((t * freq * 1.007) % 1) - 1
    x = lowpass(x * 0.5, cutoff)
    return x * np.exp(-t * decay)


def pluck(freq, length=0.35):
    t = t_of(int(SR * length))
    x = np.sign(np.sin(2 * np.pi * freq * t)) * 0.5 + np.sin(2 * np.pi * freq * 2 * t) * 0.3
    return lowpass(x, 3000) * np.exp(-t * 9) * 0.35


def sub(freq, length):
    t = t_of(int(SR * length))
    env = np.minimum(1, t * 80) * np.exp(-t * 1.2)
    return np.sin(2 * np.pi * freq * t) * env


# A minor: Am F C G  (bass roots)
ROOTS = [55.0, 43.65, 65.41, 49.0]
ARP = [[220, 261.6, 329.6, 440], [174.6, 220, 261.6, 349.2], [261.6, 329.6, 392, 523.3], [196, 246.9, 293.7, 392]]

K = kick()
C = clap()
H = hat()
HO = hat(True)

# ---- Arrangement (seconds) ----
# 0      hook impact
# 0-4    tension: kick + hats, filtered bass
# 4-8    brand reveal: full drums
# 7-8    riser -> DROP at 8
# 8-17   services: full drop
# 17-21  showcase: half-time groove, arps
# 21-24  trusted by: drums back, riser 23-24
# 24-27  crescendo: 16th kicks roll
# 27     final hit, logo, decay to 30

place(impact(3.0), 0, 1.0)
place(riser(0.9), 1.1, 0.55)

beats = int(DUR / BEAT)
for b in range(beats):
    s = b * BEAT
    bar = b // 4
    pos = b % 4
    if s >= 27:
        break
    in_half = 17 <= s < 21
    if s >= 2 and not in_half:
        place(K, s, 0.95)
    if in_half and pos in (0,):
        place(K, s, 0.95)
    if in_half and pos == 2:
        place(C, s, 0.8)
    if s >= 4 and not in_half and pos in (1, 3):
        place(C, s, 0.75, 0.05)
    # hats
    if s >= 2:
        for q in range(4 if s >= 8 else 2):
            off = q * BEAT / (4 if s >= 8 else 2)
            h = HO if (q == 2 and s >= 8 and not in_half) else H
            place(h, s + off, 0.8 if q % 2 else 0.5, 0.3 if q % 2 else -0.3)
    # bass: offbeat pumping 8ths
    root = ROOTS[bar % 4]
    if s >= 2:
        cut = 350 if s < 8 else 1100
        for q in (0.5,):
            place(saw(root * 2, BEAT * 0.45, cut, 6), s + BEAT * q, 0.55)
        place(sub(root, BEAT * 0.9), s, 0.65 if s >= 8 else 0.4)
    # arps in drop + showcase
    if (8 <= s < 17) or in_half or (21 <= s < 27):
        notes = ARP[bar % 4]
        for q in range(4):
            place(pluck(notes[(pos + q) % 4] * (2 if in_half else 1)), s + q * BEAT / 4, 0.45 if in_half else 0.3, -0.4 + 0.25 * q)

# risers into drops
place(riser(1.0), 7.0, 0.7)
place(riser(1.0), 16.0, 0.5)
place(riser(2.0), 22.0, 0.75)
# drop impacts
for s in (4, 8, 17, 21, 24):
    place(impact(1.4), s, 0.55)
# crescendo: kick roll 26-27
for i in range(8):
    place(kick(0.2, 0.8), 26 + i * BEAT / 4, 0.5 + i * 0.05)
# final hit + tail
place(impact(3.0), 27.0, 1.0)
for i, f in enumerate([220, 261.6, 329.6, 440, 523.3]):
    place(saw(f, 3.0, 1600, 1.1), 27.0, 0.18, -0.6 + 0.3 * i)

# master: soft clip + fade tail
out = np.tanh(out * 0.9)
fade = np.ones(N)
fade[-int(SR * 0.6):] = np.linspace(1, 0, int(SR * 0.6))
out *= fade[:, None]
out /= np.max(np.abs(out)) / 0.95

pcm = (out * 32767).astype(np.int16)
with wave.open("public/music.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote public/music.wav")
