@echo off
chcp 65001 >nul
title 安装依赖

echo ========================================
echo     安装项目依赖...
echo ========================================
echo.

cd /d "%~dp0"
npm install

echo.
echo 依赖安装完成！
pause
