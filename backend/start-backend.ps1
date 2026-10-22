param(
    [switch]$SkipMigrations
)

$ErrorActionPreference = 'Stop'
$BackendDir = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $BackendDir
$EnvFile = Join-Path $BackendDir '.env'

function Stop-WithMessage([string]$Message) {
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

if (-not (Test-TcpEndpoint $RedisHost $RedisPort) -and
    $RedisHost -in @('localhost', '127.0.0.1', '::1') -and $RedisPort -eq 6379) {
    $Wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
    if ($Wsl) {
        Write-Host 'Redis is not reachable; trying to start redis-server in WSL...' -ForegroundColor Yellow
        & $Wsl.Source -e sh -lc 'sudo service redis-server start'
        Start-Sleep -Seconds 2
    }
}

if (-not (Test-TcpEndpoint $RedisHost $RedisPort)) {
    Stop-WithMessage "เชื่อม Redis ที่ ${RedisHost}:$RedisPort ไม่ได้ เปิด WSL แล้วรัน: sudo service redis-server start"
}

$ExistingApi = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
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
Start-Sleep -Seconds 2
Start-BackendConsole 'KMAPS Celery Worker' '-m celery -A worker.celery_app worker --pool=solo --loglevel=INFO'
Start-BackendConsole 'KMAPS Celery Beat' '-m celery -A worker.celery_app beat --loglevel=INFO'

Write-Host "`nBackend API, Celery worker และ Celery Beat เริ่มทำงานในหน้าต่างแยกแล้ว" -ForegroundColor Green
Write-Host 'API: http://localhost:8000/health'
Write-Host 'หยุดแต่ละส่วนด้วย Ctrl+C ในหน้าต่างของส่วนนั้น'
Write-Host 'Frontend ไม่ได้ถูกรันโดยไฟล์นี้'
