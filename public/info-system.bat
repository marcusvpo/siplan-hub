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

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   COLETOR DE INFORMACOES DE INFRAESTRUTURA - SIPLAN HUB  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Selecione uma opcao:"
Write-Host "[1] Coletar dados desta estacao Windows local (Padrao)"
Write-Host "[2] Coletar dados de um servidor Linux remoto via SSH"
Write-Host ""
$opcao = Read-Host "Opcao (Padrao: 1)"
if (-not $opcao) {
    $opcao = "1"
}

if ($opcao -eq "2") {
    $sshAvailable = Get-Command ssh -ErrorAction SilentlyContinue
    if (-not $sshAvailable) {
        Write-Host ""
        Write-Host "ERRO: O comando 'ssh' nativo do Windows nao foi encontrado." -ForegroundColor Red
        Write-Host "Para habilitar, abra o PowerShell como Administrador e execute:" -ForegroundColor Yellow
        Write-Host "Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Pressione Enter para fechar"
        exit
    }

    $sshHost = Read-Host "Digite o IP ou Hostname do Servidor Linux"
    if (-not $sshHost) {
        Write-Host "IP ou Hostname invalido." -ForegroundColor Red
        Read-Host "Pressione Enter para fechar"
        exit
    }
    $sshUser = Read-Host "Digite o usuario SSH (ex: root)"
    if (-not $sshUser) {
        $sshUser = "root"
    }

    Write-Host ""
    Write-Host "Conectando ao servidor Linux... Digite a senha do servidor se solicitado." -ForegroundColor Yellow
    Write-Host ""

    $sshCmd = "echo '=== INFO ==='; " +
              "echo '[HOSTNAME]'; hostname; " +
              "echo '[SETOR]'; echo 'Servidor'; " +
              "echo '[USUARIOS]'; echo 'Atual: '\$(whoami)' | Locais: '\$(cut -d: -f1 /etc/passwd | tr '\n' ',' | sed 's/,$//'); " +
              "echo '[PROCESSADOR]'; lscpu | grep 'Model name' | cut -d':' -f2 | xargs || cat /proc/cpuinfo | grep 'model name' | head -n1 | cut -d':' -f2 | xargs; " +
              "echo '[MEMORIA RAM]'; free -m | awk '/^Mem:/{print int(\$2/1024)\" GB\"}'; " +
              "echo '[DISCO]'; df -h / | awk 'NR==2{print \"/  Total: \"\$2\"  Usado: \"\$3\"  Livre: \"\$4}'; " +
              "echo '[REDE]'; ip -o link show | awk -F': ' '{print \$2}' | grep -v 'lo' | tr '\n' ' '; echo ''; " +
              "echo '[WINDOWS]'; cat /etc/os-release | grep 'PRETTY_NAME' | cut -d'=' -f2 | tr -d '\"'; " +
              "echo '=========='"

    try {
        $saida = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${sshUser}@${sshHost}" $sshCmd
    } catch {
        Write-Host "Erro ao executar conexao SSH: $_" -ForegroundColor Red
        Read-Host "Pressione Enter para fechar"
        exit
    }

    $linhas = @()
    $gravando = $false
    foreach ($linha in $saida) {
        $l = $linha.Trim()
        if ($l -eq "=== INFO ===") {
            $gravando = $true
            $linhas += '=================== INFORMACOES DA MAQUINA ==================='
            continue
        }
        if ($l -eq "==========") {
            $gravando = $false
            $linhas += '=============================================================='
            break
        }
        if ($gravando) {
            $linhas += $linha
        }
    }

    if ($linhas.Count -le 2) {
        Write-Host "Erro: Nenhuma informacao foi coletada do servidor. Verifique a conexao e credenciais." -ForegroundColor Red
        Read-Host "Pressione Enter para fechar"
        exit
    }

    $hostname = "servidor-linux"
    for ($i = 0; $i -lt $linhas.Count; $i++) {
        if ($linhas[$i] -eq "[HOSTNAME]" -and $i -lt ($linhas.Count - 1)) {
            $hostname = $linhas[$i+1].Trim()
            break
        }
    }

    $arquivo = "$pasta\Servidor-$hostname.txt"
} else {
    # Coleta local Windows (codigo existente)
    $linhas = @()
    $linhas += '=================== INFORMACOES DA MAQUINA ==================='

    $hostname = (hostname).Trim()

    $setor = Read-Host "Digite o Setor desta estacao (ex: Protocolo, Registro, Caixa)"
    if (-not $setor) {
        $setor = "Geral"
    }

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
}

$linhas | Out-File -FilePath $arquivo -Encoding UTF8

Write-Host $linhas -ForegroundColor Cyan
Write-Host ''
Write-Host "Arquivo salvo em: $arquivo" -ForegroundColor Green
Read-Host "`nPressione Enter para fechar"
