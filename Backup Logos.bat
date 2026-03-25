@echo off
title Logos Backup
cd /d "C:\Dev\Logos"

echo.
echo ─────────────────────────────────────────
echo LOGOS BACKUP — Running...
echo ─────────────────────────────────────────
echo.

:: Timestamp via PowerShell (wmic deprecated on Windows 11)
for /f "delims=" %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set TIMESTAMP=%%T

:: Git commit and push
echo [1/3] Committing all changes to git...
git add -A
git commit -m "Auto-backup: %TIMESTAMP%"
git push
echo Git backup complete.
echo.

:: Dropbox backup
echo [2/3] Copying to Dropbox...
set BACKUP_DIR=C:\Users\close\Dropbox\Logos-Backups\%TIMESTAMP%
mkdir "%BACKUP_DIR%"
xcopy "C:\Dev\Logos" "%BACKUP_DIR%" /E /I /Q /EXCLUDE:C:\Dev\Logos\.gitignore-backup-exclude.txt 2>nul
if %ERRORLEVEL%==0 (
    echo Dropbox backup complete.
) else (
    echo Dropbox folder not found -- skipping. Git backup is sufficient.
)
echo.

:: Log it
echo [3/3] Logging backup...
echo %TIMESTAMP% -- Backup completed >> "C:\Dev\Logos\backup-log.txt"
type "C:\Dev\Logos\backup-log.txt"
echo.

echo ─────────────────────────────────────────
echo Done. Session preserved.
echo Timestamp: %TIMESTAMP%
echo ─────────────────────────────────────────
echo.
pause
