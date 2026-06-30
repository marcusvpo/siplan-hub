# 2>nul & @goto :cmd
<#
:cmd
@echo off
set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ([System.IO.File]::ReadAllText('%~f0'))"
exit /b
#>

$pasta = $env:SCRIPT_DIR
if (-not $pasta) {
    $pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $pasta) {
    $pasta = "."
}

$linhas = @()
$linhas += '=================== INFORMACOES DA MAQUINA ==================='

$hostname = (hostname).Trim()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   COLETOR DE INFORMACOES DE INFRAESTRUTURA - SIPLAN HUB  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Detectar se o sistema operacional e Windows Server
$isServerOS = $false
try {
    $osInfo = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    if (-not $osInfo) {
        $osInfo = Get-WmiObject Win32_OperatingSystem -ErrorAction SilentlyContinue
    }
    if ($osInfo -and ($osInfo.ProductType -eq 2 -or $osInfo.ProductType -eq 3)) {
        $isServerOS = $true
    }
} catch {
    $caption = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).Caption
    if (-not $caption) {
        $caption = (Get-WmiObject Win32_OperatingSystem -ErrorAction SilentlyContinue).Caption
    }
    if ($caption -and $caption -like "*Server*") {
        $isServerOS = $true
    }
}

$ambiente = "Local"
$failover = "Nao"

if ($isServerOS) {
    $setor = "Servidor"
    Write-Host ""
    Write-Host "--- DETECTADO SISTEMA OPERACIONAL WINDOWS SERVER ---" -ForegroundColor Green
    Write-Host "--- PERGUNTAS ADICIONAIS PARA SERVIDORES ---" -ForegroundColor Yellow
    $ambInput = Read-Host "Este servidor e [L]ocal ou esta na [N]uvem? (L/N)"
    if ($ambInput -eq 'N' -or $ambInput -eq 'n' -or $ambInput.ToLower().StartsWith("nuv")) {
        $ambiente = "Nuvem"
    }
    
    $failInput = Read-Host "A rede deste servidor possui failover/redundancia de internet? (S/N)"
    if ($failInput -eq 'S' -or $failInput -eq 's' -or $failInput.ToLower().StartsWith("sim")) {
        $failover = "Sim"
    }
} else {
    $setor = Read-Host "Digite o Setor desta estacao (ex: Protocolo, Registro, Caixa)"
    if (-not $setor) {
        $setor = "Geral"
    }
}

# Limpar o setor de caracteres invalidos e espacos para uso no nome do arquivo
$setor_clean = $setor -replace '[\\/:*?"<>| ]', '-'
while ($setor_clean -match '--') {
    $setor_clean = $setor_clean -replace '--', '-'
}
$setor_clean = $setor_clean.Trim('-')
if (-not $setor_clean) {
    $setor_clean = "Geral"
}

$arquivo = "$pasta\$setor_clean-$hostname.txt"

$linhas += ''
$linhas += '[HOSTNAME]'
$linhas += $hostname

$linhas += ''
$linhas += '[SETOR]'
$linhas += $setor

$linhas += ''
$linhas += '[USUARIOS]'
$current = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$local = ""
try {
    $local = (Get-WmiObject Win32_UserAccount -Filter "LocalAccount=True" -ErrorAction SilentlyContinue | ForEach-Object { $_.Name }) -join ', '
} catch {
    try {
        $local = (Get-LocalUser | Select-Object -ExpandProperty Name) -join ', '
    } catch {
        $local = $env:USERNAME
    }
}
$linhas += "Atual: $current | Locais: $local"

$linhas += ''
$linhas += '[PROCESSADOR]'
try {
    $cpu = Get-CimInstance Win32_Processor
    $cores = $cpu.NumberOfCores
    $linhas += "$($cpu.Name) ($cores cpus)"
} catch {
    try {
        $cpu = Get-WmiObject Win32_Processor
        $cores = $cpu.NumberOfCores
        $linhas += "$($cpu.Name) ($cores cpus)"
    } catch {
        $linhas += $env:PROCESSOR_IDENTIFIER
    }
}

