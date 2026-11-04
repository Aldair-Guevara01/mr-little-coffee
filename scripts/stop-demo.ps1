param([switch]$StopDatabase, [string]$PostgresBin = '')
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$processFile = Join-Path $projectRoot '.local/demo-processes.json'
if (Test-Path -LiteralPath $processFile) {
  $saved = Get-Content -LiteralPath $processFile -Raw | ConvertFrom-Json
  foreach ($property in $saved.PSObject.Properties) {
    $record = $property.Value
    $process = Get-Process -Id $record.processId -ErrorAction SilentlyContinue
    if ($process -and $process.StartTime.ToUniversalTime().Ticks -eq [long]$record.startTicks) {
      Stop-Process -Id $process.Id
      Write-Host "Proceso propio detenido: $($property.Name)."
    }
  }
}
if ($StopDatabase) {
  if (-not $PostgresBin) {
    $installed = Get-ChildItem (Join-Path $env:ProgramFiles 'PostgreSQL') -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Where-Object { Test-Path (Join-Path $_.FullName 'bin/pg_ctl.exe') } | Select-Object -First 1
    if ($installed) { $PostgresBin = Join-Path $installed.FullName 'bin' }
  }
  if (-not $PostgresBin) { throw 'Indica -PostgresBin para detener PostgreSQL.' }
  & (Join-Path $PostgresBin 'pg_ctl.exe') -D (Join-Path $projectRoot '.local/pg-sprints') -m fast -w stop
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener la instancia PostgreSQL aislada.' }
}
