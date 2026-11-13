param(
    [switch]$SkipMigrations
)

$ErrorActionPreference = 'Stop'
$BackendDir = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $BackendDir
$EnvFile = Join-Path $BackendDir '.env'
$WslKeepAlivePidFile = Join-Path $BackendDir '.wsl-redis-keepalive.pid'
$script:NewWslKeepAliveProcessId = $null

function Stop-WithMessage([string]$Message) {
    if ($script:NewWslKeepAliveProcessId) {
        Stop-Process -Id $script:NewWslKeepAliveProcessId -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $WslKeepAlivePidFile -Force -ErrorAction SilentlyContinue
    }
    Write-Host "`nERROR: $Message" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Stop-WithMessage "ไม่พบ backend\.env กรุณาคัดลอก backend\.env.example เป็น backend\.env แล้วใส่ค่าฐานข้อมูล/secret ก่อน"
}

# Prefer the project virtual environment only when its interpreter still works.
$PythonExe = $null
$PythonPrefixArgs = @()
$Candidates = @(
    (Join-Path $ProjectRoot '.venv\Scripts\python.exe'),
    (Join-Path $BackendDir '.venv\Scripts\python.exe')
)
foreach ($Candidate in $Candidates) {
    if (Test-Path -LiteralPath $Candidate) {
        try {
            & $Candidate -c 'import alembic, fastapi, celery' 2>$null
            if ($LASTEXITCODE -eq 0) {
                $PythonExe = $Candidate
                break
            }
        } catch {
            # A venv copied from another directory can contain stale launchers.
            # Keep looking for a usable interpreter instead of stopping here.
        }
    }
}

if (-not $PythonExe) {
    $SystemPython = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($SystemPython) {
        try {
            Push-Location $BackendDir
            & $SystemPython.Source -c 'import alembic, fastapi, celery' 2>$null
            if ($LASTEXITCODE -eq 0) { $PythonExe = $SystemPython.Source }
        } catch {
            $PythonExe = $null
        } finally {
            Pop-Location
        }
    }
}

if (-not $PythonExe) {
    $PyLauncher = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($PyLauncher) {
        try {
            Push-Location $BackendDir
            & $PyLauncher.Source -3 -c 'import alembic, fastapi, celery' 2>$null
            if ($LASTEXITCODE -eq 0) {
                $PythonExe = $PyLauncher.Source
                $PythonPrefixArgs = @('-3')
            }
        } catch {
            $PythonExe = $null
        } finally {
            Pop-Location
        }
    }
}

if (-not $PythonExe) {
    Stop-WithMessage 'หา Python ที่ติดตั้งแพ็กเกจ backend ไม่พบ ให้ติดตั้งด้วย python -m pip install -r backend\requirements.txt แล้วรันไฟล์นี้อีกครั้ง'
}

