# Disaster Recovery — Backup e Restore

> Como recuperar os dados do Nexly e — mais importante — **como provar que o
> restore funciona** antes de precisar dele.

Um backup nunca testado não é um backup. O Nexly mantém duas camadas de
proteção e **testa a recuperação automaticamente toda semana**.

## Camadas de proteção

| Camada | O que faz | Retenção | Onde |
|---|---|---|---|
| PITR (Supabase) | recuperação ponto-a-ponto do banco | 7 dias | Supabase |
| `pg_dump` cifrado | dump lógico diário, independente do provider | 30 dias | bucket S3/R2 |
| Teste de restore | restaura o dump em banco descartável e confere contagens | semanal | GitHub Actions |

O dump diário é a rede de segurança contra o pior cenário (perda da conta ou
do projeto no provider): ele vive **fora** do Supabase e está cifrado em
repouso (LGPD Art. 46 — o dump contém dados pessoais).

## Scripts

| Script | Função |
|---|---|
| `scripts/backup-db.sh` | `pg_dump` → cifra (gpg AES-256) → envia para o bucket |
| `scripts/restore-test.sh` | baixa o dump mais recente → restore em banco de teste → valida → limpa |
| `.github/workflows/backup.yml` | agenda diária + teste semanal + alerta de backup atrasado |

## Configuração (Secrets do GitHub)

| Secret | Para que serve |
|---|---|
| `BACKUP_DATABASE_URL` | conexão de leitura para o `pg_dump` |
| `BKP_PASSPHRASE` | senha de cifragem do dump (**guarde em cofre**; sem ela o dump é inútil) |
| `BACKUP_S3_BUCKET` | bucket de destino |
| `BACKUP_S3_ENDPOINT` | endpoint S3 (ex.: Cloudflare R2) |
| `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY` | credenciais |
| `RESTORE_ADMIN_URL` | conexão ao banco `postgres` (usada para criar/dropar o banco de teste) |

Configure o bucket com **lifecycle de 30 dias** e habilite o **Object Lock**
se quiser proteger contra exclusão acidental (ransomware).

## Uso manual

```bash
# Backup (sem S3_BUCKET o dump fica só em ./backups)
BACKUP_DATABASE_URL="postgresql://..." \
BKP_PASSPHRASE="..." \
S3_BUCKET="nexly-backups" S3_ENDPOINT="https://<id>.r2.cloudflarestorage.com" \
bash scripts/backup-db.sh

# Teste de restore (usa o dump mais recente do bucket)
RESTORE_ADMIN_URL="postgresql://...:5432/postgres" \
BKP_PASSPHRASE="..." \
S3_BUCKET="nexly-backups" \
bash scripts/restore-test.sh

# Teste de restore com um dump local
DUMP_FILE="$PWD/backups/nexly-2026-09-28.dump.gpg" \
RESTORE_ADMIN_URL="postgresql://...:5432/postgres" BKP_PASSPHRASE="..." \
bash scripts/restore-test.sh
```

Rodar manualmente pelo GitHub: **Actions → Backup do banco → Run workflow**
(escolha `backup`, `restore-test` ou `verificar`).

## Recuperando de verdade (incidente)

### 1. PITR — o banco existe, mas os dados foram corrompidos
Use quando o problema é recente (< 7 dias) e você quer voltar a um instante
específico (ex.: 10 minutos antes do `DELETE`).

1. Supabase → **Database → Backups → Point in Time**
2. Escolha o timestamp **anterior** ao incidente
3. Confirme e aguarde a restauração
4. Valide: `GET /health/deep` e uma listagem em `/clientes`

### 2. Restore do dump — o banco/ projeto se perdeu
Use quando o Supabase está inacessível ou você precisa de um banco novo.

```bash
# 1. Decifra
gpg --batch --decrypt --passphrase "$BKP_PASSPHRASE" \
    --output nexly.dump nexly-AAAA-MM-DD.dump.gpg

# 2. Cria o banco novo
psql "$NOVO_ADMIN_URL" -c "CREATE DATABASE nexly"

# 3. Restaura
pg_restore --dbname="$NOVO_DATABASE_URL" --no-owner --no-acl --exit-on-error nexly.dump

# 4. Migrations (se o dump for anterior ao último deploy)
cd apps/api && npx prisma migrate deploy

# 5. Reaplica a RLS (não vem no dump lógico)
psql "$NOVO_DATABASE_URL" -f prisma/seed-rls.sql
```

> **Atenção:** a RLS é aplicada por script, não pelo `pg_dump`. Sem o passo 5 o
> isolamento entre tenants fica **desativado** no banco restaurado.

### 3. Verificação pós-recuperação

```bash
curl -s https://api-production-ca5d.up.railway.app/api/health/deep | jq
curl -s .../api/health/migrations | jq        # ok: true, pending vazio
```

Depois, logue com um usuário real e confirme que a agenda do dia está completa.

## RTO / RPO

| Métrica | Meta | Como é garantido |
|---|---|---|
| RPO (perda máxima de dados) | ≤ 24h | dump diário 03:00 BRT + PITR |
| RTO (tempo até voltar) | ≤ 4h | restore do dump + migrations + RLS documentados acima |

## Alertas

- O workflow dispara `verificar` a cada execução: se o último backup tiver
  **mais de 26h**, o job falha (visível na aba Actions).
- Se o teste semanal de restore falhar, **uma issue é aberta automaticamente**
  com o checklist de investigação.
- Enquanto houver issue de restore aberta, trate os backups como **não
  confiáveis**.

## Teste local do pipeline

O job `backup-scripts` do CI sobe um Postgres, roda migrations + seed, faz o
backup, **confere que o arquivo está cifrado** (o magic `PGDMP` não pode
aparecer), restaura em banco descartável, valida as contagens e confere que o
banco temporário foi removido. Roda a cada PR — o caminho de recuperação é
exercitado continuamente.