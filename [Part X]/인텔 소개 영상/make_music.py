"""인텔 소개 + INTC 주가 15초 영상의 음악을 직접 작곡·합성합니다 (128 BPM, 8마디 = 정확히 15.0초, D♭장조).

영상의 모든 모션은 같은 박자표(build/beatmap.json)를 기준으로 움직입니다.
  마디 1 (b0-4)    점 하나 → 픽셀이 16분음표마다 모여 로고가 됨 → b2 로고 스냅, 라이저
  마디 2 (b4-8)    그루브 G♭ | A♭ — 제품 카드 3장이 박마다 착지
  마디 3 (b8-11)   B♭m 그루브, 차트 등장 → b10 테이프 스톱(2024 폭락) → b11 바닥 충돌 붐 + 글리치
  마디 4 (b11-16)  어두운 드론·심장박동 → 스네어 롤·라이저 빌드업
  마디 5 (b16-20)  드롭 D♭ | A♭ — 2025 +84%, 2026 막대가 로켓처럼 상승
  마디 6 (b20-24)  b20 2000년 최고가(천장) 돌파: 임팩트 + 유리 파편, B♭m | G♭
  마디 7 (b24-28)  G♭ | A♭ — +233%, 스네어 필
  마디 8 (b28-32)  D♭ — 5음 사운드 로고 오마주(D♭ D♭ G♭ D♭ A♭) + 여운

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
rng = np.random.default_rng(1968)


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
        if i < 0:
            sig, i = sig[:, -i:], 0
        end = min(self.x.shape[1], i + sig.shape[1])
        if end > i:
            self.x[:, i:end] += gain * sig[:, :end - i]


NAMES = ["kick", "drums", "perc", "bass", "pads", "keys", "fx", "impact"]
# A: 폭락 전(b0~b10, 테이프 스톱으로 멈춤) / B: 폭락 이후
A = {k: Bus() for k in NAMES}
Bq = {k: Bus() for k in NAMES}


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


def ladder_sweep(x, cut_start, cut_end, reso=0.25, curve=2.0):
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
        for s in spreads:
            v = saw(f0 * 2 ** (s * detune / 12), n, rng.uniform(0, 1))
            a = (s * 0.8 + 1) * np.pi / 4
            out[0] += v * np.cos(a)
            out[1] += v * np.sin(a)
    out /= (voices * len(notes)) ** 0.5 * 2.2
    out *= adsr(n, attack, 0.3, 0.8, release, dur)
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


def mallet(note, dur=1.8, decay=0.9):
    """사운드 로고용 말렛 벨: 맑은 사인 + 짧은 FM 어택 + 옥타브 배음."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(note)
    mod = 1.5 * np.exp(-t / 0.045) * np.sin(2 * np.pi * f * 4.0 * t)
    y = np.sin(2 * np.pi * f * t + mod) * env_exp(n, decay, 0.0015)
    y += 0.32 * np.sin(2 * np.pi * f * 2.0 * t) * env_exp(n, decay * 0.4, 0.0015)
    y += 0.10 * np.sin(2 * np.pi * f * 3.02 * t) * env_exp(n, 0.12, 0.001)
    return y / 1.25


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