# Redis must be reachable before OAuth state validation and Celery can work.
# Read only the endpoint host/port from .env; never print the URL (it may include credentials).
$RedisLine = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^\s*REDIS_URL\s*=' } | Select-Object -First 1
if (-not $RedisLine) {
    Stop-WithMessage 'REDIS_URL ใน backend\.env ไม่มีค่า'
}
$RedisUrl = ($RedisLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
$ForwardedLine = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^\s*FORWARDED_ALLOW_IPS\s*=' } | Select-Object -First 1
$ForwardedAllowIps = if ($ForwardedLine) { ($ForwardedLine -split '=', 2)[1].Trim().Trim('"').Trim("'") } else { '127.0.0.1' }
try {
    $RedisUri = [Uri]$RedisUrl
    $RedisHost = $RedisUri.DnsSafeHost
    $RedisPort = if ($RedisUri.IsDefaultPort -or $RedisUri.Port -le 0) { 6379 } else { $RedisUri.Port }
} catch {
    Stop-WithMessage 'REDIS_URL ใน backend\.env ไม่ใช่ URL ที่ถูกต้อง'
}

function Test-TcpEndpoint([string]$HostName, [int]$Port) {
    $Client = [System.Net.Sockets.TcpClient]::new()
    try {
        $Task = $Client.ConnectAsync($HostName, $Port)
        return $Task.Wait(2000) -and $Client.Connected
    } catch {
        return $false
    } finally {
        $Client.Dispose()
    }
}

# WSL can stop an otherwise active service when its distro becomes idle.
# Keep its default distro alive as long as the local Redis-backed app stack
# is expected to run. `wsl --shutdown` ends this hidden helper when finished.
$Wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
if ($Wsl -and $RedisPort -eq 6379 -and $RedisHost -in @('localhost', '127.0.0.1', '::1')) {
    $ExistingKeepAlive = $false
    if (Test-Path -LiteralPath $WslKeepAlivePidFile) {
        $SavedPidText = (Get-Content -LiteralPath $WslKeepAlivePidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
        $SavedPid = 0
        if ([int]::TryParse($SavedPidText, [ref]$SavedPid)) {
            $SavedProcess = Get-Process -Id $SavedPid -ErrorAction SilentlyContinue
            $ExistingKeepAlive = $SavedProcess -and $SavedProcess.ProcessName -like 'wsl*'
        }
        if (-not $ExistingKeepAlive) {
            Remove-Item -LiteralPath $WslKeepAlivePidFile -Force -ErrorAction SilentlyContinue
        }
    }
    if (-not $ExistingKeepAlive) {
        try {
            $KeepAliveProcess = Start-Process -FilePath $Wsl.Source `
                -ArgumentList @('-e', 'sleep', 'infinity') `
                -WindowStyle Hidden -PassThru
            Start-Sleep -Seconds 2
            $KeepAliveProcess.Refresh()
            if (-not $KeepAliveProcess.HasExited) {
                $script:NewWslKeepAliveProcessId = $KeepAliveProcess.Id
                Set-Content -LiteralPath $WslKeepAlivePidFile -Value $KeepAliveProcess.Id -Encoding ascii
                Write-Host 'Keeping the WSL Redis distro awake while the app is running.' -ForegroundColor Cyan
            }
        } catch {
            Write-Host 'Could not start the hidden WSL keep-alive process; continuing with Redis checks.' -ForegroundColor Yellow
        }
    }
}

if (-not (Test-TcpEndpoint $RedisHost $RedisPort) -and
    $RedisHost -in @('localhost', '127.0.0.1', '::1') -and $RedisPort -eq 6379) {
    if ($Wsl) {
        Write-Host 'Redis is not reachable; trying to start redis-server in WSL...' -ForegroundColor Yellow
        & $Wsl.Source -e sh -lc 'sudo service redis-server start'
        Start-Sleep -Seconds 2
    }
}

if (-not (Test-TcpEndpoint $RedisHost $RedisPort)) {
    Stop-WithMessage "เชื่อม Redis ที่ ${RedisHost}:$RedisPort ไม่ได้ เปิด WSL แล้วรัน: sudo service redis-server start"
}

# TCP can accept a connection even when the listener is not Redis, or when
# Redis requires credentials. Verify the actual RESP PING using the exact
# REDIS_URL loaded by the backend before opening any app processes. Use a
# script file because Windows PowerShell 5 can split multiline native -c args.
$RedisPingScript = Join-Path $BackendDir 'scripts\check_redis.py'
$RedisPingExitCode = 1
$RedisPingOutput = @()
Push-Location $BackendDir
try {
    for ($RedisAttempt = 1; $RedisAttempt -le 6; $RedisAttempt++) {
        $RedisPingOutput = @(& $PythonExe @PythonPrefixArgs $RedisPingScript 2>&1)
        $RedisPingExitCode = $LASTEXITCODE
        if ($RedisPingExitCode -eq 0) { break }
        if ($RedisAttempt -lt 6) {
            Write-Host "Redis PING not ready (attempt $RedisAttempt/6); retrying..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
} finally {
    Pop-Location
}
if ($RedisPingExitCode -eq 0) {
    $RedisPingOutput | ForEach-Object { Write-Host $_ }
}
if ($RedisPingExitCode -ne 0) {
    $RedisPingOutput | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
    Stop-WithMessage "Redis PING ที่ ${RedisHost}:$RedisPort ไม่ผ่านหลังรอ 12 วินาที ตรวจสถานะ Redis ใน WSL ด้วย 'sudo service redis-server status' และทดสอบ 'redis-cli -h 127.0.0.1 -p 6379 ping' ซึ่งต้องได้ PONG ก่อนเริ่มระบบ หากไม่พบ service/คำสั่ง ให้ติดตั้ง redis-server ใน WSL ก่อน"
}

$ExistingApi = @(
    Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -gt 0 }
)
if ($ExistingApi) {
    $ProcessIds = @($ExistingApi | Select-Object -ExpandProperty OwningProcess -Unique)
    $ProcessDetails = foreach ($ProcessId in $ProcessIds) {
        $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($Process) { "$($Process.ProcessName) (PID $ProcessId)" } else { "PID $ProcessId" }
    }
    $Details = $ProcessDetails -join ', '
    $LiveProcesses = @($ProcessIds | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
    if ($LiveProcesses.Count -eq 0) {
        Stop-WithMessage "Windows รายงานว่าพอร์ต 8000 ถูกใช้งานโดย $Details แต่ไม่พบโปรเซสจริง`nหากใช้ WSL ให้รัน 'wsl --shutdown' ใน PowerShell (จะปิด Redis ใน WSL ด้วย; สคริปต์จะพยายามเริ่ม Redis ใหม่) แล้วรันสคริปต์นี้อีกครั้ง`nหากยังไม่หาย ตรวจด้วย: netstat -ano | findstr :8000 และ netsh interface portproxy show all"
    }
    Stop-WithMessage "พอร์ต 8000 ถูกใช้งานอยู่โดย $Details`nหยุดหน้าต่าง backend เดิมด้วย Ctrl+C แล้วรันสคริปต์นี้ใหม่ หากเป็นโปรเซสเดิมที่ค้าง ใช้ taskkill /PID <PID> /T /F เพื่อหยุดทั้ง process tree (แทน <PID> ด้วยเลขที่แสดง)"
}

Push-Location $BackendDir
try {
    if (-not $SkipMigrations) {
        Write-Host 'Applying database migrations...' -ForegroundColor Cyan
        & $PythonExe @PythonPrefixArgs -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) {
            Stop-WithMessage 'Migration ไม่สำเร็จ ตรวจ DATABASE_URL และ error ด้านบนก่อน'
        }
    }
} finally {
    Pop-Location
}

$PythonCommand = "& '$PythonExe'"
if ($PythonPrefixArgs.Count -gt 0) {
    $PythonCommand += ' ' + ($PythonPrefixArgs -join ' ')
}
$WindowsPowerShell = (Get-Command powershell.exe -ErrorAction SilentlyContinue).Source
if (-not $WindowsPowerShell) {
    Stop-WithMessage 'หา powershell.exe ไม่พบ (สคริปต์นี้ออกแบบสำหรับ Windows PowerShell)'
}

function Start-BackendConsole([string]$Title, [string]$PythonArgs) {
    $Command = "`$Host.UI.RawUI.WindowTitle = '$Title'; Set-Location -LiteralPath '$BackendDir'; $PythonCommand $PythonArgs"
    $EncodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Command))
    Start-Process -FilePath $WindowsPowerShell `
        -ArgumentList @('-NoExit', '-EncodedCommand', $EncodedCommand) `
        -WorkingDirectory $BackendDir
}

Start-BackendConsole 'KMAPS API - port 8000' "-m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips '$ForwardedAllowIps'"
Start-BackendConsole 'KMAPS Celery Worker' '-m celery -A worker.celery_app worker --pool=solo --loglevel=INFO'
Start-BackendConsole 'KMAPS Celery Beat' '-m celery -A worker.celery_app beat --loglevel=INFO'

Write-Host 'รอให้ API และฐานข้อมูลพร้อมก่อนเปิดหน้าเว็บ...' -ForegroundColor Cyan
$ApiReady = $false
for ($Attempt = 0; $Attempt -lt 30; $Attempt++) {
    try {
        $Health = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 3
        if ($Health.status -eq 'healthy') {
            $ApiReady = $true
            break
        }
    } catch {
        # Uvicorn may still be starting; retry for up to 60 seconds.
    }
    Start-Sleep -Seconds 2
}
if (-not $ApiReady) {
    Stop-WithMessage 'API/ฐานข้อมูลยังไม่พร้อมภายใน 60 วินาที ตรวจหน้าต่าง KMAPS API ก่อน แล้วลองรันสคริปต์อีกครั้ง'
}

$FrontendDir = Join-Path $ProjectRoot 'frontend'
$FrontendUrl = 'http://localhost:5500/pages/login.html'
$FrontendListener = Get-NetTCPConnection -LocalPort 5500 -State Listen -ErrorAction SilentlyContinue
if ($FrontendListener) {
    try {
        $ExistingFrontend = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing -TimeoutSec 3
        if ($ExistingFrontend.StatusCode -ne 200) { throw 'Unexpected frontend response' }
        Write-Host 'พบ frontend server ที่พอร์ต 5500 แล้ว ใช้งานตัวเดิม' -ForegroundColor Yellow
    } catch {
        Stop-WithMessage 'พอร์ต 5500 ถูกใช้งาน แต่ไม่พบหน้า frontend ของ KMAPS กรุณาปิดโปรเซสที่ใช้พอร์ตนี้แล้วรันใหม่'
    }
} else {
    Start-BackendConsole 'KMAPS Frontend - port 5500' "-m http.server 5500 --bind 127.0.0.1 --directory '$FrontendDir'"
    $FrontendReady = $false
    for ($Attempt = 0; $Attempt -lt 15; $Attempt++) {
        try {
            $FrontendResponse = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing -TimeoutSec 2
            if ($FrontendResponse.StatusCode -eq 200) {
                $FrontendReady = $true
                break
            }
        } catch {
            # Wait briefly for the static server process to bind to port 5500.
        }
        Start-Sleep -Seconds 1
    }
    if (-not $FrontendReady) {
        Stop-WithMessage 'เปิด frontend server ไม่สำเร็จ ตรวจหน้าต่าง KMAPS Frontend และพอร์ต 5500'
    }
}

Write-Host "`nBackend API, Celery worker, Celery Beat และ frontend พร้อมใช้งานแล้ว" -ForegroundColor Green
Write-Host 'API: http://localhost:8000/health'
Write-Host "Frontend: $FrontendUrl"
Write-Host 'หยุดแต่ละส่วนด้วย Ctrl+C ในหน้าต่างของส่วนนั้น'
Start-Process $FrontendUrl
