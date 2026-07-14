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
# Servicos a reiniciar quando o codigo muda. Com o split por funcao rodam 2
# (modelos + IA rapida); so reinicia os que existem (o segundo e opcional).
SERVICES="siplan-model-worker siplan-ai-worker"
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
changed_src=0
[ "$rc" -eq 10 ] && changed_src=1

# Sincroniza package.json / package-lock.json; se mudarem, roda npm install.
WORK_DIR="/home/administrator/vm-worker"
need_install=0
for pf in package.json package-lock.json; do
  tmp=$(mktemp)
  if curl -fsSL "https://raw.githubusercontent.com/${REPO}/${BRANCH}/vm-worker/${pf}" -o "$tmp"; then
    if ! cmp -s "$tmp" "${WORK_DIR}/${pf}"; then
      cp "$tmp" "${WORK_DIR}/${pf}"
      chown "$OWNER":"$OWNER" "${WORK_DIR}/${pf}" 2>/dev/null || true
      need_install=1
      echo "atualizado: $pf"
    fi
  fi
  rm -f "$tmp"
done

if [ "$need_install" -eq 1 ]; then
  NODE_BIN=$(ls -d /home/administrator/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1)
  echo "package mudou -> npm install"
  sudo -u "$OWNER" env PATH="${NODE_BIN}:${PATH}" npm install --prefix "$WORK_DIR" --no-audit --no-fund || echo "npm install falhou (verifique manualmente)"
fi

if [ "$changed_src" -eq 1 ] || [ "$need_install" -eq 1 ]; then
  chown -R "$OWNER":"$OWNER" "$SRC_DIR" 2>/dev/null || true
  for svc in $SERVICES; do
    # so reinicia servicos instalados (o siplan-ai-worker e opcional)
    if systemctl list-unit-files "${svc}.service" 2>/dev/null | grep -q "${svc}.service"; then
      systemctl restart "$svc" && echo "$(date '+%F %T') $svc atualizado e reiniciado"
    fi
  done
fi
