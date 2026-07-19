@echo off
echo Starting AegisPAM backend on http://localhost:8000 ...
echo Leave this window open. Close it to stop the server.
echo.
cd aegispam-backend
call venv\Scripts\activate.bat
uvicorn app.main:app --reload
pause
