#!/usr/bin/env bash
# Backup lógico do Postgres do Nexly: pg_dump -> cifra (gpg AES-256) -> upload.
#
# Uso:
#   bash scripts/backup-db.sh
#
# Variáveis de ambiente (obrigatórias):
#   BACKUP_DATABASE_URL   string de conexão de LEITURA do Postgres
#   BKP_PASSPHRASE        senha usada para cifrar o dump (nunca commitar)
#
# Destino do upload (opcional — sem S3_BUCKET o dump fica apenas em disco):
#   S3_BUCKET             nome do bucket
#   S3_ENDPOINT           endpoint S3 (ex.: https://<id>.r2.cloudflarestorage.com)
#   AWS_ACCESS_KEY_ID     credencial
#   AWS_SECRET_ACCESS_KEY credencial
#   S3_PREFIX             prefixo dentro do bucket (padrão: postgres)
#   BACKUP_RETENTION_DAYS retenção local em dias (padrão: 7)
#
# O arquivo sai como nexly-YYYY-MM-DD.dump.gpg. O nome NÃO contém hora de
# propósito: rodando mais de uma vez no dia, o backup sobrescreve o anterior
# (idempotente) em vez de acumular lixo.

set -euo pipefail
umask 077

: "${BACKUP_DATABASE_URL:?defina BACKUP_DATABASE_URL}"
: "${BKP_PASSPHRASE:?defina BKP_PASSPHRASE (senha de cifragem)}"

S3_PREFIX="${S3_PREFIX:-postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${BASE_DIR}/backups"
STAMP="$(date -u +%Y-%m-%d)"
ENC_FILE="${OUT_DIR}/nexly-${STAMP}.dump.gpg"

mkdir -p "${OUT_DIR}"
WORK_DIR="$(mktemp -d "${OUT_DIR}/.backup.XXXXXX")"
RAW_FILE="${WORK_DIR}/database.dump"
ENC_TMP="${WORK_DIR}/database.dump.gpg"
cleanup() {
  rm -f -- "${RAW_FILE}" "${ENC_TMP}"
  rmdir -- "${WORK_DIR}"
}
trap cleanup EXIT

echo "[backup] iniciando dump de ${STAMP} (UTC)"

# --format=custom permite restore seletivo com pg_restore.
# --no-owner/--no-acl: o dump restaura em qualquer role (ex.: banco de teste).
pg_dump \
  --dbname="${BACKUP_DATABASE_URL}" \
  --format=custom \
  --schema=public \
  --strict-names \
  --no-owner \
  --no-acl \
  --file="${RAW_FILE}"

RAW_BYTES="$(wc -c < "${RAW_FILE}" | tr -d ' ')"
if [ "${RAW_BYTES}" -lt 1024 ]; then
  echo "[backup] ERRO: dump suspeito (${RAW_BYTES} bytes). Abortando sem apagar nada." >&2
  exit 1
fi
echo "[backup] dump gerado: ${RAW_BYTES} bytes"

# Cifra em repouso: o dump contém dados pessoais (LGPD Art. 46).
printf '%s' "${BKP_PASSPHRASE}" | gpg --batch --yes --pinentry-mode loopback \
  --symmetric --cipher-algo AES256 --passphrase-fd 0 \
  --output "${ENC_TMP}" \
  "${RAW_FILE}"
mv -f -- "${ENC_TMP}" "${ENC_FILE}"
echo "[backup] cifrado: $(basename "${ENC_FILE}")"

if [ -n "${S3_BUCKET:-}" ]; then
  S3_URI="s3://${S3_BUCKET}/${S3_PREFIX}/$(basename "${ENC_FILE}")"
  AWS_ARGS=()
  [ -n "${S3_ENDPOINT:-}" ] && AWS_ARGS+=(--endpoint-url "${S3_ENDPOINT}")
  aws s3 cp "${ENC_FILE}" "${S3_URI}" "${AWS_ARGS[@]}"
  echo "[backup] enviado para ${S3_URI}"
else
  echo "[backup] S3_BUCKET não definido — backup mantido apenas em ${OUT_DIR}"
fi

# Retenção local (o bucket tem lifecycle próprio para 30 dias).
find "${OUT_DIR}" -name 'nexly-*.dump.gpg' -type f -mtime "+${BACKUP_RETENTION_DAYS}" -delete
echo "[backup] concluído com sucesso"
