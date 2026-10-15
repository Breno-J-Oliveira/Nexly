#!/usr/bin/env bash
# Teste de RESTORE do backup do Nexly.
#
# Um backup nunca testado não é um backup: este script baixa o dump mais
# recente, restaura em um banco DESCARTÁVEL, confere as contagens das tabelas
# principais e apaga o banco no final. Roda semanalmente no CI.
#
# Uso:
#   bash scripts/restore-test.sh
#
# Variáveis de ambiente (obrigatórias):
#   RESTORE_ADMIN_URL  conexão ao banco administrativo do MESMO servidor
#                      (ex.: postgresql://user:senha@host:5432/postgres)
#   BKP_PASSPHRASE     senha usada para decifrar o dump
#
# Opcionais:
#   DUMP_FILE          caminho de um .dump.gpg local (pula o download)
#   S3_BUCKET/S3_ENDPOINT/S3_PREFIX  origem do dump mais recente
#   TEST_DB_NAME       nome do banco temporário (padrão: nexly_restore_test)
#   MIN_EMPRESAS       mínimo esperado de empresas (padrão: 1)
#   MIN_USUARIOS       mínimo esperado de usuários (padrão: 1)

set -euo pipefail
umask 077

: "${RESTORE_ADMIN_URL:?defina RESTORE_ADMIN_URL (conexão ao banco postgres do servidor)}"
: "${BKP_PASSPHRASE:?defina BKP_PASSPHRASE}"
: "${TEST_DB_NAME:=nexly_restore_test_$(date -u +%s)_${RANDOM}}"
: "${MIN_EMPRESAS:=1}"
: "${MIN_USUARIOS:=1}"

S3_PREFIX="${S3_PREFIX:-postgres}"
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Nome restrito antes de interpolar identificadores SQL ou instalar o cleanup.
if [[ ! "${TEST_DB_NAME}" =~ ^nexly_restore_test(_[a-z0-9]+)*$ ]] || [ "${#TEST_DB_NAME}" -gt 63 ]; then
  echo '[restore] ERRO: use um identificador seguro iniciado por nexly_restore_test.' >&2
  exit 1
fi
mkdir -p "${BASE_DIR}/backups"
WORK_DIR="$(mktemp -d "${BASE_DIR}/backups/restore-test.XXXXXX")"
RAW_FILE="${WORK_DIR}/restore.dump"
DOWNLOADED_FILE=''
CREATED_DB=0

cleanup() {
  local result=$?
  if [ "${CREATED_DB}" -eq 1 ]; then
    echo "[restore] limpando banco ${TEST_DB_NAME}"
    dropdb --maintenance-db="${RESTORE_ADMIN_URL}" --if-exists --force "${TEST_DB_NAME}" || result=1
  fi
  rm -f -- "${RAW_FILE}" || result=1
  if [ -n "${DOWNLOADED_FILE}" ]; then rm -f -- "${DOWNLOADED_FILE}" || result=1; fi
  rmdir -- "${WORK_DIR}" || result=1
  exit "${result}"
}
trap cleanup EXIT

# Deriva o URL do banco de teste trocando o nome do banco no path.
TEST_URL="$(printf '%s' "${RESTORE_ADMIN_URL}" | sed -E "s#/[^/?]+(\?|$)#/${TEST_DB_NAME}\1#")"
if [ "${TEST_URL}" = "${RESTORE_ADMIN_URL}" ]; then
  echo "[restore] ERRO: não foi possível derivar o URL do banco de teste." >&2
  exit 1
fi

