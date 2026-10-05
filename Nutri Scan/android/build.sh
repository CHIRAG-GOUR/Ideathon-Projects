#!/usr/bin/env bash
# Builds the Nutri Scan Android app (APK) without Android Studio.
# Tools: aapt2 (npm "aaptjs3"), dx + apksig + Android framework (Maven Central), JDK 11+, Python 3.
# The release key lives in android/keystore/ (never committed). Keep it: updates must use the same key.
set -euo pipefail
cd "$(dirname "$0")"
T=.tools; B=build; M=https://repo.maven.apache.org/maven2
mkdir -p $T $B keystore

[ -x $T/aapt2 ] || { (cd $T && npm pack aaptjs3@2.0.2 >/dev/null && tar xzf aaptjs3-2.0.2.tgz && cp package/bin/x64/linux/aapt2 . && chmod +x aapt2); }
[ -f $T/dx.jar ] || curl -sSfo $T/dx.jar $M/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar
[ -f $T/apksig.jar ] || curl -sSfo $T/apksig.jar $M/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar
[ -f $T/android.jar ] || curl -sSfo $T/android.jar $M/org/robolectric/android-all/14-robolectric-10818077/android-all-14-robolectric-10818077.jar

KS=keystore/nutri-scan-release.p12; PW_FILE=keystore/password.txt
if [ ! -f $KS ]; then
  python3 -c "import secrets;print(secrets.token_urlsafe(18))" > $PW_FILE
  keytool -genkeypair -keystore $KS -storetype PKCS12 -storepass "$(cat $PW_FILE)" -alias nutriscan \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Nutri Scan, O=Skillizee, C=IN" >/dev/null 2>&1
fi

rm -rf $B/*
$T/aapt2 compile --dir res -o $B/res.zip
$T/aapt2 link -o $B/base.apk -I $T/android.jar --manifest AndroidManifest.xml $B/res.zip \
  --min-sdk-version 24 --target-sdk-version 34 --version-code "${VERSION_CODE:-1}" --version-name "${VERSION_NAME:-1.0}"

mkdir -p $B/classes
javac -nowarn --release 8 -cp $T/android.jar -d $B/classes src/com/skillizee/nutriscan/*.java
java -cp $T/dx.jar com.android.dx.command.Main --dex --min-sdk-version=24 --output=$B/classes.dex $B/classes

# Add classes.dex and 4-byte-align every stored entry (Android 11+ requires an aligned resources.arsc).
python3 - "$B/base.apk" "$B/classes.dex" "$B/unsigned.apk" <<'PY'
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
        add(i.filename, zin.read(i), i.filename == 'resources.arsc' or i.filename.endswith('.png'))
    add('classes.dex', open(dex, 'rb').read(), False)
PY

javac --release 11 -cp $T/apksig.jar -d $B Sign.java
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED -cp "$B:$T/apksig.jar" Sign $B/unsigned.apk $B/nutri-scan.apk $KS "$(cat $PW_FILE)"
$T/aapt2 dump badging $B/nutri-scan.apk | head -3
echo "APK: android/$B/nutri-scan.apk"
