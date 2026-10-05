# Build RoadPulse Android APK using Windows Android SDK Build-Tools 36
$ErrorActionPreference = "Stop"
$androidDir = "e:\1. Skillizee\Ideathon Projects\Road Pulse\android"
$buildTools = "C:\Users\HP\AppData\Local\Android\Sdk\build-tools\36.0.0"
$platformJar = "C:\Users\HP\AppData\Local\Android\Sdk\platforms\android-36\android.jar"
$buildDir = "$androidDir\build"
$keystoreDir = "$androidDir\keystore"
$ks = "$keystoreDir\roadpulse-release.p12"
$pwFile = "$keystoreDir\password.txt"

if (-not (Test-Path $buildDir)) { New-Item -ItemType Directory -Path $buildDir -Force | Out-Null }
if (-not (Test-Path $keystoreDir)) { New-Item -ItemType Directory -Path $keystoreDir -Force | Out-Null }

# 1. Keystore check/creation
$password = "roadpulse123456"
if (-not (Test-Path $ks)) {
    & keytool -genkeypair -keystore $ks -storetype PKCS12 -storepass $password -alias roadpulse `
        -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=RoadPulse, O=Skillizee, C=IN"
}

# 2. Compile resources with aapt2
Write-Host "Compiling Android resources..."
& "$buildTools\aapt2.exe" compile --dir "$androidDir\res" -o "$buildDir\res.zip"

# 3. Link base APK
Write-Host "Linking APK manifest and resources..."
& "$buildTools\aapt2.exe" link -o "$buildDir\base.apk" -I $platformJar `
    --manifest "$androidDir\AndroidManifest.xml" "$buildDir\res.zip" `
    --min-sdk-version 24 --target-sdk-version 34 --version-code 3 --version-name "2.0.0"

# 4. Compile Java sources
Write-Host "Compiling Java sources..."
$classesDir = "$buildDir\classes"
if (Test-Path $classesDir) { Remove-Item $classesDir -Recurse -Force }
New-Item -ItemType Directory -Path $classesDir -Force | Out-Null
& javac -nowarn --release 8 -cp $platformJar -d $classesDir "$androidDir\src\com\skillizee\roadpulse\MainActivity.java"

# 5. Dex with D8
Write-Host "D8 dexing classes..."
$classFiles = (Get-ChildItem -Path $classesDir -Recurse -Filter "*.class" | Where-Object { -not $_.Name.StartsWith("Sign") }).FullName
& "$buildTools\d8.bat" --min-api 24 --output $buildDir $classFiles --lib $platformJar

# 6. Package unsigned APK
Write-Host "Packaging unsigned APK..."
Copy-Item "$buildDir\base.apk" "$buildDir\unaligned.apk" -Force
# Add classes.dex into root of unaligned.apk
Push-Location $buildDir
& "$buildTools\aapt.exe" add "unaligned.apk" "classes.dex"
Pop-Location

# 7. Zipalign
Write-Host "Zip-aligning APK..."
$alignedApk = "$buildDir\aligned.apk"
if (Test-Path $alignedApk) { Remove-Item $alignedApk -Force }
& "$buildTools\zipalign.exe" -f -v 4 "$buildDir\unaligned.apk" $alignedApk

# 8. Sign with apksigner (Java APK Signature Scheme v2)
Write-Host "Signing APK with Java apksigner..."
$finalApk = "$androidDir\..\RoadPulse.apk"
& javac -cp "$buildTools\lib\apksigner.jar" -d $classesDir "$androidDir\Sign.java"
& java -cp "$classesDir;$buildTools\lib\apksigner.jar" Sign "$alignedApk" "$finalApk" "$ks" "$password"

Copy-Item "$finalApk" "$androidDir\RoadPulse.apk" -Force
Write-Host "APK Built and Signed successfully: $finalApk"
