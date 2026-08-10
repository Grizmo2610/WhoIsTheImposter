#!/usr/bin/env bash
# ============================================================
# Build Android APK từ dự án Capacitor
# Chạy: bash build-android.sh
# Yêu cầu: Node.js >= 18, Android Studio + SDK đã cài
# ============================================================
set -e

echo "=== 1. Cài dependencies ==="
npm install

echo "=== 2. Tạo Android project (nếu chưa có) ==="
if [ ! -d "android" ]; then
  npx cap add android
  echo "Android platform added."
else
  echo "Android folder đã tồn tại, bỏ qua."
fi

echo "=== 3. Sync web assets vào Android ==="
npx cap sync android

echo ""
echo "✅ Xong! Bước tiếp theo:"
echo "   npx cap open android    — mở Android Studio để build APK"
echo "   hoặc: npx cap run android  — nếu đã cắm thiết bị / bật emulator"
echo ""
echo "Trong Android Studio: Build > Build Bundle(s)/APK(s) > Build APK(s)"
