#!/usr/bin/env bash
# Builds the Beyond Legacy Android app (APK + AAB) without Gradle or Android Studio.
#   bash android/build.sh            (builds web/dist first if it is missing; pass --skip-web to reuse it)
# Needs: JDK 11+, Python 3, Node 18+, and either an Android SDK (ANDROID_SDK_ROOT with build-tools/34.x +
# platforms/android-34) or network access to fetch the same tools.
# Firebase: optionally export FIREBASE_API_KEY, FIREBASE_PROJECT_ID (+ FIREBASE_APP_ID, FIREBASE_AUTH_DOMAIN) —
# browser-safe web config values, written to the app's assets, never to source. Without them the app reads the
# config from the deployed site (https://beyond-legacy-app.web.app/__/firebase/init.json).
set -euo pipefail
A="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$A/.." && pwd)"
PKG=com.beyondlegacy.app; VERSION_NAME=1.0.0; VERSION_CODE=1
B="$A/build"; T="$A/.tools"; MAVEN=https://repo.maven.apache.org/maven2
mkdir -p "$T" "$A/keystore"

# ---- web build (the app bundles the exact production site)
if [ "${1:-}" != "--skip-web" ] || [ ! -f "$ROOT/web/dist/index.html" ]; then
  (cd "$ROOT/web" && { [ -d node_modules ] || npm ci; } && npm run build)
fi

# ---- tools: prefer an installed SDK, otherwise download
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/opt/android-sdk-lite}}"
BT=$(ls -d "$SDK"/build-tools/34* 2>/dev/null | sort | tail -1 || true)
AAPT2="${BT:+$BT/aapt2}"; D8="${BT:+$BT/lib/d8.jar}"; ANDROID_JAR="$SDK/platforms/android-34/android.jar"
if [ -z "$BT" ] || [ ! -x "$AAPT2" ]; then
  [ -x "$T/aapt2" ] || (cd "$T" && npm pack aaptjs3@2.0.2 >/dev/null && tar xzf aaptjs3-2.0.2.tgz && cp package/bin/x64/linux/aapt2 . && chmod +x aapt2)
  AAPT2="$T/aapt2"
fi
if [ ! -f "$ANDROID_JAR" ]; then
  [ -f "$T/android.jar" ] || curl -sSfo "$T/android.jar" $MAVEN/org/robolectric/android-all/14-robolectric-10818077/android-all-14-robolectric-10818077.jar
  ANDROID_JAR="$T/android.jar"
fi
if [ -z "$D8" ] || ! unzip -l "$D8" 2>/dev/null | grep -q "com/android/tools/r8/D8.class"; then
  [ -f "$T/r8.jar" ] || curl -sSfo "$T/r8.jar" https://storage.googleapis.com/r8-releases/raw/8.5.35/r8lib.jar
  D8="$T/r8.jar"
fi
[ -f "$T/apksig.jar" ] || curl -sSfo "$T/apksig.jar" $MAVEN/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar
[ -f "$T/bundletool.jar" ] || curl -sSfLo "$T/bundletool.jar" https://github.com/google/bundletool/releases/download/1.17.2/bundletool-all-1.17.2.jar

# ---- signing key (kept out of git: android/keystore/)
KS="$A/keystore/release.p12"; PW_FILE="$A/keystore/password.txt"; ALIAS=beyondlegacy
if [ ! -f "$KS" ]; then
  python3 -c "import secrets;print(secrets.token_urlsafe(18))" > "$PW_FILE"
  keytool -genkeypair -keystore "$KS" -storetype PKCS12 -storepass "$(cat "$PW_FILE")" -alias $ALIAS \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Beyond Legacy, O=Beyond Legacy, C=IN" >/dev/null 2>&1
fi
PW="$(cat "$PW_FILE")"

rm -rf "$B"; mkdir -p "$B/classes" "$B/gen" "$B/assets" "$B/dex"

# ---- assets: the production web build + optional Firebase web config
cp -r "$ROOT/web/dist" "$B/assets/www"
if [ -n "${FIREBASE_API_KEY:-}" ] && [ -n "${FIREBASE_PROJECT_ID:-}" ]; then
  python3 - "$B/assets/firebase.json" <<'PY'