# ── 1. Obtém o dump cifrado ──────────────────────────────────
ENC_FILE="${DUMP_FILE:-}"
if [ -z "${ENC_FILE}" ]; then
  if [ -z "${S3_BUCKET:-}" ]; then
    echo "[restore] ERRO: defina DUMP_FILE ou S3_BUCKET." >&2
    exit 1
  fi
  echo "[restore] buscando o dump mais recente em s3://${S3_BUCKET}/${S3_PREFIX}/"
  AWS_ARGS=()
  [ -n "${S3_ENDPOINT:-}" ] && AWS_ARGS+=(--endpoint-url "${S3_ENDPOINT}")
  NOME="$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" "${AWS_ARGS[@]}" \
    | awk '{print $NF}' | grep -E '^nexly-.*\.dump\.gpg$' | sort | tail -1)"
  if [ -z "${NOME}" ]; then
    echo "[restore] ERRO: nenhum backup encontrado no bucket." >&2
    exit 1
  fi
  if [[ ! "${NOME}" =~ ^nexly-[0-9]{4}-[0-9]{2}-[0-9]{2}\.dump\.gpg$ ]]; then
    echo '[restore] ERRO: nome de backup inesperado.' >&2
    exit 1
  fi
  ENC_FILE="${WORK_DIR}/${NOME}"
  DOWNLOADED_FILE="${ENC_FILE}"
  aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/${NOME}" "${ENC_FILE}" "${AWS_ARGS[@]}"
fi

if [ ! -f "${ENC_FILE}" ]; then
  echo "[restore] ERRO: dump não encontrado em ${ENC_FILE}" >&2
  exit 1
fi

# ── 2. Decifra e restaura ────────────────────────────────────
echo "[restore] decifrando $(basename "${ENC_FILE}")"
printf '%s' "${BKP_PASSPHRASE}" | gpg --batch --yes --quiet --pinentry-mode loopback --decrypt \
  --passphrase-fd 0 \
  --output "${RAW_FILE}" \
  "${ENC_FILE}"

echo "[restore] criando banco descartável ${TEST_DB_NAME}"
# Se o banco já existir, CREATE falha e o cleanup não o remove.
createdb --maintenance-db="${RESTORE_ADMIN_URL}" "${TEST_DB_NAME}"
CREATED_DB=1

echo "[restore] restaurando (pg_restore)"
pg_restore \
  --dbname="${TEST_URL}" \
  --clean --if-exists \
  --no-owner \
  --no-acl \
  --exit-on-error \
  "${RAW_FILE}"

# ── 3. Valida as contagens ───────────────────────────────────
contar() {
  psql "${TEST_URL}" -tAc "SELECT count(*) FROM \"$1\"" 2>/dev/null || echo 0
}

echo "[restore] conferindo as tabelas principais"
TABELAS=(empresas usuarios clientes agendamentos produtos vendas movimentacoes_estoque audit_logs)
for tabela in "${TABELAS[@]}"; do
  printf '  %-24s %s\n' "${tabela}" "$(contar "${tabela}")"
done

EMPRESAS="$(contar empresas)"
USUARIOS="$(contar usuarios)"

FAIL=0
if [ "${EMPRESAS}" -lt "${MIN_EMPRESAS}" ]; then
  echo "[restore] FALHA: empresas=${EMPRESAS} (esperado >= ${MIN_EMPRESAS})" >&2
  FAIL=1
fi
if [ "${USUARIOS}" -lt "${MIN_USUARIOS}" ]; then
  echo "[restore] FALHA: usuarios=${USUARIOS} (esperado >= ${MIN_USUARIOS})" >&2
  FAIL=1
fi

# Confere que o schema das migrations chegou junto com os dados.
MIGRACOES="$(contar _prisma_migrations)"
if [ "${MIGRACOES}" -lt 1 ]; then
  echo "[restore] FALHA: _prisma_migrations vazia." >&2
  FAIL=1
fi

if [ "${FAIL}" -ne 0 ]; then
  echo "[restore] ❌ RESTORE FALHOU — o backup não é confiável." >&2
  exit 1
fi

echo "[restore] ✅ RESTORE OK (${EMPRESAS} empresas, ${USUARIOS} usuários, ${MIGRACOES} migrations)"
