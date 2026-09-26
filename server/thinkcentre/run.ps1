# Superviseur d'un service Life Sport Tracker sur le ThinkCentre : lance le
# service, journalise, et le relance 5 s apres chaque arret (equivalent du
# Restart=always de systemd sur le VPS). Une tache planifiee par service.
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('meal-router', 'training-upload', 'lst-catalog', 'caddy')]
    [string]$Name
)

# Sans cela, open() sans encodage ecrirait en cp1252 sous Windows.
$env:PYTHONUTF8 = '1'
# Les scripts du VPS utilisent des chemins /opt/... : sous Windows ils se
# resolvent sur le lecteur courant, d'ou C:\opt et ce repertoire de travail.
Set-Location 'C:\'

$py = 'C:\LST\python\python.exe'
$commands = @{
    'meal-router'     = @($py, 'C:\opt\meal-server\meal_router.py')
    'training-upload' = @($py, 'C:\opt\meal-training\upload_server.py')
    'lst-catalog'     = @($py, 'C:\opt\lst-catalog\lst_catalog.py')
    'caddy'           = @('C:\LST\caddy.exe', 'run', '--config', 'C:\LST\Caddyfile', '--adapter', 'caddyfile')
}
$log = "C:\LST\logs\$Name.log"

while ($true) {
    # Journal borne : au-dela de 5 Mo, l'ancien est garde une fois.
    if ((Test-Path $log) -and (Get-Item $log).Length -gt 5MB) {
        Move-Item $log "$log.1" -Force
    }
    Add-Content $log "$(Get-Date -Format s) demarrage"
    $exe = $commands[$Name][0]
    $arguments = $commands[$Name][1..($commands[$Name].Count - 1)]
    & $exe @arguments *>> $log
    Add-Content $log "$(Get-Date -Format s) arret (code $LASTEXITCODE), relance dans 5 s"
    Start-Sleep -Seconds 5
}