$linhas += ''
$linhas += '[MEMORIA RAM]'
$mem = 0
try {
    $mem = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
} catch {
    $mem = [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
}
$linhas += "$mem GB"

$linhas += ''
$linhas += '[DISCO]'
try {
    Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
        $total = [math]::Round($_.Size / 1GB)
        $free  = [math]::Round($_.FreeSpace / 1GB)
        $used  = $total - $free
        $linhas += "$($_.DeviceID)  Total: $total GB  Usado: $used GB  Livre: $free GB"
    }
} catch {
    Get-WmiObject Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
        $total = [math]::Round($_.Size / 1GB)
        $free  = [math]::Round($_.FreeSpace / 1GB)
        $used  = $total - $free
        $linhas += "$($_.DeviceID)  Total: $total GB  Usado: $used GB  Livre: $free GB"
    }
}

$linhas += ''
$linhas += '[REDE]'
try {
    Get-CimInstance Win32_NetworkAdapter -Filter 'NetEnabled=TRUE' | ForEach-Object {
        if ($_.Speed) {
            $speed = [math]::Round($_.Speed / 1MB)
            $linhas += "$($_.Name): $speed Mbps"
        } else {
            $linhas += "$($_.Name): velocidade nao reportada"
        }
    }
} catch {
    Get-WmiObject Win32_NetworkAdapter -Filter 'NetEnabled=TRUE' | ForEach-Object {
        if ($_.Speed) {
            $speed = [math]::Round($_.Speed / 1MB)
            $linhas += "$($_.Name): velocidade nao reportada"
        } else {
            $linhas += "$($_.Name): velocidade nao reportada"
        }
    }
}

$linhas += ''
$linhas += '[SO]'
try {
    $os = Get-CimInstance Win32_OperatingSystem
} catch {
    $os = Get-WmiObject Win32_OperatingSystem
}
$linhas += "$($os.Caption) - Build $($os.BuildNumber)"

$linhas += ''
$linhas += '[MARCA/MODELO]'
try {
    $system = Get-CimInstance Win32_ComputerSystem
    $linhas += "$($system.Manufacturer) $($system.Model)"
} catch {
    try {
        $system = Get-WmiObject Win32_ComputerSystem
        $linhas += "$($system.Manufacturer) $($system.Model)"
    } catch {
        $linhas += "Desconhecido"
    }
}

$linhas += ''
$linhas += '[VIRTUALIZADO]'
try {
    $system = Get-CimInstance Win32_ComputerSystem
    $isVM = if ($system.Model -match 'Virtual|VMware|VirtualBox|Xen|KVM|HVM|Hyper-V') { "Sim" } else { "Nao" }
    $linhas += $isVM
} catch {
    $linhas += "Nao"
}

$linhas += ''
$linhas += '[ANTI-VIRUS]'
try {
    $av = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction SilentlyContinue | ForEach-Object { $_.displayName }
    if (-not $av) {
        if (Get-Process -Name "MsMpEng" -ErrorAction SilentlyContinue) { $av = "Windows Defender" } else { $av = "Nenhum" }
    } else {
        $av = $av -join ", "
    }
    $linhas += $av
} catch {
    if (Get-Process -Name "MsMpEng" -ErrorAction SilentlyContinue) { $linhas += "Windows Defender" } else { $linhas += "Nenhum" }
}

$linhas += ''
$linhas += '[BACKUP]'
$linhas += "Nao identificado"

$linhas += ''
$linhas += '[ESPACO ORION]'
try {
    $freeSpace = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | ForEach-Object { [math]::Round($_.FreeSpace / 1GB) }
    $linhas += "$freeSpace GB"
} catch {
    $linhas += "N/A"
}

$linhas += ''
$linhas += '[AMBIENTE]'
$linhas += $ambiente

$linhas += ''
$linhas += '[REDE FAILOVER]'
$linhas += $failover

$linhas += ''
$linhas += '=============================================================='

$linhas | Out-File -FilePath $arquivo -Encoding UTF8

Write-Host $linhas -ForegroundColor Cyan
Write-Host ''
Write-Host "Arquivo salvo em: $arquivo" -ForegroundColor Green
Read-Host "`nPressione Enter para fechar"
