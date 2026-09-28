"""herdr web ui 15초 프로모 음악을 직접 작곡·합성합니다 (128 BPM, 8마디 = 정확히 15.0초).

영상의 모든 모션은 같은 박자표(build/beatmap.json)를 기준으로 움직입니다.
  마디 1  (b0-4)   콜드 오픈 · 타이핑 · 라이저        → b4 첫 번째 드롭
  마디 2-5 (b4-20)  메인 그루브: Am | F | C | G       (채팅 · 승인 · 터미널 · 폰)
  마디 6  (b20-24) 스톱 타임 펀치 3번 + 스네어 롤     (No wrapper. No account. Yours only.)
  마디 7  (b24-28) 두 번째 드롭: F | G, 로고 조립
  마디 8  (b28-32) 마지막 히트 Cadd9 → 여운          (로고 락업 · URL)

필요: pip install numpy scipy pedalboard soundfile pyloudnorm
결과: build/music.wav (48kHz 스테레오), build/beatmap.json
"""
import json
import os

import numpy as np
import pedalboard as pb
import pyloudnorm
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
SR = 48000
BPM = 128
BEAT = 60.0 / BPM
DUR = 15.0
N = int(DUR * SR)
TAIL = 3 * SR
rng = np.random.default_rng(128)


def T(b):
    return b * BEAT


def hz(note):
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
             "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    name, octave = note[:-1], int(note[-1])
    midi = 12 * (octave + 1) + names[name]
    return 440.0 * 2 ** ((midi - 69) / 12)


# ------------------------------------------------------------------ 버스
class Bus:
    def __init__(self):
        self.x = np.zeros((2, N + TAIL))

    def add(self, sig, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
        end = min(self.x.shape[1], i + sig.shape[1])
        if end > i:
            self.x[:, i:end] += gain * sig[:, :end - i]


kickb, drums, perc, bass, pads, keys, fx, impact = Bus(), Bus(), Bus(), Bus(), Bus(), Bus(), Bus(), Bus()


# ------------------------------------------------------------------ 도구
def env_exp(n, decay, attack=0.002):
    t = np.arange(n) / SR
    e = np.exp(-t / decay)
    a = int(attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def adsr(n, a, d, s, r, gate):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = t > gate
    e[rel] = e[int(gate * SR) - 1 if int(gate * SR) > 0 else 0] * np.exp(-(t[rel] - gate) / max(r, 1e-6))
    return e


def sos(kind, f, order=2):
    if kind == "bp":
        return signal.butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], "bandpass", output="sos")
    return signal.butter(order, f / (SR / 2), kind, output="sos")


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x)


def saw(freq, n, phase=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,))
    dt = f / SR
    ph = (phase + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt[m]
    y[m] -= 2 * x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]
    y[m] -= x * x + 2 * x + 1
    return y


def sine(freq, n, phase=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,))
    return np.sin(2 * np.pi * (phase + np.cumsum(f) / SR))


def ladder_sweep(x, cut_start, cut_end, reso=0.25, curve=2.0, stereo=False):
    """시간에 따라 컷오프가 움직이는 24dB 래더 로우패스(블록 단위 처리)."""
    lf = pb.LadderFilter(mode=pb.LadderFilter.Mode.LPF24, cutoff_hz=cut_start, resonance=reso)
    data = x if x.ndim == 2 else x[None, :]
    out = np.zeros_like(data, dtype=np.float32)
    n = data.shape[1]
    blk = 256
    for i in range(0, n, blk):
        p = (i / max(n - 1, 1)) ** curve
        lf.cutoff_hz = float(cut_start * (cut_end / cut_start) ** p)
        out[:, i:i + blk] = lf.process(data[:, i:i + blk].astype(np.float32), SR, reset=(i == 0))
    return out if x.ndim == 2 else out[0]


def fx_chain(x, *plugins):
    return pb.Pedalboard(list(plugins))(x.astype(np.float32), SR)


# ------------------------------------------------------------------ 드럼
def kick(punch=1.0):
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    f = 46 + 190 * np.exp(-t / 0.032) + 40 * np.exp(-t / 0.12)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.30)
    body *= np.minimum(1, t / 0.0008)
    click = filt(rng.standard_normal(n), "highpass", 2500) * np.exp(-t / 0.0035)
    return np.tanh(1.8 * (body + 0.35 * punch * click)) * 0.95


