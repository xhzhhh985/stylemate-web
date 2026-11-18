$ErrorActionPreference = 'Stop'
$webRoot = Split-Path -Parent $PSScriptRoot
$stateFile = Join-Path $webRoot '.local-run\processes.json'

if (-not (Test-Path $stateFile)) {
  Write-Host 'No launcher-managed StyleMate services were found.'
  exit 0
}

$state = Get-Content $stateFile -Raw | ConvertFrom-Json
foreach ($name in @('backend', 'frontend')) {
  $processId = [int]$state."${name}Pid"
  $startedTicks = [long]$state."${name}StartedTicks"
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process -and $process.StartTime.ToUniversalTime().Ticks -eq $startedTicks) {
    Stop-Process -Id $processId -Force
    Write-Host "Stopped $name (PID $processId)."
  }
}
Remove-Item -LiteralPath $stateFile
Write-Host 'StyleMate local services are stopped.'
