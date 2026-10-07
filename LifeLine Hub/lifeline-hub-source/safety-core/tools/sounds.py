#!/usr/bin/env python3
"""Generates an app's own alarm sounds (stdlib only): siren loop + notification chime.
   python3 safety-core/tools/sounds.py <app-dir> <style>     style: twotone | sweep | pulse"""
import math, struct, sys, wave, os, array

RATE = 22050

def write(path, samples):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    peak = max(1e-9, max(abs(s) for s in samples))
    data = array.array('h', (int(32000 * s / peak) for s in samples))
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(data.tobytes())

def tone(freq_at, secs, shape=lambda t: 1.0, harmonics=(1, 0.35, 0.15)):
    out, ph = [], 0.0
    for i in range(int(secs * RATE)):
        t = i / RATE
        ph += 2 * math.pi * freq_at(t) / RATE
        out.append(shape(t) * sum(a * math.sin(ph * (k + 1)) for k, a in enumerate(harmonics)))
    return out

def env(secs, a=0.01, r=0.03):
    return lambda t: min(1.0, t / a, max(0.0, (secs - t) / r))

def siren(style):
    if style == 'twotone':   # She Shield: steady two-tone, 0.35 s each
        return tone(lambda t: 960 if (t % 0.7) < 0.35 else 770, 4.2)
    if style == 'sweep':     # Fortiva: rising sweeps
        return tone(lambda t: 650 + 650 * ((t % 1.05) / 1.05), 4.2)
    # Safety Warriors: rapid triple pulses
    return tone(lambda t: 1175 if (t % 0.6) < 0.3 else 880, 4.2, shape=lambda t: 1.0 if (t % 0.15) < 0.11 else 0.0)

def chime(style):
    notes = {'twotone': [784, 1047], 'sweep': [659, 880, 1175], 'pulse': [880, 880, 1319]}[style]
    out = []
    for n in notes:
        out += tone(lambda t, n=n: n, 0.16, shape=env(0.16, 0.005, 0.12)) + [0.0] * int(0.04 * RATE)
    return out

app, style = sys.argv[1], sys.argv[2]
write(f'{app}/android/assets/audio/sos-alert.wav', siren(style))
write(f'{app}/android/res/raw/sos_notification.wav', chime(style))
print('sounds ok')