def clap():
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    e = np.zeros(n)
    for k, d in enumerate([0.0, 0.010, 0.019, 0.027]):
        e += (t >= d) * np.exp(-np.maximum(t - d, 0) / (0.0045 if k < 3 else 0.16))
    y = filt(rng.standard_normal(n) * e, "bp", (950, 6500))
    return y / np.max(np.abs(y))


def snare(tone=190):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.045)
    noise = filt(rng.standard_normal(n), "bp", (1200, 9000)) * np.exp(-t / 0.085)
    y = 0.6 * body + noise
    return y / np.max(np.abs(y))


METAL = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]


def metal(n, scale=1.0):
    t = np.arange(n) / SR
    return sum(np.sign(np.sin(2 * np.pi * f * scale * t + rng.uniform(0, 6.28))) for f in METAL) / 6


def hat(open_=False):
    n = int((0.42 if open_ else 0.07) * SR)
    y = 0.55 * metal(n, 7.3) + 0.45 * rng.standard_normal(n)
    y = filt(y, "highpass", 7500, 4) * env_exp(n, 0.16 if open_ else 0.022, 0.0005)
    return y / np.max(np.abs(y))


def crash(dur=2.6):
    n = int(dur * SR)
    y = 0.5 * metal(n, 4.1) + rng.standard_normal(n)
    y = filt(y, "highpass", 4200, 2) * env_exp(n, 0.85, 0.001)
    y = np.vstack([y, np.roll(y, 211)])
    return y / np.max(np.abs(y))


# ------------------------------------------------------------------ 악기
def supersaw(notes, dur, cutoff=2600, detune=0.18, voices=7, release=0.25, attack=0.004):
    n = int((dur + release) * SR)
    out = np.zeros((2, n))
    spreads = np.linspace(-1, 1, voices)
    for note in notes:
        f0 = hz(note)
        for k, s in enumerate(spreads):
            cents = s * detune * 100
            v = saw(f0 * 2 ** (cents / 1200), n, rng.uniform(0, 1))
            pan = s * 0.8
            a = (pan + 1) * np.pi / 4
            out[0] += v * np.cos(a)
            out[1] += v * np.sin(a)
    out /= (voices * len(notes)) ** 0.5 * 2.2
    env = adsr(n, attack, 0.3, 0.8, release, dur)
    out *= env
    return ladder_sweep(out, cutoff, cutoff * 0.9, reso=0.1)


def pluck(note, dur=0.26, bright=5200, square=0.35):
    n = int((dur + 0.3) * SR)
    f = hz(note)
    t = np.arange(n) / SR
    v = saw(f, n) * (1 - square) + square * np.sign(np.sin(2 * np.pi * f * 1.003 * t))
    v = ladder_sweep(v, bright, 380, reso=0.3, curve=0.35)
    return v * adsr(n, 0.001, 0.14, 0.0, 0.08, dur) * 0.9


