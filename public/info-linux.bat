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
Write-Host "   COLETOR REMOTO DE INFORMACOES LINUX - SIPLAN HUB     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

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

$sshCmd = @'
echo '=== INFO ==='
echo '[HOSTNAME]'
hostname
echo '[SETOR]'
echo 'Servidor'
echo '[USUARIOS]'
echo "Atual: $USER | Locais: $(cut -d: -f1 /etc/passwd | paste -sd, -)"
echo '[PROCESSADOR]'
cpu_model=$(lscpu | grep 'Model name' | cut -d':' -f2 | xargs || cat /proc/cpuinfo | grep 'model name' | head -n1 | cut -d':' -f2 | xargs)
cpu_cores=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo)
echo "$cpu_model ($cpu_cores cpus)"
echo '[MEMORIA RAM]'
free -m | awk '/^Mem:/{print int($2/1024)" GB"}'
echo '[DISCO]'
df -h -P | grep -vE '^tmpfs|^udev|^devtmpfs|^shm|^loop' | awk 'NR>1 {print $6"  Total: "$2"  Usado: "$3"  Livre: "$4}'
echo '[REDE]'
ip -o link show | awk -F': ' '{print $2}' | grep -v 'lo' | tr '\n' ' '
echo ''
echo '[WINDOWS]'
cat /etc/os-release | grep 'PRETTY_NAME' | cut -d'=' -f2 | tr -d '"'
echo '[MARCA/MODELO]'
dmidecode -s system-product-name 2>/dev/null || cat /sys/devices/virtual/dmi/id/product_name 2>/dev/null || echo 'Generic Linux Server'
echo '[VIRTUALIZADO?]'
virt=$(systemd-detect-virt 2>/dev/null); if [ "$virt" = "none" ] || [ -z "$virt" ]; then echo "Não"; else echo "Sim ($virt)"; fi
echo '[ANTI-VIRUS]'
av=""
if [ -d /opt/acronis ] || pgrep -f "acronis" >/dev/null; then av="Acronis Cyber Protect"; fi
if [ -d /opt/CrowdStrike ] || pgrep -f "falcon-sensor" >/dev/null; then av="CrowdStrike Falcon"; fi
if pgrep -f "clamd" >/dev/null || pgrep -f "freshclam" >/dev/null; then av="ClamAV"; fi
if [ -d /opt/microsoft/mdatp ] || pgrep -f "wdavdaemon" >/dev/null; then av="Microsoft Defender"; fi
if [ -z "$av" ]; then echo "Nenhum"; else echo "$av"; fi
echo '[BACKUP]'
backup=""
if [ -d /opt/acronis ] || pgrep -f "acronis" >/dev/null; then backup="Acronis Backup"; fi
if pgrep -f "veeam" >/dev/null; then backup="Veeam Agent"; fi
if crontab -l 2>/dev/null | grep -qE "rsync|rclone|borg|tar|backup"; then backup="Script Customizado (Cron)"; fi
if [ -z "$backup" ]; then echo "Não identificado"; else echo "$backup"; fi
echo '[ESPAÇO PARA O ORION]'
df -h -P / | awk 'NR==2{print $4}'
echo '=========='
'@

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

$linhas | Out-File -FilePath $arquivo -Encoding UTF8

Write-Host $linhas -ForegroundColor Cyan
Write-Host ''
Write-Host "Arquivo salvo em: $arquivo" -ForegroundColor Green
Read-Host "`nPressione Enter para fechar"
