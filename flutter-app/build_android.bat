@echo off
echo ========================================
echo  VshakaGo Android APK Builder
echo ========================================
echo.
echo Project Path: c:\Users\venka\Downloads\vizag-resort-booking\flutter-app
echo.

echo Step 1: Getting dependencies...
call flutter pub get
if errorlevel 1 (
    echo ERROR: Failed to get dependencies
    pause
    exit /b 1
)
echo.

echo Step 2: Generating app icons from logo.png...
call flutter pub run flutter_launcher_icons
if errorlevel 1 (
    echo ERROR: Failed to generate icons
    pause
    exit /b 1
)
echo.

echo Step 3: Cleaning previous builds...
call flutter clean
echo.

echo Step 4: Building Release APK...
call flutter build apk --release
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo.

echo ========================================
echo  BUILD SUCCESSFUL!
echo ========================================
echo.
echo APK Location:
echo build\app\outputs\flutter-apk\app-release.apk
echo.
echo Full Path:
echo c:\Users\venka\Downloads\vizag-resort-booking\flutter-app\build\app\outputs\flutter-apk\app-release.apk
echo.
echo ========================================
echo  Installation Options:
echo ========================================
echo.
echo Option 1: Install via ADB (if phone connected)
echo   adb install build\app\outputs\flutter-apk\app-release.apk
echo.
echo Option 2: Transfer APK to phone and install manually
echo.
echo ========================================
echo  App Details:
echo ========================================
echo  Name: VshakaGo
echo  Icon: assets/logo.png
echo  Version: 1.0.0+1
echo ========================================
echo.
pause
