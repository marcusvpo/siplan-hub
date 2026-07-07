#!/usr/bin/env bash
# Watchdog do worker de geracao de modelos.
# Se o servico nao estiver ativo, tenta inicia-lo. Rodar via cron do root.
#   Instalacao (como root):
#     cp /home/administrator/vm-worker/scripts/worker-watchdog.sh /usr/local/bin/
#     chmod +x /usr/local/bin/worker-watchdog.sh
#     ( crontab -l 2>/dev/null | grep -v worker-watchdog ; \
#       echo '*/2 * * * * /usr/local/bin/worker-watchdog.sh >> /var/log/siplan-worker-watchdog.log 2>&1' ) | crontab -
#
# Observacao: o systemd ja reinicia o worker em caso de crash (Restart=always).
# Este watchdog cobre o caso de o servico ficar totalmente parado (ex.: stop manual).

SERVICE="siplan-model-worker"

if ! systemctl is-active --quiet "$SERVICE"; then
  echo "$(date '+%F %T') $SERVICE inativo -> iniciando"
  systemctl start "$SERVICE"
fi
