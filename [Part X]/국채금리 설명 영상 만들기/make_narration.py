"""script.json 의 대본을 한국어 음성(TTS)으로 만들고, 영상 타임라인을 계산합니다.

결과물 (build/ 폴더)
  narration.wav   : 전체 내레이션 음성
  timeline.json   : 장면/문장별 시작·끝 시각 (초)
  timeline.js     : 위 내용을 브라우저에서 읽을 수 있게 만든 파일
  captions.srt    : 자막 파일 (유튜브 업로드용)

음성 합성 모델: Supertonic 3 (sherpa-onnx 버전, 오프라인 CPU 동작)
  pip install sherpa-onnx soundfile numpy
"""
import json
import os
import tarfile
import urllib.request

import numpy as np
import sherpa_onnx
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
MODEL_NAME = "sherpa-onnx-supertonic-3-tts-int8-2026-05-11"
MODEL_DIR = os.path.join(HERE, "models", MODEL_NAME)
MODEL_URL = ("https://github.com/k2-fsa/sherpa-onnx/releases/download/"
             f"tts-models/{MODEL_NAME}.tar.bz2")

LEAD_IN = 0.8        # 영상 시작 후 첫 내레이션까지
GAP_LINE = 0.34      # 문장 사이 쉼
GAP_COMMA = 0.22     # 쉼표로 끝나는 문장 뒤 쉼
GAP_SCENE = 1.0      # 장면 전환 쉼
OUTRO = 4.0          # 마지막 문장 뒤 엔딩 화면


def download_model():
    if os.path.isdir(MODEL_DIR):
        return
    os.makedirs(os.path.dirname(MODEL_DIR), exist_ok=True)
    archive = MODEL_DIR + ".tar.bz2"
    print("음성 모델 다운로드 중...", MODEL_URL)
    urllib.request.urlretrieve(MODEL_URL, archive)
    with tarfile.open(archive) as tar:
        tar.extractall(os.path.dirname(MODEL_DIR))
    os.remove(archive)


def load_tts():
    m = MODEL_DIR
    config = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
                duration_predictor=f"{m}/duration_predictor.int8.onnx",
                text_encoder=f"{m}/text_encoder.int8.onnx",
                vector_estimator=f"{m}/vector_estimator.int8.onnx",
                vocoder=f"{m}/vocoder.int8.onnx",
                tts_json=f"{m}/tts.json",
                unicode_indexer=f"{m}/unicode_indexer.bin",
                voice_style=f"{m}/voice.bin",
            ),
            num_threads=os.cpu_count() or 2,
            provider="cpu",
        )
    )
    return sherpa_onnx.OfflineTts(config)


def trim_silence(x, sr, threshold=0.012, margin=0.04):
    loud = np.where(np.abs(x) > threshold)[0]
    if len(loud) == 0:
        return x
    pad = int(margin * sr)
    return x[max(0, loud[0] - pad): min(len(x), loud[-1] + pad)]


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main():
    with open(os.path.join(HERE, "script.json"), encoding="utf-8") as f:
        script = json.load(f)
    voice = script["voice"]

    download_model()
    tts = load_tts()
    os.makedirs(BUILD, exist_ok=True)

    sr = None
    pieces = []
    t = LEAD_IN
    timeline = {"title": script["title"], "as_of": script["as_of"], "scenes": []}

    for s_idx, scene in enumerate(script["scenes"]):
        if s_idx > 0:
            t += GAP_SCENE
        scene_info = {"id": scene["id"], "start": round(t, 3), "lines": []}
        for l_idx, line in enumerate(scene["lines"]):
            assert not any(c.isdigit() for c in line["tts"]), line["tts"]
            gen = sherpa_onnx.GenerationConfig()
            gen.sid = voice["sid"]
            gen.speed = voice["speed"]
            gen.num_steps = voice["num_steps"]
            gen.extra["lang"] = "ko"
            audio = tts.generate(line["tts"], gen)
            sr = audio.sample_rate
            x = trim_silence(np.array(audio.samples, dtype=np.float32), sr)
            # 문장마다 음량을 비슷하게 맞춤
            rms = np.sqrt(np.mean(x ** 2)) + 1e-9
            x = np.clip(x * (0.08 / rms), -0.98, 0.98)

            if l_idx > 0:
                prev = scene["lines"][l_idx - 1]["caption"].rstrip()
                t += GAP_COMMA if prev.endswith(",") else GAP_LINE
            start, dur = t, len(x) / sr
            pieces.append((start, x))
            scene_info["lines"].append(
                {"start": round(start, 3), "end": round(start + dur, 3),
                 "caption": line["caption"]})
            t = start + dur
            print(f"[{scene['id']}] {dur:5.2f}s  {line['caption']}")
        scene_info["end"] = round(t, 3)
        timeline["scenes"].append(scene_info)

    total = t + OUTRO
    timeline["duration"] = round(total, 3)

    track = np.zeros(int(total * sr) + 1, dtype=np.float32)
    for start, x in pieces:
        i = int(round(start * sr))
        track[i:i + len(x)] += x
    sf.write(os.path.join(BUILD, "narration.wav"), track, sr, subtype="PCM_16")

    with open(os.path.join(BUILD, "timeline.json"), "w", encoding="utf-8") as f:
        json.dump(timeline, f, ensure_ascii=False, indent=2)
    with open(os.path.join(BUILD, "timeline.js"), "w", encoding="utf-8") as f:
        f.write("window.TIMELINE = " + json.dumps(timeline, ensure_ascii=False) + ";\n")

    with open(os.path.join(BUILD, "captions.srt"), "w", encoding="utf-8") as f:
        n = 1
        for scene in timeline["scenes"]:
            for line in scene["lines"]:
                f.write(f"{n}\n{srt_time(line['start'])} --> {srt_time(line['end'])}\n"
                        f"{line['caption']}\n\n")
                n += 1

    print(f"\n총 길이: {total:.1f}초 → {BUILD}")


if __name__ == "__main__":
    main()
