@echo off
cd /d "%~dp0"
echo ===== Blog Deploy =====
echo.
where git >nul 2>&1
if %errorlevel% equ 0 (
    echo ===== git diff =====
    git diff
    echo ====================
    echo.
)
set http_proxy=http://127.0.0.1:7897
set https_proxy=http://127.0.0.1:7897
echo Running hexo clean...
call hexo clean
if %errorlevel% neq 0 (
    echo hexo clean failed!
    pause
    exit /b 1
)
echo Running hexo deploy...
call hexo d
if %errorlevel% neq 0 (
    echo hexo deploy failed!
    pause
    exit /b 1
)
echo.
echo ===== Done =====
pause
