@echo off
cd /d "C:\Users\ABHILASH\OneDrive\Desktop\ontology-library"

start "Library Backend" cmd /k "npm run dev:server"
timeout /t 3 /nobreak >nul
start "Library Frontend" cmd /k "npm run dev:client"

echo.
echo Library Management System is starting...
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:4000
echo.
pause