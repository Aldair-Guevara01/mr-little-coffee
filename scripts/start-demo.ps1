param([string]$PostgresBin = '', [switch]$Install, [switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$localRoot = Join-Path $projectRoot '.local'
$frontendRoot = Join-Path $projectRoot 'frontend'
$backendRoot = Join-Path $projectRoot 'backend'
New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
Set-Location -LiteralPath $projectRoot

function Check-Exit([string]$Operation) { if ($LASTEXITCODE -ne 0) { throw "$Operation fallo (codigo $LASTEXITCODE)." } }
function Random-Secret { return (& node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))") }
function Port-Open([int]$Port) {
  $client = New-Object Net.Sockets.TcpClient
  try { return $client.ConnectAsync('127.0.0.1', $Port).Wait(500) -and $client.Connected } catch { return $false } finally { $client.Dispose() }
}
function Wait-Http([string]$Url) {
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    try { return Invoke-RestMethod -Uri $Url -TimeoutSec 3 } catch { Start-Sleep -Seconds 1 }
  }
  throw "No respondio $Url. Revisa .local/*.stderr.log."
}
function Owned-Process($Process) {
  return @{ processId = $Process.Id; startTicks = $Process.StartTime.ToUniversalTime().Ticks }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instala Node.js 20 o superior.' }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw 'Instala pnpm 9.4.0.' }
if ($Install -or -not (Test-Path (Join-Path $frontendRoot 'node_modules/next/package.json')) -or -not (Test-Path (Join-Path $backendRoot 'node_modules/@nestjs/core/package.json'))) {
  & pnpm install --frozen-lockfile
  Check-Exit 'Instalacion del workspace'
}
if (-not $PostgresBin) {
  $installed = Get-ChildItem (Join-Path $env:ProgramFiles 'PostgreSQL') -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Where-Object { Test-Path (Join-Path $_.FullName 'bin/pg_ctl.exe') } | Select-Object -First 1
  if ($installed) { $PostgresBin = Join-Path $installed.FullName 'bin' }
  else { $pgCommand = Get-Command pg_ctl -ErrorAction SilentlyContinue; if ($pgCommand) { $PostgresBin = Split-Path $pgCommand.Source } }
}
if (-not $PostgresBin -or -not (Test-Path (Join-Path $PostgresBin 'pg_ctl.exe'))) { throw 'PostgreSQL no encontrado. Usa -PostgresBin con la carpeta bin de PostgreSQL 13 o superior.' }

$passwordFile = Join-Path $localRoot 'pg-password'
if (-not (Test-Path -LiteralPath $passwordFile)) { [IO.File]::WriteAllText($passwordFile, (Random-Secret)) }
$demoPassword = (Get-Content -LiteralPath $passwordFile -Raw).Trim()
$pgData = Join-Path $localRoot 'pg-sprints'
if (-not (Test-Path (Join-Path $pgData 'PG_VERSION'))) {
  & (Join-Path $PostgresBin 'initdb.exe') -D $pgData -U coffee_test --auth=scram-sha-256 --encoding=UTF8 --locale=C "--pwfile=$passwordFile"
  Check-Exit 'Inicializacion PostgreSQL'
}
& (Join-Path $PostgresBin 'pg_ctl.exe') -D $pgData status *> $null
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $PostgresBin 'pg_ctl.exe') -D $pgData -l (Join-Path $localRoot 'pg-sprints.log') -o '-p 55432 -h 127.0.0.1' -w start
  Check-Exit 'Inicio PostgreSQL aislado'
}