def bell(note, dur=1.2, ratio=3.5, index=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(note)
    mod = index * np.exp(-t / 0.25) * np.sin(2 * np.pi * f * ratio * t)
    return np.sin(2 * np.pi * f * t + mod) * env_exp(n, 0.45, 0.001)


def sub_note(note, dur):
    n = int((dur + 0.05) * SR)
    y = np.tanh(1.6 * (sine(hz(note), n) + 0.18 * sine(hz(note) * 2, n))) / np.tanh(1.6)
    return y * adsr(n, 0.004, 0.2, 0.9, 0.04, dur)


def mid_bass(note, dur=0.2):
    n = int((dur + 0.08) * SR)
    f = hz(note)
    v = 0.6 * saw(f, n) + 0.4 * saw(f * 1.004, n)
    v = ladder_sweep(v, 2200, 260, reso=0.35, curve=0.45)
    return np.tanh(1.4 * v * adsr(n, 0.002, 0.08, 0.55, 0.05, dur))


# ------------------------------------------------------------------ 효과음
def noise_sweep(dur, f_start, f_end, curve=1.6, reverse=False):
    n = int(dur * SR)
    x = rng.standard_normal((2, n))
    out = np.zeros((2, n))
    blk = 512
    for i in range(0, n, blk):
        p = (i / n) ** curve
        fc = f_start * (f_end / f_start) ** p
        b = sos("bp", (max(40, fc * 0.6), min(SR / 2 - 100, fc * 1.6)))
        out[:, i:i + blk] = signal.sosfilt(b, x[:, max(0, i - 2048):i + blk])[:, -min(blk, n - i):]
    return out[:, ::-1] if reverse else out


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = noise_sweep(dur, 300, 9000, curve=1.4)
    body *= (t / dur) ** 2.2
    tone = saw(180 * 2 ** (2.2 * t / dur), n) * (t / dur) ** 3 * 0.25
    tone = filt(tone, "lowpass", 3000)
    return body + np.vstack([tone, tone])


def whoosh(dur=0.42, up=True):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = noise_sweep(dur, 500 if up else 6000, 7000 if up else 400, curve=1.0)
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    pan = np.linspace(-0.8, 0.8, n)
    y[0] *= shape * np.cos((pan + 1) * np.pi / 4) * 1.4
    y[1] *= shape * np.sin((pan + 1) * np.pi / 4) * 1.4
    return y


def boom(dur=2.2, f0=62, f1=36):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.35)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.6, 0.002)
    body = np.sin(2 * np.pi * np.cumsum(95 + 60 * np.exp(-t / 0.05)) / SR) * env_exp(n, 0.12, 0.001)
    hit = filt(rng.standard_normal(n), "bp", (120, 2400)) * env_exp(n, 0.05, 0.001)
    return np.tanh(2.2 * (y + 0.55 * body + 0.45 * hit)) * 0.9


def key_click(pitch=1.0):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    tick = filt(rng.standard_normal(n), "bp", (2600 * pitch, 7800)) * np.exp(-t / 0.0045)
    thock = np.sin(2 * np.pi * 240 * pitch * t) * np.exp(-t / 0.012)
    return 0.8 * tick + 0.35 * thock


def ui_click():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.008)
    c = key_click(1.3)
    y[:len(c)] += 0.8 * c
    return y


# ------------------------------------------------------------------ 편곡
CHORDS = {
    "Am": (["A3", "C4", "E4", "A4"], "A1", "A2"),
    "F": (["A3", "C4", "F4", "A4"], "F1", "F2"),
    "C": (["G3", "C4", "E4", "G4"], "C2", "C3"),
    "G": (["G3", "B3", "D4", "G4"], "G1", "G2"),
    "E": (["G#3", "B3", "E4", "G#4"], "E1", "E2"),
    "Cadd9": (["G3", "C4", "D4", "E4", "G4"], "C2", "C3"),
}
ARP = {
    "Am": ["A4", "C5", "E5", "A5"], "F": ["A4", "C5", "F5", "A5"], "C": ["G4", "C5", "E5", "G5"],
    "G": ["G4", "B4", "D5", "G5"], "E": ["G#4", "B4", "E5", "G#5"],
}
ARP_ORDER = [0, 1, 2, 3, 2, 1, 2, 3]

kicks, claps, hats_c, hats_o, snares = [], [], [], [], []

# --- 마디 1: 콜드 오픈 -------------------------------------------------------
impact.add(boom(2.4), T(0), 1.2)
fx.add(crash(1.8), T(0), 0.2)
pads.add(ladder_sweep(supersaw(CHORDS["Am"][0], T(3.75), cutoff=900, release=0.05), 400, 2600, curve=2.5), T(0), 0.2)
bass.add(sub_note("A1", T(3.7)), T(0), 0.18)
type_beats = [0.5 + 0.25 * i for i in range(12)]              # "herdr web ui" 12글자
for i, b in enumerate(type_beats):
    perc.add(key_click(1.0 + 0.08 * ((i * 7) % 5 - 2)), T(b), 0.55, pan=0.25 * ((i % 3) - 1))
for b in [1, 2, 3]:                                            # 커서 깜빡임과 맞춘 부드러운 킥
    kicks.append(b)
    kickb.add(kick(0.3) * 0.45, T(b))
fx.add(riser(T(1.75)), T(2.0), 0.42)

