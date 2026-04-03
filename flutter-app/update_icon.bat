@echo off
echo ========================================
echo  VshakaGo App Icon Update Script
echo ========================================
echo.

echo Step 1: Getting dependencies...
call flutter pub get
echo.

echo Step 2: Generating launcher icons...
call flutter pub run flutter_launcher_icons
echo.

echo Step 3: Cleaning build...
call flutter clean
echo.

echo ========================================
echo  App icon updated successfully!
echo ========================================
echo.
echo The app name is already set to "VshakaGo"
echo The app icon now uses assets/logo.png
echo.
echo To see the changes, run:
echo   flutter run
echo.
pause
