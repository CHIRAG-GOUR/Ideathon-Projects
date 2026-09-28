#!/usr/bin/env bash
# Copies Microsoft Fluent Emoji 3D images (MIT) for the emoji you use into public/e3d
# and writes src/lib/emoji3d-list.ts. Usage: bash get-fluent-3d.sh "🍎🥛🍞📱🐶"  (run in the Next.js project root)
set -euo pipefail
TMP=$(mktemp -d); (cd "$TMP" && npm pack @lobehub/fluent-emoji-3d@1.1.0 >/dev/null && tar xzf lobehub-fluent-emoji-3d-1.1.0.tgz)
mkdir -p public/e3d src/lib
python3 - "$TMP/package/assets" "$1" <<'PY'
import sys, os, re, shutil
src, text = sys.argv[1], sys.argv[2]
B = '[\U0001F300-\U0001FAFF☀-➿⭐☕❄♻]'
have = set(re.findall(r'"([0-9a-f-]+)"', open('src/lib/emoji3d-list.ts').read())) if os.path.exists('src/lib/emoji3d-list.ts') else set()
for e in re.findall(B + '️?(?:‍' + B + '️?)*', text):
    cp = '-'.join('%04x' % ord(c) for c in e if ord(c) != 0xFE0F)
    f = next((x for x in (cp + '.webp',) if os.path.exists(os.path.join(src, x))), None) or next((x for x in os.listdir(src) if x.replace('-fe0f', '') == cp + '.webp'), None)
    if f: shutil.copy(os.path.join(src, f), f'public/e3d/{cp}.webp'); have.add(cp)
    else: print('no 3D art for', e)
open('src/lib/emoji3d-list.ts', 'w').write('export const EMOJI_3D = new Set<string>(' + repr(sorted(have)).replace("'", '"') + ');\n')
print(len(have), 'images in public/e3d')
PY
printf 'Fluent Emoji 3D by Microsoft (github.com/microsoft/fluentui-emoji), MIT License.\n' > public/e3d/LICENSE.txt
rm -rf "$TMP"