# --- 마디 2-5: 메인 그루브 ------------------------------------------------------
prog = ["Am", "F", "C", "G"]
for bar, ch in enumerate(prog):
    b0 = 4 + 4 * bar
    notes, sub_n, mid_n = CHORDS[ch]
    pads.add(supersaw(notes, T(4) - 0.02, cutoff=3200), T(b0), 0.8)
    bass.add(sub_note(sub_n, T(4) - 0.02), T(b0), 0.55)
    for k in range(4):
        kicks.append(b0 + k)
        kickb.add(kick(), T(b0 + k))
        bass.add(mid_bass(mid_n, T(0.4)), T(b0 + k + 0.5), 0.6)
        hats_c.append(b0 + k + 0.5)
        perc.add(hat(), T(b0 + k + 0.5), 0.34, pan=0.2)
        for g in (0.25, 0.75):
            perc.add(hat(), T(b0 + k + g), 0.12, pan=-0.25)
    for k in (1, 3):
        claps.append(b0 + k)
        drums.add(clap(), T(b0 + k), 0.62)
    hats_o.append(b0 + 3.5)
    perc.add(hat(True), T(b0 + 3.5), 0.22, pan=0.3)
    for s in range(8):
        keys.add(pluck(ARP[ch][ARP_ORDER[s]]), T(b0 + 0.5 * s), 0.30, pan=0.35 if s % 2 else -0.35)
    # 선율 훅 (코드 톤만 사용)
    top = ARP[ch]
    for pos, note, length in [(0, top[2], 0.5), (0.75, top[1], 0.5), (1.5, top[2], 0.75), (2.5, top[3], 0.5), (3.0, top[2], 0.75)]:
        keys.add(bell(note.replace("5", "6") if note.endswith("5") else note, 0.9), T(b0 + pos), 0.10, pan=0.1)
    if bar in (0, 2):
        drums.add(crash(), T(b0), 0.38)
    fx.add(whoosh(0.44), T(b0 + 3.55), 0.5)
impact.add(boom(1.6, 70, 34), T(4), 0.5)
fx.add(ui_click(), T(10), 0.55)                                # 승인 탭
fx.add(bell("E6", 1.0), T(10.02), 0.16)
fx.add(bell("A6", 1.2), T(10.27), 0.14)
fx.add(bell("C#6", 0.8), T(19.0), 0.12)                        # 푸시 알림
fx.add(bell("E6", 1.0), T(19.25), 0.12)

# --- 마디 6: 스톱 타임 펀치 ----------------------------------------------------
for b, ch in [(20, "F"), (21, "G"), (22, "Am")]:
    notes, sub_n, mid_n = CHORDS[ch]
    kicks.append(b)
    claps.append(b)
    kickb.add(kick(1.2), T(b))
    drums.add(clap(), T(b), 0.5)
    pads.add(supersaw(notes, T(0.32), cutoff=4200, release=0.12), T(b), 1.0)
    bass.add(sub_note(sub_n, T(0.4)), T(b), 0.85)
    impact.add(boom(0.9, 80, 40), T(b), 0.35)
roll = [23 + i * 0.125 for i in range(6)] + [23.75 + i * 0.0625 for i in range(2)]
for i, b in enumerate(roll):
    snares.append(b)
    drums.add(snare(185 + 6 * i), T(b), 0.28 + 0.05 * i)
pads.add(ladder_sweep(supersaw(CHORDS["E"][0], T(0.9), cutoff=1200, release=0.02), 700, 5200), T(23), 0.6)
fx.add(riser(T(0.95)), T(23), 0.45)

# --- 마디 7: 두 번째 드롭 (로고 조립) -------------------------------------------
for half, ch in enumerate(["F", "G"]):
    b0 = 24 + 2 * half
    notes, sub_n, mid_n = CHORDS[ch]
    pads.add(supersaw(notes, T(2) - 0.02, cutoff=3800), T(b0), 0.85)
    bass.add(sub_note(sub_n, T(2) - 0.02), T(b0), 0.55)
    for k in range(2):
        b = b0 + k
        kicks.append(b)
        kickb.add(kick(), T(b))
        bass.add(mid_bass(mid_n, T(0.4)), T(b + 0.5), 0.6)
        perc.add(hat(), T(b + 0.5), 0.34, pan=0.2)
        for g in (0.25, 0.75):
            perc.add(hat(), T(b + g), 0.12, pan=-0.25)
    claps.append(b0 + 1)
    drums.add(clap(), T(b0 + 1), 0.62)
    for s in range(4):
        keys.add(pluck(ARP[ch][ARP_ORDER[s]]), T(b0 + 0.5 * s), 0.32, pan=0.35 if s % 2 else -0.35)