def riser(dur, top=9000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = noise_sweep(dur, 300, top, curve=1.4) * (t / dur) ** 2.2
    tone = filt(saw(180 * 2 ** (2.2 * t / dur), n) * (t / dur) ** 3 * 0.25, "lowpass", 3000)
    return body + np.vstack([tone, tone])


def rocket(dur):
    """2026 막대가 치솟을 때: 두 옥타브 상승하는 톱니 + 노이즈."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    f = hz("Ab2") * 2 ** (2.0 * p ** 1.6)
    tone = 0.5 * saw(f, n) + 0.5 * saw(f * 1.007, n)
    tone = ladder_sweep(tone, 500, 7000, reso=0.35, curve=1.3) * p ** 1.5
    air = noise_sweep(dur, 800, 11000, curve=1.2) * p[None, :] ** 2.5
    return np.vstack([tone, tone]) * 0.6 + air * 0.8


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


def blip(f=1760, dur=0.09):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env_exp(n, 0.018, 0.0005) + 0.25 * np.sin(2 * np.pi * f * 2 * t) * env_exp(n, 0.008, 0.0005)


def tick(pitch=1.0):
    n = int(0.04 * SR)
    t = np.arange(n) / SR
    y = filt(rng.standard_normal(n), "bp", (3000 * pitch, 9000)) * np.exp(-t / 0.003)
    return y + 0.4 * np.sin(2 * np.pi * 2600 * pitch * t) * np.exp(-t / 0.006)


def glitch(dur=0.5, seed=0):
    """디지털 글리치: 짧은 사각파·노이즈 조각이 끊기며 튐."""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros((2, n))
    pos = 0
    while pos < n:
        ln = int(g.uniform(0.008, 0.035) * SR)
        if g.random() < 0.72:
            t = np.arange(ln) / SR
            f = g.choice([110, 220, 330, 440, 880, 1320, 1760]) * g.uniform(0.98, 1.02)
            seg = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + g.standard_normal(ln) * 0.25
            seg = np.round(seg * 6) / 6                      # 비트 크러시
            seg *= np.hanning(ln) ** 0.2
            p = g.uniform(-0.9, 0.9)
            out[0, pos:pos + ln] += seg[:n - pos] * np.cos((p + 1) * np.pi / 4)
            out[1, pos:pos + ln] += seg[:n - pos] * np.sin((p + 1) * np.pi / 4)
        pos += ln + int(g.uniform(0.0, 0.02) * SR)
    return out * np.linspace(1, 0.3, n)[None, :]


def shatter(dur=1.6, seed=7):
    """유리 천장이 깨지는 소리: 크랙 + 고음 핑 파편 수십 개 + 노이즈 버스트."""
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros((2, n))
    t = np.arange(n) / SR
    crack = filt(g.standard_normal(n), "highpass", 1800) * np.exp(-t / 0.018)
    out += np.vstack([crack, np.roll(crack, 37)]) * 0.9
    for _ in range(46):
        st = int((g.random() ** 2.2) * 0.45 * SR)
        f = g.uniform(2400, 9500)
        d = g.uniform(0.02, 0.14)
        ln = min(n - st, int(0.6 * SR))
        tt = np.arange(ln) / SR
        ping = np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) * g.uniform(0.15, 0.5)
        p = g.uniform(-1, 1)
        out[0, st:st + ln] += ping * np.cos((p + 1) * np.pi / 4)
        out[1, st:st + ln] += ping * np.sin((p + 1) * np.pi / 4)
    sprinkle = filt(g.standard_normal((2, n)), "highpass", 5000) * (np.exp(-t / 0.25) * 0.25)[None, :]
    return out + sprinkle


def sub_drop(dur=1.2, f0=90, f1=28):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.25)
    return np.tanh(1.5 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * env_exp(n, 0.5, 0.003)


def drone(note, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(note)
    v = 0.5 * saw(f, n) + 0.5 * saw(f * 1.006, n) + 0.6 * sine(f / 2, n)
    v = filt(v, "lowpass", 260, 2)
    wob = 1 + 0.25 * np.sin(2 * np.pi * 0.9 * t)
    return v * wob * np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.2)


def tape_stop(x, t0, dur, curve=1.5):
    """t0부터 dur 동안 테이프가 멈추듯 속도·음정이 0으로 떨어지고, 이후는 무음."""
    i0, n = int(t0 * SR), int(dur * SR)
    speed = (1 - np.arange(n) / n) ** curve
    pos = i0 + np.cumsum(speed)
    idx = np.floor(pos).astype(int)
    frac = pos - idx
    seg = x[:, idx] * (1 - frac) + x[:, idx + 1] * frac
    seg *= (1 - np.arange(n) / n)[None, :] ** 0.6
    x[:, i0:i0 + n] = seg
    x[:, i0 + n:] = 0


# ------------------------------------------------------------------ 편곡
CHORDS = {
    "Db": (["Db4", "F4", "Ab4", "Db5"], "Db2", "Db3"),
    "Gb": (["Db4", "Gb4", "Bb4", "Db5"], "Gb1", "Gb2"),
    "Ab": (["C4", "Eb4", "Ab4", "C5"], "Ab1", "Ab2"),
    "Bbm": (["Db4", "F4", "Bb4", "Db5"], "Bb1", "Bb2"),
}
ARP = {
    "Db": ["Ab4", "Db5", "F5", "Ab5"], "Gb": ["Bb4", "Db5", "Gb5", "Bb5"],
    "Ab": ["Ab4", "C5", "Eb5", "Ab5"], "Bbm": ["Bb4", "Db5", "F5", "Bb5"],
}
ARP_ORDER = [0, 1, 2, 3, 2, 1, 2, 3]
kicks_a, kicks_b, claps, snares = [], [], [], []


def groove(S, kicks, b0, beats, ch, pad_gain=0.8, arp=True, clap_beats=(1, 3), cutoff=3200, hat_gain=1.0, lift=False, level=1.0):
    """b0부터 beats박 동안: 코드 패드 + 서브·미드 베이스 + 4비트 킥 + 클랩 + 하이햇 + 플럭 아르페지오."""
    L = level
    notes, sub_n, mid_n = CHORDS[ch]
    S["pads"].add(supersaw(notes, T(beats) - 0.02, cutoff=cutoff), T(b0), pad_gain * L)
    if lift:                                                    # 드롭 이후: 한 옥타브 위 레이어로 더 크게
        S["pads"].add(supersaw([n_[:-1] + str(int(n_[-1]) + 1) for n_ in notes[1:]], T(beats) - 0.02, cutoff=6500), T(b0), 0.2 * L)
    S["bass"].add(sub_note(sub_n, T(beats) - 0.02), T(b0), 0.55 * L)
    for k in range(beats):
        b = b0 + k
        kicks.append(b)
        S["kick"].add(kick() * L, T(b))
        S["bass"].add(mid_bass(mid_n, T(0.4)), T(b + 0.5), 0.6 * L)
        S["perc"].add(hat(lift and k % 2 == 1), T(b + 0.5), 0.34 * hat_gain * L, pan=0.2)
        for g in (0.25, 0.75):
            S["perc"].add(hat(), T(b + g), 0.12 * hat_gain * L, pan=-0.25)
        if k in clap_beats:
            claps.append(b)
            S["drums"].add(clap(), T(b), 0.62 * L)
        if arp:
            for s in range(2):
                note = ARP[ch][ARP_ORDER[(2 * k + s) % 8]]
                S["keys"].add(pluck(note), T(b + 0.5 * s), 0.30 * L, pan=0.35 if s else -0.35)


# --- 마디 1: 점 → 픽셀 → 로고 (A) -------------------------------------------
A["impact"].add(boom(1.8, 58, 34), T(0), 0.75)
A["fx"].add(blip(1760), T(0), 0.5)
A["fx"].add(blip(3520, 0.06), T(0.02), 0.18)
A["pads"].add(ladder_sweep(supersaw(CHORDS["Bbm"][0], T(3.9), cutoff=900, release=0.05), 350, 2400, curve=2.2), T(0), 0.22)
A["bass"].add(sub_note("Bb1", T(1.95)), T(0), 0.16)
A["fx"].add(whoosh(T(0.6), up=True), T(0.3), 0.22)              # 점이 제자리로 날아감
A["fx"].add(blip(2637, 0.07), T(0.95), 0.12)                    # 점이 자리 잡음
pixel_beats = [1.0 + 0.25 * i for i in range(4)]               # 픽셀이 글자를 찍어내는 16분음표 4번
for i, (b, note) in enumerate(zip(pixel_beats, ["Bb4", "Db5", "F5", "Bb5"])):
    A["keys"].add(pluck(note, 0.2, bright=6500), T(b), 0.34, pan=-0.5 + 0.2 * i)
    A["fx"].add(blip(hz(note) * 2, 0.05), T(b), 0.07, pan=-0.5 + 0.2 * i)
# b2 로고 스냅
kicks_a.append(2)
A["kick"].add(kick(1.2), T(2))
A["drums"].add(clap(), T(2), 0.5)
claps.append(2)
for note, g in [("F6", 0.12), ("Bb6", 0.10), ("Db7", 0.08)]:
    A["fx"].add(bell(note, 1.4), T(2), g)
A["fx"].add(crash(1.6), T(2), 0.16)
A["bass"].add(sub_note("Bb1", T(2) - 0.02), T(2), 0.4)
kicks_a.append(3)
A["kick"].add(kick(0.5) * 0.7, T(3))
for b in (2.5, 3.5):
    A["perc"].add(hat(), T(b), 0.3, pan=0.2)
for s in range(4):
    A["keys"].add(pluck(ARP["Bbm"][ARP_ORDER[s]], 0.22), T(2 + 0.5 * s), 0.2, pan=0.35 if s % 2 else -0.35)
A["fx"].add(riser(T(1.5)), T(2.5), 0.4)
rev = crash(1.0)[:, ::-1]
A["fx"].add(rev, T(4) - rev.shape[1] / SR, 0.35)
A["fx"].add(whoosh(T(0.5)), T(3.5), 0.4)                       # 점 속으로 줌

# --- 마디 2: 제품 카드 (A) ---------------------------------------------------
groove(A, kicks_a, 4, 2, "Gb", pad_gain=0.7, cutoff=2600, level=0.72)
groove(A, kicks_a, 6, 2, "Ab", pad_gain=0.7, cutoff=2600, level=0.72)
A["drums"].add(crash(), T(4), 0.4)
A["impact"].add(boom(1.4, 70, 36), T(4), 0.55)
for b in (4.5, 5.5, 6.5):                                       # 카드가 착지하는 엇박
    A["impact"].add(boom(0.6, 90, 45), T(b), 0.3)
    A["fx"].add(whoosh(0.26), T(b) - 0.24, 0.3)
A["fx"].add(whoosh(T(0.5)), T(7.5), 0.5)                       # 휩 → 차트

# --- 마디 3: 차트, 2023 → 2024 (A) --------------------------------------------
groove(A, kicks_a, 8, 2, "Bbm", pad_gain=0.7, cutoff=2400, level=0.72)
for i, b in enumerate([8.0, 8.125, 8.25, 8.375]):               # 눈금선이 그려지는 틱
    A["perc"].add(tick(1.0 + 0.1 * i), T(b), 0.25, pan=-0.3 + 0.2 * i)
A["fx"].add(whoosh(0.3), T(8.5) - 0.12, 0.25)                    # 2023 막대 상승
A["fx"].add(blip(1320, 0.08), T(9), 0.12)                       # 2024 막대 등장

# ------------------------------------------------------------------ 폭락 이후 (B)
# b10-11 테이프 스톱 동안 막대가 무너지고, b11 바닥에 부딪힘
Bq["impact"].add(boom(2.4, 55, 26), T(11), 1.1)
Bq["impact"].add(sub_drop(1.4), T(11), 0.6)
Bq["fx"].add(glitch(0.42, 3), T(11), 0.5)
Bq["fx"].add(glitch(0.2, 9), T(12.5), 0.25)
Bq["fx"].add(noise_sweep(T(1.0), 4000, 200, curve=0.8) * 0.5, T(10), 0.35)   # 하강 스윕
Bq["pads"].add(drone("Bb1", T(5.0)), T(11), 0.38)
for b in (12, 12.3, 13, 13.3):                                  # 심장박동
    Bq["kick"].add(filt(kick(0.2), "lowpass", 400) * (0.55 if b % 1 == 0 else 0.35), T(b))
# b13-16 빌드업
Bq["pads"].add(ladder_sweep(supersaw(CHORDS["Ab"][0], T(3.0), cutoff=900, release=0.02), 300, 6500, curve=1.8), T(13), 0.55)
n_ = int(T(3.0) * SR)
p_ = np.arange(n_) / n_
Bq["bass"].add(np.tanh(1.5 * sine(hz("Ab1") * 2 ** (p_ ** 2), n_)) * p_ ** 1.5, T(13), 0.3)   # 올라가는 서브
Bq["fx"].add(riser(T(3.0), top=11000), T(13), 0.5)
roll = [13 + 0.5 * i for i in range(3)] + [14.5 + 0.25 * i for i in range(4)] + [15.5 + 0.125 * i for i in range(3)]
for i, b in enumerate(roll):
    snares.append(b)
    Bq["drums"].add(snare(180 + 8 * i), T(b), 0.16 + 0.03 * i)
rev = crash(1.2)[:, ::-1]
Bq["fx"].add(rev, T(16) - rev.shape[1] / SR, 0.4)

# --- 마디 5: 드롭 (B) --------------------------------------------------------
groove(Bq, kicks_b, 16, 2, "Db", pad_gain=0.9, cutoff=3800, hat_gain=1.3, lift=True)
groove(Bq, kicks_b, 18, 2, "Ab", pad_gain=0.9, cutoff=3800, hat_gain=1.3, lift=True)
Bq["drums"].add(crash(), T(16), 0.5)
Bq["impact"].add(boom(1.8, 72, 34), T(16), 0.8)
Bq["pads"].add(supersaw(["Ab5", "Db6"], T(2), cutoff=5200, release=0.4), T(16), 0.16)
hook = [(16, "F5", 0.5), (16.75, "Ab5", 0.5), (17.5, "Bb5", 0.5), (18, "Ab5", 0.75), (18.75, "Eb5", 0.5), (19.25, "F5", 0.5)]
for b, note, ln in hook:
    Bq["keys"].add(bell(note, 1.0), T(b), 0.12, pan=0.1)
for i, note in enumerate(["Db6", "F6", "Ab6"]):                   # 2000년 기록선이 그려짐
    Bq["fx"].add(blip(hz(note), 0.08), T(17 + 0.125 * i), 0.09, pan=-0.4 + 0.4 * i)
Bq["fx"].add(rocket(T(2.0)), T(18), 0.42)                       # 2026 막대 상승
for i, b in enumerate([19.5 + 0.125 * k for k in range(4)]):
    snares.append(b)
    Bq["drums"].add(snare(200 + 10 * i), T(b), 0.2 + 0.04 * i)

# --- 마디 6: 천장 돌파 (B) ---------------------------------------------------
groove(Bq, kicks_b, 20, 2, "Bbm", pad_gain=0.9, cutoff=3800, hat_gain=1.3, lift=True)
groove(Bq, kicks_b, 22, 2, "Gb", pad_gain=0.9, cutoff=3800, hat_gain=1.3, lift=True)
Bq["impact"].add(boom(2.2, 66, 30), T(20), 1.0)
Bq["fx"].add(shatter(1.8), T(20), 0.55)
Bq["drums"].add(crash(3.0), T(20), 0.55)
for i in range(8):                                              # 가격 카운터가 도는 틱
    Bq["perc"].add(tick(1.3 + 0.05 * i), T(20.25 + 0.0625 * i), 0.10, pan=0.3)
Bq["fx"].add(bell("Db7", 1.2), T(21), 0.10)                     # 기록 라벨
Bq["impact"].add(boom(0.6, 90, 45), T(22), 0.25)                 # 9월 막대
for b, note in [(20, "Bb5"), (20.75, "Db6"), (21.5, "F5"), (22, "Gb5"), (22.75, "Bb5"), (23.25, "Db6")]:
    Bq["keys"].add(bell(note, 1.0), T(b), 0.11, pan=-0.1)
Bq["fx"].add(whoosh(T(0.5)), T(23.5), 0.4)

# --- 마디 7: +233% (B) --------------------------------------------------------
groove(Bq, kicks_b, 24, 2, "Gb", pad_gain=0.95, cutoff=4200, hat_gain=1.4, lift=True)
groove(Bq, kicks_b, 26, 2, "Ab", pad_gain=0.95, cutoff=4200, hat_gain=1.4, lift=True)
Bq["drums"].add(crash(), T(24), 0.5)
Bq["impact"].add(boom(1.6, 70, 34), T(24), 0.8)
for b, note in [(24, "Db6"), (24.5, "Bb5"), (25, "Gb5"), (25.5, "Bb5"), (26, "C6"), (26.5, "Eb6"), (27, "Ab6")]:
    Bq["keys"].add(bell(note, 0.9), T(b), 0.11, pan=0.12)
fill = [27 + 0.25 * i for i in range(2)] + [27.5 + 0.125 * i for i in range(3)]
for i, b in enumerate(fill):
    snares.append(b)
    Bq["drums"].add(snare(200 + 12 * i), T(b), 0.22 + 0.04 * i)
rev = crash(1.2)[:, ::-1]
Bq["fx"].add(rev, T(28) - rev.shape[1] / SR, 0.5)

# --- 마디 8: 사운드 로고 (B) ---------------------------------------------------
kicks_b.append(28)
Bq["kick"].add(kick(1.3), T(28))
Bq["drums"].add(crash(3.2), T(28), 0.5)
Bq["impact"].add(boom(2.6, 64, 30), T(28), 0.85)
notes, sub_n, _ = CHORDS["Db"]
fin = supersaw(notes, T(3.8), cutoff=3000, release=0.8, attack=0.02)
t_ = np.arange(fin.shape[1]) / SR
fin *= (0.3 + 0.7 * np.exp(-t_ / 1.4))[None, :]
Bq["pads"].add(fin, T(28), 0.9)
Bq["bass"].add(sub_note(sub_n, T(3.6)) * np.exp(-np.arange(int((T(3.6) + 0.05) * SR)) / SR / 1.2), T(28), 0.75)
MOTIF = [(28.0, "Db5"), (28.75, "Db5"), (29.0, "Gb5"), (29.5, "Db5"), (30.0, "Ab5")]
for i, (b, note) in enumerate(MOTIF):
    last = i == len(MOTIF) - 1
    Bq["fx"].add(mallet(note, 2.6 if last else 1.4, decay=1.4 if last else 0.6), T(b), 0.34)
    Bq["fx"].add(mallet(note[:-1] + "4", 2.0 if last else 1.0, decay=1.0 if last else 0.4), T(b), 0.14)
Bq["pads"].add(supersaw(["Db5", "Ab5", "Db6"], T(2.0), cutoff=4800, release=1.2, attack=0.25), T(30), 0.22)
Bq["fx"].add(bell("Ab6", 1.8), T(30), 0.06)


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


for S, kk in ((A, kicks_a), (Bq, kicks_b)):
    S["pads"].x *= sidechain(kk)
    S["bass"].x *= sidechain(kk, 0.85, 0.14)
    S["keys"].x *= sidechain(kk, 0.35, 0.12)

# 2024 폭락: 폭락 전 음악 전체가 b10에서 한 박 동안 테이프처럼 멈춤
for bus in A.values():
    tape_stop(bus.x, T(10), T(1.0))
buses = {k: Bus() for k in NAMES}
for k in NAMES:
    buses[k].x = A[k].x + Bq[k].x


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


X = {k: buses[k].x for k in NAMES}
k = fx_chain(X["kick"], pb.Compressor(threshold_db=-8, ratio=2.5, attack_ms=6, release_ms=80))
d = fx_chain(X["drums"], pb.HighpassFilter(160), pb.Compressor(threshold_db=-12, ratio=3, attack_ms=2, release_ms=90),
             pb.Distortion(drive_db=2))
d = d + send_reverb(X["drums"], 0.35, 0.16, hp=500)
pc = fx_chain(X["perc"], pb.HighpassFilter(400)) + send_reverb(X["perc"], 0.2, 0.06, hp=900)
bs = fx_chain(X["bass"], pb.LowpassFilter(1600))
bs[1] = bs[0] = bs.mean(axis=0)                       # 저음은 모노
pd = fx_chain(X["pads"], pb.HighpassFilter(150), pb.Chorus(rate_hz=0.5, depth=0.25, mix=0.3))
pd = pd + send_reverb(pd, 0.7, 0.26, hp=450)
ky = fx_chain(X["keys"], pb.HighpassFilter(280), pb.Delay(delay_seconds=T(0.75), feedback=0.3, mix=0.2))
ky = ky + send_reverb(ky, 0.6, 0.3, hp=500)
fxx = fx_chain(X["fx"], pb.HighpassFilter(160)) + send_reverb(X["fx"], 0.85, 0.3, hp=500)
imp = fx_chain(X["impact"], pb.LowpassFilter(2800))

mix = 0.9 * k + 0.95 * d + 0.9 * pc + 0.7 * bs + 1.3 * pd + 1.35 * ky + 0.85 * fxx + 0.8 * imp
mix = mix[:, :N]
fade = np.ones(N)
fade[-int(0.5 * SR):] = np.linspace(1, 0, int(0.5 * SR)) ** 2
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
    "kicks": sorted(set(kicks_a + kicks_b)), "claps": sorted(set(claps)), "snares": snares,
    "pixels": pixel_beats, "motif": [b for b, _ in MOTIF],
    "sections": {"dot": 0, "logoSnap": 2, "products": 4, "cards": [4.5, 5.5, 6.5], "chart": 8, "col2023": 8.5, "col2024": 9,
                 "tapeStop": 10, "bottom": 11, "build": 13, "drop": 16, "rocket": 18, "smash": 20, "record": 21,
                 "sep": 22, "hero": 24, "sting": 28, "end": 32},
}
json.dump(beatmap, open(os.path.join(BUILD, "beatmap.json"), "w"), indent=1)
print(f"music.wav 저장: {DUR}s, 원래 {lufs:.1f} LUFS → -14.5 LUFS, 피크 {20*np.log10(np.max(np.abs(mix))):.1f} dBFS")