$runtimeFile = Join-Path $localRoot 'demo-runtime.json'
if (-not (Test-Path -LiteralPath $runtimeFile)) {
  @{ jwtSecret = (Random-Secret); csrfSecret = (Random-Secret) } | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $runtimeFile
}
$runtime = Get-Content -LiteralPath $runtimeFile -Raw | ConvertFrom-Json
$variables = @('DATABASE_URL','JWT_SECRET','CSRF_SECRET','CORS_ORIGINS','PORT','NODE_ENV','DEMO_ACCOUNTS_ENABLED','PGPASSWORD','NEXT_PUBLIC_API_URL','NEXT_VERIFY')
$previous = @{}
foreach ($key in $variables) { $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
try {
  $env:PGPASSWORD = $demoPassword
  foreach ($database in @('coffee_sprints_dev','coffee_sprints_test')) {
    $exists = (& (Join-Path $PostgresBin 'psql.exe') -h 127.0.0.1 -p 55432 -U coffee_test -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$database'") -join ''
    Check-Exit 'Consulta de base local'
    if ($exists.Trim() -ne '1') { & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p 55432 -U coffee_test $database; Check-Exit 'Creacion de base local' }
  }
  $env:DATABASE_URL = 'postgresql://coffee_test:' + [Uri]::EscapeDataString($demoPassword) + '@127.0.0.1:55432/coffee_sprints_dev'
  $env:JWT_SECRET = $runtime.jwtSecret
  $env:CSRF_SECRET = $runtime.csrfSecret
  $env:CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001'
  $env:PORT = '4000'; $env:NODE_ENV = 'development'; $env:DEMO_ACCOUNTS_ENABLED = 'true'
  $env:NEXT_PUBLIC_API_URL = 'http://localhost:4000/api'
  Remove-Item Env:NEXT_VERIFY -ErrorAction SilentlyContinue
  & pnpm --dir backend migration:run; Check-Exit 'Migraciones'
  & pnpm --dir backend seed; Check-Exit 'Seed repetible'
  if (-not $SkipBuild) { & pnpm --dir backend build; Check-Exit 'Build backend' }

  $processFile = Join-Path $localRoot 'demo-processes.json'
  $owned = @{}
  if (Test-Path $processFile) { $saved = Get-Content $processFile -Raw | ConvertFrom-Json; foreach ($property in $saved.PSObject.Properties) { $owned[$property.Name] = $property.Value } }
  $nodeExecutable = (Get-Command node).Source
  if (-not (Port-Open 4000)) {
    $apiProcess = Start-Process -FilePath $nodeExecutable -ArgumentList 'dist/main.js' -WorkingDirectory $backendRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localRoot 'api.stdout.log') -RedirectStandardError (Join-Path $localRoot 'api.stderr.log') -PassThru
    $owned.api = Owned-Process $apiProcess
    $owned | ConvertTo-Json | Set-Content -Encoding UTF8 $processFile
  }
  $health = Wait-Http 'http://localhost:4000/api/health'
  if ($health.status -ne 'ok' -or -not $health.demoAccountsEnabled) { throw 'El puerto 4000 tiene una API sin modo demo. Deten la API anterior y vuelve a ejecutar este script.' }
  if (-not (Port-Open 3000)) {
    $nextExecutable = Join-Path $frontendRoot 'node_modules/next/dist/bin/next'
    $frontProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @(('"' + $nextExecutable + '"'),'dev','-p','3000','-H','127.0.0.1') -WorkingDirectory $frontendRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localRoot 'frontend.stdout.log') -RedirectStandardError (Join-Path $localRoot 'frontend.stderr.log') -PassThru
    $owned.frontend = Owned-Process $frontProcess
    $owned | ConvertTo-Json | Set-Content -Encoding UTF8 $processFile
  }
  $null = Wait-Http 'http://localhost:3000'
  $catalog = Invoke-RestMethod 'http://localhost:4000/api/products'
  Write-Host "Demo lista: http://localhost:3000 | Catalogo: $($catalog.total) productos activos."
  Write-Host 'Acceso: http://localhost:3000/login | admin / 1234 | cliente / 1234'
  Write-Host 'API y OpenAPI: http://localhost:4000/api/docs'
  Write-Host 'Detener procesos creados por este script: .\scripts\stop-demo.ps1 (base: agregar -StopDatabase).'
} finally {
  foreach ($key in $variables) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') }
}
