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
echo "Atual: $(whoami) | Locais: $(cut -d: -f1 /etc/passwd | tr '\n' ',' | sed 's/,$//')"
echo '[PROCESSADOR]'
lscpu | grep 'Model name' | cut -d':' -f2 | xargs || cat /proc/cpuinfo | grep 'model name' | head -n1 | cut -d':' -f2 | xargs
echo '[MEMORIA RAM]'
free -m | awk '/^Mem:/{print int($2/1024)" GB"}'
echo '[DISCO]'
df -h / | awk 'NR==2{print "/  Total: "$2"  Usado: "$3"  Livre: "$4}'
echo '[REDE]'
ip -o link show | awk -F': ' '{print $2}' | grep -v 'lo' | tr '\n' ' '
echo ''
echo '[WINDOWS]'
cat /etc/os-release | grep 'PRETTY_NAME' | cut -d'=' -f2 | tr -d '"'
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
