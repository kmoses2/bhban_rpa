"""내레이션 밑에 깔 잔잔한 배경음(앰비언트 패드)을 직접 합성합니다.

저작권 걱정 없는 배경음을 numpy 만으로 만듭니다.
결과물: build/bgm.wav (길이는 build/timeline.json 의 영상 길이에 맞춤)
"""
import json
import os

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
SR = 48000
CHORD_SEC = 8.0

# D장조 I - vi - IV - V (9화음 계열, 부드러운 보이싱)
CHORDS = [
    [50, 57, 61, 64, 66],   # Dmaj9
    [47, 54, 57, 61, 62],   # Bm9
    [43, 50, 54, 57, 59],   # Gmaj9
    [45, 52, 54, 59, 61],   # A6/9
]


def midi_hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def pad_voice(freq, n, rng):
    t = np.arange(n) / SR
    phase = rng.uniform(0, 2 * np.pi, 3)
    wave = (np.sin(2 * np.pi * freq * t + phase[0])
            + np.sin(2 * np.pi * freq * 1.0021 * t + phase[1])
            + 0.35 * np.sin(2 * np.pi * freq * 2.0 * t + phase[2]))
    return wave


def envelope(n, attack, release):
    env = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    env[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    env[-r:] = np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return env


def simple_reverb(x, seconds=2.2, mix=0.35, seed=7):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]
    return (1 - mix) * x + mix * wet


def main():
    with open(os.path.join(BUILD, "timeline.json"), encoding="utf-8") as f:
        duration = json.load(f)["duration"]
    total = int(duration * SR)
    rng = np.random.default_rng(2026)
    out = np.zeros(total + int((CHORD_SEC + 3.0) * SR))

    seg_len = int((CHORD_SEC + 3.0) * SR)        # 다음 화음과 3초 겹침
    step = int(CHORD_SEC * SR)
    for k, start in enumerate(range(0, total, step)):
        chord = CHORDS[k % len(CHORDS)]
        seg = np.zeros(seg_len)
        for i, note in enumerate(chord):
            gain = 0.9 if i == 0 else 0.55       # 베이스 음을 조금 더 크게
            seg += gain * pad_voice(midi_hz(note), seg_len, rng)
        seg *= envelope(seg_len, 2.8, 3.2)
        out[start:start + seg_len] += seg

    out = out[:total]
    t = np.arange(total) / SR
    out *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.07 * t)   # 느린 흔들림
    out = simple_reverb(out)
    out *= envelope(total, 3.0, 5.0)

    rms = np.sqrt(np.mean(out ** 2))
    out *= 0.03 / rms                             # 내레이션보다 한참 작게
    out = np.clip(out, -0.9, 0.9).astype(np.float32)
    sf.write(os.path.join(BUILD, "bgm.wav"), np.stack([out, out], axis=1), SR, subtype="PCM_16")
    print(f"배경음 저장: {duration:.1f}초")


if __name__ == "__main__":
    main()