import json, os, sys
p = os.environ['FIREBASE_PROJECT_ID']
cfg = {'apiKey': os.environ['FIREBASE_API_KEY'], 'projectId': p, 'authDomain': os.environ.get('FIREBASE_AUTH_DOMAIN') or f'{p}.firebaseapp.com'}
if os.environ.get('FIREBASE_APP_ID'): cfg['appId'] = os.environ['FIREBASE_APP_ID']
json.dump(cfg, open(sys.argv[1], 'w'))
PY
  echo "Firebase: bundled config for project $FIREBASE_PROJECT_ID"
else
  echo "Firebase: config will be read from the deployed site (set FIREBASE_API_KEY + FIREBASE_PROJECT_ID to bundle it)."
fi

# ---- resources + manifest
"$AAPT2" compile --dir "$A/res" -o "$B/res.zip"
LINK=(-I "$ANDROID_JAR" --manifest "$A/AndroidManifest.xml" "$B/res.zip" -A "$B/assets" \
  --min-sdk-version 24 --target-sdk-version 34 --version-code $VERSION_CODE --version-name $VERSION_NAME -0 woff2 -0 png)
"$AAPT2" link -o "$B/base.apk" --java "$B/gen" "${LINK[@]}"
"$AAPT2" link -o "$B/proto.apk" --proto-format "${LINK[@]}"

# ---- code: javac → D8 (desugars lambdas for API 24)
javac -nowarn -encoding UTF-8 -Xlint:-options --release 11 -cp "$ANDROID_JAR" -d "$B/classes" $(find "$B/gen" "$A/src" -name '*.java')
(cd "$B/classes" && jar cf "$B/classes.jar" .)
java -cp "$D8" com.android.tools.r8.D8 --release --min-api 24 --lib "$ANDROID_JAR" --output "$B/dex" "$B/classes.jar"

# ---- APK: add classes.dex, keep resources.arsc/binaries uncompressed + 4-byte aligned, then sign (v2)
python3 - "$B/base.apk" "$B/dex/classes.dex" "$B/unsigned.apk" <<'PY'
import sys, zipfile, struct
src, dex, out = sys.argv[1:]
zin = zipfile.ZipFile(src)
with zipfile.ZipFile(out, 'w') as z:
    def add(name, data, stored):
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
        if stored:
            off = z.fp.tell() + 30 + len(name.encode())
            pad = (4 - (off + 6) % 4) % 4
            info.extra = struct.pack('<HHH', 0xD935, 2 + pad, 4) + b'\0' * pad
        z.writestr(info, data)
    for i in zin.infolist():
        n = i.filename
        add(n, zin.read(i), n == 'resources.arsc' or n.endswith(('.png', '.woff2')))
    add('classes.dex', open(dex, 'rb').read(), False)
PY
javac -nowarn --release 11 -cp "$T/apksig.jar" -d "$B" "$A/tools/Sign.java"
APK="$B/beyond-legacy-$VERSION_NAME.apk"
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED \
  -cp "$B:$T/apksig.jar" Sign "$B/unsigned.apk" "$APK" "$KS" "$PW"

# ---- AAB: proto resources + dex in a base module → bundletool → jarsigner
python3 - "$B/proto.apk" "$B/dex/classes.dex" "$B/base-module.zip" <<'PY'
import sys, zipfile
src, dex, out = sys.argv[1:]
zin = zipfile.ZipFile(src)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for i in zin.infolist():
        n = i.filename
        z.writestr('manifest/AndroidManifest.xml' if n == 'AndroidManifest.xml' else n, zin.read(i))
    z.writestr('dex/classes.dex', open(dex, 'rb').read())
PY
AAB="$B/beyond-legacy-$VERSION_NAME.aab"
java -jar "$T/bundletool.jar" build-bundle --modules="$B/base-module.zip" --output="$AAB" \
  --config=<(echo '{"compression":{"uncompressedGlob":["assets/www/assets/*.woff2"]}}')
jarsigner -keystore "$KS" -storetype PKCS12 -storepass "$PW" -sigalg SHA256withRSA -digestalg SHA-256 "$AAB" $ALIAS >/dev/null
jarsigner -verify "$AAB" | grep -i "verified"
java -jar "$T/bundletool.jar" validate --bundle="$AAB" >/dev/null && echo "bundletool validate: ok"

"$AAPT2" dump badging "$APK" | head -1
echo "APK: $APK"
echo "AAB: $AAB"
