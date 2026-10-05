#!/usr/bin/env bash
# JVM smoke test of the real Android UI (Robolectric 3.8, API 27 sandbox). Builds the app first if needed.
#   bash mobile/robotest/run.sh
# Robolectric 3.8 needs a Java 8–11 runtime: set TEST_JAVA=/path/to/java, or this script fetches one from PyPI (jdk4py).
set -euo pipefail
R="$(cd "$(dirname "$0")" && pwd)"
[ -f "$R/../build/base.apk" ] || bash "$R/../build.sh"
if [ -z "${TEST_JAVA:-}" ]; then
  J="$R/../.tools/jdk11"
  if [ ! -x "$J/jdk4py/java-runtime/bin/java" ]; then
    mkdir -p "$J" && python3 -m pip download --no-deps --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.11 jdk4py==11.0.13.1 -d "$J" -q
    (cd "$J" && python3 -m zipfile -e jdk4py-*.whl . && chmod +x jdk4py/java-runtime/bin/*)
  fi
  TEST_JAVA="$J/jdk4py/java-runtime/bin/java"
fi
mvn -q -B -f "$R/pom.xml" test -Dtest.jvm="$TEST_JAVA" "$@"
grep -h "Tests run" "$R"/target/surefire-reports/*.txt
