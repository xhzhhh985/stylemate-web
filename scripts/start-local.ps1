param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'

$webRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $webRoot 'backend'
$frontendDir = Join-Path $webRoot 'frontend'
$python = Join-Path $backendDir '.venv\Scripts\python.exe'
$vite = Join-Path $frontendDir 'node_modules\vite\bin\vite.js'
$runtimeDir = Join-Path $webRoot '.local-run'
$stateFile = Join-Path $runtimeDir 'processes.json'
$siteUrl = 'http://127.0.0.1:5173/'

function Test-Port([int]$port) {
  $connection = [System.Net.Sockets.TcpClient]::new()
  try {
    $connection.Connect('127.0.0.1', $port)
    return $true
  } catch {
    return $false
  } finally {
    $connection.Dispose()
  }
}

function Test-Url([string]$url) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Test-RecordedProcess($processId, $startedTicks) {
  try {
    $process = Get-Process -Id ([int]$processId) -ErrorAction Stop
    return $process.StartTime.ToUniversalTime().Ticks -eq [long]$startedTicks
  } catch {
    return $false
  }
}

if (Test-Path $stateFile) {
  try {
    $previous = Get-Content $stateFile -Raw | ConvertFrom-Json
    if ((Test-RecordedProcess $previous.backendPid $previous.backendStartedTicks) -and
        (Test-RecordedProcess $previous.frontendPid $previous.frontendStartedTicks) -and
        (Test-Url 'http://127.0.0.1:8000/api/v1/health') -and (Test-Url $siteUrl)) {
      Write-Host "StyleMate is already running: $siteUrl"
      if (-not $NoBrowser) { Start-Process $siteUrl }
      exit 0
    }
  } catch {
    Write-Host 'Previous launcher state could not be read; checking ports.'
  }
  & (Join-Path $PSScriptRoot 'stop-local.ps1')
}

if (-not (Test-Path $python)) {
  Write-Error 'Backend Python environment is missing: backend/.venv/Scripts/python.exe'
  exit 1
}
if (-not (Test-Path $vite)) {
  Write-Error 'Frontend dependencies are missing: frontend/node_modules. Run npm install once in frontend.'
  exit 1
}
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Error 'Node.js was not found. Install Node.js and reopen this launcher.'
  exit 1
}
if ((Test-Port 8000) -or (Test-Port 5173)) {
  Write-Error 'Port 8000 or 5173 is already in use. Stop any manually started StyleMate terminals with Ctrl+C, then retry.'
  exit 1
}

Write-Host 'Updating the local database schema...'
Push-Location $backendDir
try {
  & $python -m alembic -c alembic.ini upgrade head
  if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
} catch {
  Write-Error $_
  exit 1
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$apiProcess = $null
$webProcess = $null
try {
  Write-Host 'Starting backend and frontend...'
  $apiProcess = Start-Process -FilePath $python -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000') -WorkingDirectory $backendDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'backend.out.log') -RedirectStandardError (Join-Path $runtimeDir 'backend.err.log') -PassThru
  $webProcess = Start-Process -FilePath $node.Source -ArgumentList @("`"$vite`"", '--host', '127.0.0.1', '--strictPort') -WorkingDirectory $frontendDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'frontend.out.log') -RedirectStandardError (Join-Path $runtimeDir 'frontend.err.log') -PassThru

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if ((Test-Url 'http://127.0.0.1:8000/api/v1/health') -and (Test-Url $siteUrl)) {
      $ready = $true
      break
    }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'The services did not become ready. Check the logs in .local-run.' }

  @{
    backendPid = $apiProcess.Id
    backendStartedTicks = $apiProcess.StartTime.ToUniversalTime().Ticks
    frontendPid = $webProcess.Id
    frontendStartedTicks = $webProcess.StartTime.ToUniversalTime().Ticks
  } | ConvertTo-Json | Set-Content -Path $stateFile -Encoding UTF8
} catch {
  if ($webProcess) { Stop-Process -Id $webProcess.Id -Force -ErrorAction SilentlyContinue }
  if ($apiProcess) { Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue }
  Write-Error $_
  exit 1
}

Write-Host "StyleMate is ready: $siteUrl"
Write-Host 'To stop the local services, double-click stop-local.cmd.'
if (-not $NoBrowser) {
  try { Start-Process $siteUrl } catch { Write-Host "Open this URL in your browser: $siteUrl" }
}
