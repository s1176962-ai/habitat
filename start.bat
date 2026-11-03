@echo off
chcp 65001 >nul
setlocal
title HabitatQuest 教师工作台
cd /d "%~dp0" || (
    echo [错误] 无法进入项目目录
    pause
    exit /b 1
)

echo ============================================
echo   HabitatQuest - 教师工作台 一键启动
echo ============================================
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 LTS 版本：https://nodejs.org/
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 npm，请重新安装 Node.js LTS 版本
    pause
    exit /b 1
)

if not exist "package.json" (
    echo [错误] 当前目录没有找到 package.json
    pause
    exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
    echo [依赖] 正在安装项目依赖，请稍候...
    if exist "package-lock.json" (
        call npm.cmd ci
    ) else (
        call npm.cmd install
    )
    if errorlevel 1 (
        echo [错误] 依赖安装失败，请检查网络和 npm 错误信息后重试
        pause
        exit /b 1
    )
)

set "SERVER_PORT=5173"
:find_port
netstat -ano -p tcp 2>nul | findstr /r /c:":%SERVER_PORT% .*LISTENING" >nul
if errorlevel 1 goto start_server
set /a SERVER_PORT+=1
if %SERVER_PORT% geq 5200 (
    echo [错误] 端口 5173 到 5199 均已被占用，请释放端口后重试
    pause
    exit /b 1
)
goto find_port

:start_server
if not "%SERVER_PORT%"=="5173" echo [提示] 端口 5173 已被占用，改用端口 %SERVER_PORT%
echo [启动] 正在启动开发服务器...
start "HabitatQuest Dev" /min cmd.exe /d /k "cd /d ""%~dp0"" && call npm.cmd run dev -- --port %SERVER_PORT% --strictPort"

echo [等待] 正在等待服务器就绪...
set "WAIT_COUNT=0"
:wait_server
netstat -ano -p tcp 2>nul | findstr /r /c:":%SERVER_PORT% .*LISTENING" >nul
if not errorlevel 1 goto open_browser
set /a WAIT_COUNT+=1
if %WAIT_COUNT% geq 30 (
    echo [错误] 等待 30 秒后，端口 %SERVER_PORT% 仍未启动
    echo 请检查 "HabitatQuest Dev" 窗口中的错误信息
    pause
    exit /b 1
)
ping -n 2 127.0.0.1 >nul
goto wait_server

:open_browser
echo [打开] 正在打开浏览器 → http://localhost:%SERVER_PORT%/
start "" "http://localhost:%SERVER_PORT%/"

echo.
echo ============================================
echo   启动完成！如页面无法打开，请检查开发服务器窗口。
echo   停止服务器：关闭名为 "HabitatQuest Dev" 的窗口
echo ============================================
echo.
pause