drums.add(crash(), T(24), 0.45)
for b, note in [(24.5, "E6"), (24.625, "G6"), (24.75, "C7")]:  # 창 상단 점 3개
    fx.add(bell(note, 0.5, ratio=2.0, index=1.2), T(b), 0.10)
fx.add(whoosh(0.4), T(25.1), 0.35)                             # 뿔 회전
fx.add(ui_click(), T(26), 0.6)                                 # 커서 클릭
fx.add(whoosh(0.5, up=False), T(26.4), 0.3)
rev = crash(1.2)[:, ::-1]                                       # 리버스 심벌 → 마지막 히트
fx.add(rev * 0.5, T(28) - rev.shape[1] / SR, 0.9)

# --- 마디 8: 마지막 히트 ------------------------------------------------------
notes, sub_n, mid_n = CHORDS["Cadd9"]
kicks.append(28)
kickb.add(kick(1.3), T(28))
drums.add(crash(3.2), T(28), 0.55)
impact.add(boom(2.6, 70, 30), T(28), 0.85)
fin = supersaw(notes, T(3.4), cutoff=3600, release=0.6)
fin *= np.exp(-np.arange(fin.shape[1]) / SR / 1.1)[None, :] * 0.75 + 0.25 * np.exp(-np.arange(fin.shape[1]) / SR / 0.25)[None, :]
pads.add(fin, T(28), 1.1)
pads.add(supersaw(["C5", "E5", "G5"], T(1.2), cutoff=5200, release=1.5), T(28), 0.25)
bass.add(sub_note(sub_n, T(3.2)) * np.exp(-np.arange(int((T(3.2) + 0.05) * SR)) / SR / 1.0), T(28), 0.8)
for s, note in enumerate(["C5", "E5", "G5", "D6", "E6", "G6"]):
    keys.add(pluck(note, 0.3), T(28 + 0.25 * s), 0.22 - 0.025 * s, pan=-0.5 + 0.2 * s)
fx.add(bell("G6", 1.4), T(28), 0.10)
perc.add(key_click(1.1), T(30), 0.35)                          # 마지막 커서 깜빡임
perc.add(key_click(1.1), T(31), 0.25)

# ------------------------------------------------------------------ 사이드체인
def sidechain(beats, depth=0.72, release=0.19):
    g = np.ones(N + TAIL)
    t = np.arange(N + TAIL) / SR
    for b in beats:
        tb = T(b)
        i = int(tb * SR)
        seg = t[i:] - tb
        dip = depth * np.exp(-seg / release) * (seg < 0.6)
        g[i:] = np.minimum(g[i:], 1 - dip)
    return g

pump = sidechain(kicks)
pads.x *= pump
bass.x *= sidechain(kicks, 0.85, 0.14)
keys.x *= sidechain(kicks, 0.35, 0.12)

