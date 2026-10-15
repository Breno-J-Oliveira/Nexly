#!/usr/bin/env bash
# Executar somente com o Postgres descartável do CI ou um banco local de testes.
set -euo pipefail
: "${RESTORE_ADMIN_URL:?defina a conexão administrativa de teste}"
: "${BACKUP_DATABASE_URL:?defina o banco de teste}"
: "${BKP_PASSPHRASE:?defina a senha de teste}"
: "${DUMP_FILE:?defina um backup cifrado de teste}"
for connection in "$RESTORE_ADMIN_URL" "$BACKUP_DATABASE_URL"; do
  if [[ ! "$connection" =~ ^postgres(ql)?://[^/]*@(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?/ ]]; then
    echo 'FALHA: salvaguardas só podem ser testadas contra Postgres local.' >&2; exit 1
  fi
done
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SENTINEL="nexly_restore_test_existing_${RANDOM}"
WORK="$(mktemp -d)"
CREATED=0
cleanup() {
  local result=$?
  if [ "$CREATED" -eq 1 ]; then dropdb --maintenance-db="$RESTORE_ADMIN_URL" --if-exists --force "$SENTINEL" || result=1; fi
  rm -f -- "$WORK/gpg" "$WORK/guard.log" "$WORK/collision.log" "$WORK/encryption.log"
  rmdir -- "$WORK" || result=1
  exit "$result"
}
trap cleanup EXIT

if TEST_DB_NAME='nexly_restore_test;SELECT 1' bash scripts/restore-test.sh >"$WORK/guard.log" 2>&1; then
  echo 'FALHA: identificador SQL inseguro aceito' >&2; exit 1
fi
createdb --maintenance-db="$RESTORE_ADMIN_URL" "$SENTINEL"
CREATED=1
if TEST_DB_NAME="$SENTINEL" bash scripts/restore-test.sh >"$WORK/collision.log" 2>&1; then
  echo 'FALHA: restore aceitou um banco existente' >&2; exit 1
fi
EXISTS="$(psql "$RESTORE_ADMIN_URL" -tAc "SELECT count(*) FROM pg_database WHERE datname='$SENTINEL'")"
if [ "$EXISTS" != 1 ]; then echo 'FALHA: banco preexistente foi removido' >&2; exit 1; fi

original_checksum="$(sha256sum "$DUMP_FILE" | cut -d ' ' -f 1)"
printf '#!/usr/bin/env bash\nexit 17\n' > "$WORK/gpg"
chmod +x "$WORK/gpg"
if PATH="$WORK:$PATH" bash scripts/backup-db.sh >"$WORK/encryption.log" 2>&1; then
  echo 'FALHA: cifragem com erro considerada sucesso' >&2; exit 1
fi
if [ "$(sha256sum "$DUMP_FILE" | cut -d ' ' -f 1)" != "$original_checksum" ]; then
  echo 'FALHA: backup válido sobrescrito após falha de cifragem' >&2; exit 1
fi
if [ -n "$(find backups -maxdepth 1 -type d \( -name '.backup.*' -o -name 'restore-test.*' \) -print -quit)" ]; then
  echo 'FALHA: arquivos temporários não foram removidos' >&2; exit 1
fi
echo 'PASS: identificadores seguros, banco existente preservado, plaintext removido e backup válido preservado.'
