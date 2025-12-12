@echo off
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo 未找到Node.js，请先安装 Node.js
    pause
    exit /b 1
)
set PORT=3000
echo 正在启动服务 http://localhost:%PORT%/
node server.js
