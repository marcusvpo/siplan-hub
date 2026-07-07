#!/usr/bin/env bash
# Auto-deploy do worker na VM.
# Baixa os fontes mais novos de vm-worker/src (branch main) do GitHub e reinicia o
# servico SOMENTE se algum arquivo mudou. Idempotente. Pensado para rodar no cron do
# root (que pode escrever em /home/administrator e reiniciar o servico sem sudo).
#
#   Instalacao (uma vez, como root) - ver README (secao "Auto-deploy"):
#     sudo curl -fsSL https://raw.githubusercontent.com/marcusvpo/siplan-hub/main/vm-worker/scripts/auto-deploy.sh -o /usr/local/bin/siplan-worker-autodeploy.sh
#     sudo chmod +x /usr/local/bin/siplan-worker-autodeploy.sh
#     ( sudo crontab -l 2>/dev/null | grep -v siplan-worker-autodeploy ; \
#       echo '*/5 * * * * /usr/local/bin/siplan-worker-autodeploy.sh >> /var/log/siplan-worker-autodeploy.log 2>&1' ) | sudo crontab -
#
# Observacao: usa a API publica do GitHub (sem token). Limite de 60 req/h por IP e
# suficiente (12 execucoes/h). Se a listagem falhar (rede/limite), sai sem reiniciar.
set -uo pipefail

REPO="marcusvpo/siplan-hub"
BRANCH="main"
SRC_DIR="/home/administrator/vm-worker/src"
SERVICE="siplan-model-worker"
OWNER="administrator"

python3 - "$REPO" "$BRANCH" "$SRC_DIR" <<'PY'
import json, sys, os, urllib.request

repo, branch, srcdir = sys.argv[1], sys.argv[2], sys.argv[3]
api = f"https://api.github.com/repos/{repo}/contents/vm-worker/src?ref={branch}"
hdr = {"User-Agent": "siplan-autodeploy", "Accept": "application/vnd.github+json"}
try:
    data = json.load(urllib.request.urlopen(urllib.request.Request(api, headers=hdr), timeout=30))
except Exception as e:
    print("falha ao listar (ignorado):", e); sys.exit(0)

changed = False
for f in data:
    name = f.get("name", "")
    if not name.endswith(".ts"):
        continue
    url = f.get("download_url")
    if not url:
        continue
    try:
        new = urllib.request.urlopen(
            urllib.request.Request(url, headers={"User-Agent": "siplan-autodeploy"}), timeout=30
        ).read()
    except Exception as e:
        print("falha ao baixar", name, "(ignorado):", e); continue
    dst = os.path.join(srcdir, name)
    old = open(dst, "rb").read() if os.path.exists(dst) else b""
    if new != old:
        open(dst, "wb").write(new)
        print("atualizado:", name)
        changed = True

sys.exit(10 if changed else 0)
PY
rc=$?

if [ "$rc" -eq 10 ]; then
  chown -R "$OWNER":"$OWNER" "$SRC_DIR" 2>/dev/null || true
  systemctl restart "$SERVICE"
  echo "$(date '+%F %T') worker atualizado e reiniciado"
fi
