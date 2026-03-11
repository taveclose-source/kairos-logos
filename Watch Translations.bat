@echo off
title Logos — Twi Translation Pipeline
echo ============================================
echo   Logos by Kai'Ros — Translation Pipeline
echo ============================================
echo.
cd /d "%~dp0"
node scripts\watch-translations.mjs
pause
