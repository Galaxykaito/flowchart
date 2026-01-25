@echo off
chcp 65001 >nul
title 流程图制作工具

echo ========================================
echo     流程图制作工具 - 启动中...
echo ========================================
echo.

cd /d "%~dp0"
npm run dev

pause
