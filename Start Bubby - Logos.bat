@echo off
title Bubby — Logos by Kai'Ros
cd /d "C:\Dev\Logos"

:: ─────────────────────────────────────────
:: START BUBBY
:: ─────────────────────────────────────────
claude --dangerously-skip-permissions

:: ─────────────────────────────────────────
:: SESSION ENDED — AUTO BACKUP BEGINS
:: ─────────────────────────────────────────
echo.
echo Session closed. Running backup...
echo.

:: Set timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%

:: Git commit everything
echo [1/3] Committing all changes to git...
git add -A
git commit -m "Auto-backup: session ended %TIMESTAMP%"
git push
echo Git backup complete.
echo.

:: Local backup copy to Dropbox
echo [2/3] Copying to Dropbox backup folder...
set BACKUP_DIR=C:\Users\close\Dropbox\Logos-Backups\%TIMESTAMP%
mkdir "%BACKUP_DIR%"
xcopy "C:\Dev\Logos" "%BACKUP_DIR%" /E /I /Q /EXCLUDE:C:\Dev\Logos\.gitignore-backup-exclude.txt
echo Dropbox backup complete.
echo.

:: Log the backup
echo [3/3] Logging backup...
echo %TIMESTAMP% — Session backup completed >> "C:\Dev\Logos\backup-log.txt"
echo Backup log updated.
echo.

echo ─────────────────────────────────────────
echo Backup complete. Session preserved.
echo Timestamp: %TIMESTAMP%
echo ─────────────────────────────────────────
echo.
pause
