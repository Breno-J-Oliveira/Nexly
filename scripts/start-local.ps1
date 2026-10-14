param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $taskRoot
$nodePath = (Get-Command node.exe).Source
& $nodePath scripts/check-local-env.cjs
if ($LASTEXITCODE -ne 0) { throw 'A configuração local precisa ser corrigida.' }

foreach ($port in @(3001, 3002)) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    throw "A porta $port já está ocupada. O processo existente foi preservado."
  }
}
if (-not $SkipBuild) {
  & $nodePath node_modules/typescript/bin/tsc -p packages/shared/tsconfig.json
  if ($LASTEXITCODE -ne 0) { throw 'Falha no build compartilhado.' }
  Push-Location apps/api
  try {
    & $nodePath ../../node_modules/@nestjs/cli/bin/nest.js build
    if ($LASTEXITCODE -ne 0) { throw 'Falha no build da API.' }
  } finally { Pop-Location }
}

$logDirectory = Join-Path $env:TEMP 'nexly-local'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$env:NODE_ENV = 'development'
$env:PORT = '3001'
$env:HOST = '127.0.0.1'
$env:CORS_ORIGIN = 'http://localhost:3002,http://127.0.0.1:3002'
$env:NEXT_PUBLIC_API_URL = 'http://localhost:3001'
$env:NEXUSAUTH_URL = ''
$env:WHATSAPP_PROVIDER = 'disabled'
$env:NEXT_IGNORE_INCORRECT_LOCKFILE = '1'
$api = Start-Process -FilePath $nodePath -ArgumentList '-r ../../scripts/local-api-env.cjs dist/src/main.js' -WorkingDirectory (Join-Path $taskRoot 'apps/api') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'api.log') -RedirectStandardError (Join-Path $logDirectory 'api-error.log')
$web = Start-Process -FilePath $nodePath -ArgumentList '../../node_modules/next/dist/bin/next dev -p 3002 -H 127.0.0.1' -WorkingDirectory (Join-Path $taskRoot 'apps/web') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'web.log') -RedirectStandardError (Join-Path $logDirectory 'web-error.log')
Write-Output "Frontend: http://localhost:3002"
Write-Output "API: http://localhost:3001/api/health"
Write-Output "Processos: API=$($api.Id) WEB=$($web.Id)"
Write-Output "Logs: $logDirectory"
