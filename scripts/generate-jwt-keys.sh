#!/usr/bin/env bash
# Gera o par de chaves RSA (RS256) do Nexly e imprime as versões base64,
# prontas para colar no Railway (JWT_PRIVATE_KEY / JWT_PUBLIC_KEY).
#
# Uso:
#   bash scripts/generate-jwt-keys.sh [diretório-de-saída]
#
# Por padrão grava private.pem/public.pem na pasta scripts/.

set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-${BASE_DIR}}"
PRIVATE_PEM="${OUT_DIR}/private.pem"
PUBLIC_PEM="${OUT_DIR}/public.pem"

echo "Gerando chaves RSA 2048 em: ${OUT_DIR}"
openssl genpkey -algorithm RSA -out "${PRIVATE_PEM}" -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in "${PRIVATE_PEM}" -out "${PUBLIC_PEM}"

echo ""
echo "===== JWT_PRIVATE_KEY (base64) ====="
base64 -w0 "${PRIVATE_PEM}"
echo ""
echo ""
echo "===== JWT_PUBLIC_KEY (base64) ====="
base64 -w0 "${PUBLIC_PEM}"
echo ""
echo ""
echo "⚠️  Apague ${PRIVATE_PEM} e ${PUBLIC_PEM} após copiar os valores."
echo "   (o código também aceita PEM cru, mas base64 é mais seguro em env de 1 linha)"
