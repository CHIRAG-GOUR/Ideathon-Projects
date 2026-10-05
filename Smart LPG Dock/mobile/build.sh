#!/usr/bin/env bash
# Builds the native Android app (APK + AAB) without Gradle or Android Studio.
#   bash mobile/build.sh
# Needs: JDK 11+, Python 3, and either an Android SDK (ANDROID_SDK_ROOT with build-tools/34.x + platforms/android-34)
# or network access to fetch the same tools. Optional cloud sync: export FIREBASE_API_KEY and FIREBASE_PROJECT_ID
# (browser-safe web config values) before building — they are written into the app's assets, never into source.
set -euo pipefail
M="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$M/.." && pwd)"
PKG=com.skillizee.lpgdock; VERSION_NAME=1.0.0; VERSION_CODE=1
B="$M/build"; T="$M/.tools"; MAVEN=https://repo.maven.apache.org/maven2
mkdir -p "$T" "$M/keystore"

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

# ---- signing key (kept out of git: mobile/keystore/)
KS="$M/keystore/release.p12"; PW_FILE="$M/keystore/password.txt"; ALIAS=lpgdock
if [ ! -f "$KS" ]; then
  python3 -c "import secrets;print(secrets.token_urlsafe(18))" > "$PW_FILE"
  keytool -genkeypair -keystore "$KS" -storetype PKCS12 -storepass "$(cat "$PW_FILE")" -alias $ALIAS \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Smart LPG Safety Dock, O=Skillizee, C=IN" >/dev/null 2>&1
fi
PW="$(cat "$PW_FILE")"

rm -rf "$B"; mkdir -p "$B/classes" "$B/gen" "$B/assets/img" "$B/dex"

# ---- assets: the one shared engine config, concept renders, optional Firebase web config
cp "$ROOT/shared/dock-config.json" "$B/assets/dock-config.json"
cp "$ROOT"/web/public/img/*.jpg "$B/assets/img/"
if [ -n "${FIREBASE_API_KEY:-}" ] && [ -n "${FIREBASE_PROJECT_ID:-}" ]; then
  printf '{"apiKey":"%s","projectId":"%s"}\n' "$FIREBASE_API_KEY" "$FIREBASE_PROJECT_ID" > "$B/assets/firebase.json"
  echo "Cloud sync: enabled for project $FIREBASE_PROJECT_ID"
else
  echo "Cloud sync: not configured (set FIREBASE_API_KEY + FIREBASE_PROJECT_ID to enable). The app works fully offline."
fi

# ---- resources + manifest
"$AAPT2" compile --dir "$M/res" -o "$B/res.zip"
LINK=(-I "$ANDROID_JAR" --manifest "$M/AndroidManifest.xml" "$B/res.zip" -A "$B/assets" \
  --min-sdk-version 24 --target-sdk-version 34 --version-code $VERSION_CODE --version-name $VERSION_NAME -0 jpg)
"$AAPT2" link -o "$B/base.apk" --java "$B/gen" "${LINK[@]}"
"$AAPT2" link -o "$B/proto.apk" --proto-format "${LINK[@]}"

# ---- code: javac → D8 (desugars lambdas for API 24)
javac -nowarn -encoding UTF-8 -Xlint:-options --release 11 -cp "$ANDROID_JAR" -d "$B/classes" $(find "$B/gen" "$M/src" -name '*.java')
(cd "$B/classes" && jar cf "$B/classes.jar" .)
java -cp "$D8" com.android.tools.r8.D8 --release --min-api 24 --lib "$ANDROID_JAR" --output "$B/dex" "$B/classes.jar"

# ---- APK: add classes.dex, keep resources.arsc/images uncompressed + 4-byte aligned, then sign (v2)
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
        add(n, zin.read(i), n == 'resources.arsc' or n.endswith(('.png', '.jpg')))
    add('classes.dex', open(dex, 'rb').read(), False)
PY
javac -nowarn --release 11 -cp "$T/apksig.jar" -d "$B" "$M/tools/Sign.java"
APK="$B/smart-lpg-dock-$VERSION_NAME.apk"
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
        dst = 'manifest/AndroidManifest.xml' if n == 'AndroidManifest.xml' else n  # res/, assets/, resources.pb keep their place
        z.writestr(dst, zin.read(i))
    z.writestr('dex/classes.dex', open(dex, 'rb').read())
PY
AAB="$B/smart-lpg-dock-$VERSION_NAME.aab"
java -jar "$T/bundletool.jar" build-bundle --modules="$B/base-module.zip" --output="$AAB" \
  --config=<(echo '{"compression":{"uncompressedGlob":["assets/img/**"]}}')
jarsigner -keystore "$KS" -storetype PKCS12 -storepass "$PW" -sigalg SHA256withRSA -digestalg SHA-256 "$AAB" $ALIAS >/dev/null
jarsigner -verify "$AAB" | grep -i "verified"

"$AAPT2" dump badging "$APK" | head -1
echo "APK: $APK"
echo "AAB: $AAB"
