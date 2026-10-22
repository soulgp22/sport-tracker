# Installe les services Life Sport Tracker sur le ThinkCentre : une tache
# planifiee par service, au demarrage de la machine, sans session ouverte
# (S4U, comme les taches GPORais). A lancer une fois, depuis la session de
# l'utilisateur qui fera tourner les services.
#
# Prerequis : C:\LST\{python,caddy.exe,Caddyfile,run.ps1} et C:\opt\...
# (voir README.md). Ne touche ni a C:\CIR ni aux taches GPORais.
$ErrorActionPreference = 'Stop'
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name

foreach ($name in 'meal-router', 'training-upload', 'lst-catalog', 'caddy') {
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\LST\run.ps1 -Name $name"
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType S4U -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    Register-ScheduledTask -TaskName "LST-$name" -Action $action -Trigger $trigger `
        -Principal $principal -Settings $settings -Force | Out-Null
    Start-ScheduledTask -TaskName "LST-$name"
    Write-Output "LST-$name installee et demarree"
}
