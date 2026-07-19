@echo off
echo ============================================
echo   AegisPAM - First-time setup
echo   This installs everything needed. Only run
echo   this once (or again if you delete "venv" or
echo   "node_modules" folders).
echo ============================================
echo.

echo [1/4] Setting up backend (Python)...
cd aegispam-backend
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
if not exist .env copy .env.example .env
cd ..

echo.
echo [2/4] Setting up frontend (Node)...
cd aegispam-frontend
call npm install
if not exist .env copy .env.example .env
cd ..

echo.
echo ============================================
echo   Setup complete!
echo   Now double-click "2_start_backend.bat"
echo   and "3_start_frontend.bat" (in that order).
echo ============================================
pause
