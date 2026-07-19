@echo off
echo Starting AegisPAM frontend on http://localhost:5173 ...
echo Leave this window open. Close it to stop the app.
echo.
cd aegispam-frontend
call npm run dev
pause
