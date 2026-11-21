@echo off
title SmartClass IoT Dashboard Launcher
echo ==========================================================
echo           Starting SmartClass IoT Dashboard...
echo ==========================================================
echo.
echo Opening dashboard in your default browser...
start "" "http://localhost:5500" 2>nul || start "" "index.html"
echo.
echo Starting local web server on port 5500...
echo (Keep this window open while presenting to hackathon judges)
echo.
python -m http.server 5500 2>nul || npx serve -p 5500 . 2>nul || (
    echo Note: Python/Node web server not detected, opening index.html directly...
    start "" "index.html"
)
pause