# ------------------------------------------------------------------ 믹스 & 마스터
def peak_limit(x, ceiling_db=-1.0, lookahead_ms=4.0, release_ms=90.0):
    """룩어헤드 피크 리미터(스테레오 연동). 메이크업 게인 없이 피크만 누름."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    ceiling = 10 ** (ceiling_db / 20)
    need = np.minimum(1.0, ceiling / np.maximum(np.max(np.abs(x), axis=0), 1e-9))
    la = int(lookahead_ms * SR / 1000)
    g = minimum_filter1d(need, size=2 * la + 1)
    rel = np.exp(-1.0 / (release_ms * SR / 1000))
    out = np.empty_like(g)
    prev = 1.0
    for i, v in enumerate(g):
        prev = v if v < prev else rel * prev + (1 - rel) * v
        out[i] = prev
    out = np.minimum(uniform_filter1d(out, la), need)
    return np.clip(x * out[None, :], -ceiling, ceiling)


def send_reverb(x, room, level, hp=400, lp=9000):
    """리버브는 보내기(send)로만 걸고, 저음을 깎아 탁해지지 않게 함."""
    wet = fx_chain(x, pb.Reverb(room_size=room, wet_level=1.0, dry_level=0.0, width=1.0),
                   pb.HighpassFilter(hp), pb.LowpassFilter(lp))
    return wet * level

k = fx_chain(kickb.x, pb.Compressor(threshold_db=-8, ratio=2.5, attack_ms=6, release_ms=80))
d = fx_chain(drums.x, pb.HighpassFilter(160), pb.Compressor(threshold_db=-12, ratio=3, attack_ms=2, release_ms=90),
             pb.Distortion(drive_db=2))
d = d + send_reverb(drums.x, 0.35, 0.16, hp=500)
pc = fx_chain(perc.x, pb.HighpassFilter(400)) + send_reverb(perc.x, 0.2, 0.06, hp=900)
bs = fx_chain(bass.x, pb.LowpassFilter(1600))
bs[1] = bs[0] = bs.mean(axis=0)                       # 저음은 모노
pd = fx_chain(pads.x, pb.HighpassFilter(170), pb.Chorus(rate_hz=0.5, depth=0.25, mix=0.3))
pd = pd + send_reverb(pd, 0.7, 0.28, hp=450)
ky = fx_chain(keys.x, pb.HighpassFilter(280), pb.Delay(delay_seconds=T(0.75), feedback=0.3, mix=0.2))
ky = ky + send_reverb(ky, 0.6, 0.3, hp=500)
fxx = fx_chain(fx.x, pb.HighpassFilter(180)) + send_reverb(fx.x, 0.85, 0.3, hp=500)
imp = fx_chain(impact.x, pb.LowpassFilter(2600))

mix = 1.0 * k + 0.95 * d + 0.8 * pc + 0.8 * bs + 1.0 * pd + 1.1 * ky + 0.75 * fxx + 0.8 * imp
mix = mix[:, :N]
fade = np.ones(N)
fade[-int(0.35 * SR):] = np.linspace(1, 0, int(0.35 * SR)) ** 2
mix *= fade
mix = fx_chain(mix, pb.HighpassFilter(30), pb.LowShelfFilter(cutoff_frequency_hz=70, gain_db=-2.5),
               pb.PeakFilter(cutoff_frequency_hz=2800, gain_db=1.5, q=0.8), pb.HighShelfFilter(cutoff_frequency_hz=9000, gain_db=2.0),
               pb.Compressor(threshold_db=-16, ratio=1.8, attack_ms=20, release_ms=150))

meter = pyloudnorm.Meter(SR)
lufs = meter.integrated_loudness(mix.T)
mix *= 10 ** ((-14.5 - lufs) / 20)
mix = peak_limit(mix, -1.0)
peak = np.max(np.abs(mix))
if peak > 10 ** (-1.0 / 20):                          # 최종 피크 -1 dBFS 이하 보장
    mix *= 10 ** (-1.0 / 20) / peak

os.makedirs(BUILD, exist_ok=True)
sf.write(os.path.join(BUILD, "music.wav"), mix.T, SR, subtype="PCM_24")
beatmap = {
    "bpm": BPM, "beat": BEAT, "duration": DUR,
    "kicks": sorted(set(kicks)), "claps": sorted(set(claps)), "snares": snares,
    "type": type_beats, "hats_open": hats_o,
    "sections": {"coldOpen": 0, "drop1": 4, "chat": 4, "approve": 8, "tap": 10, "terminal": 12,
                 "phone": 16, "notify": 19, "punch": 20, "roll": 23, "drop2": 24, "logoDots": 24.5,
                 "horn": 25, "click": 26, "finalHit": 28, "end": 32},
}
json.dump(beatmap, open(os.path.join(BUILD, "beatmap.json"), "w"), indent=1)
print(f"music.wav 저장: {DUR}s, 원래 {lufs:.1f} LUFS → -14 LUFS, 피크 {20*np.log10(np.max(np.abs(mix))):.1f} dBFS")
