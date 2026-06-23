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

# Perguntar o setor ao usuario/tecnico
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   COLETOR DE INFORMACOES DE INFRAESTRUTURA - SIPLAN HUB  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
$setor = Read-Host "Digite o Setor desta estacao (ex: Protocolo, Registro, Caixa)"
if (-not $setor) {
    $setor = "Geral"
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
    $linhas += (Get-CimInstance Win32_Processor).Name
} catch {
    $linhas += (Get-WmiObject Win32_Processor).Name
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
$linhas += '[WINDOWS]'
try {
    $os = Get-CimInstance Win32_OperatingSystem
} catch {
    $os = Get-WmiObject Win32_OperatingSystem
}
$linhas += "$($os.Caption) - Build $($os.BuildNumber)"

$linhas += ''
$linhas += '=============================================================='

$linhas | Out-File -FilePath $arquivo -Encoding UTF8

Write-Host $linhas -ForegroundColor Cyan
Write-Host ''
Write-Host "Arquivo salvo em: $arquivo" -ForegroundColor Green
Read-Host "`nPressione Enter para fechar"
