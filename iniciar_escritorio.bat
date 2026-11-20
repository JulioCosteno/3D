@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Laboratorio 3D v2.0 - escritorio
where python >nul 2>nul || (echo No se encontro Python. Instala Python 3 desde https://www.python.org y marca "Add to PATH". & pause & exit /b 1)
python servidor.py
pause
