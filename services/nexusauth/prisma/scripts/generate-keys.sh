#!/bin/bash
# Gera par de chaves RSA para JWT RS256
# Uso: ./prisma/scripts/generate-keys.sh

set -e

KEYS_DIR="./keys"
mkdir -p "$KEYS_DIR"

echo "Generating RSA key pair for JWT RS256..."

openssl genrsa -out "$KEYS_DIR/private.pem" 2048
openssl rsa -in "$KEYS_DIR/private.pem" -pubout -out "$KEYS_DIR/public.pem"

echo "✅ Keys generated:"
echo "   Private: $KEYS_DIR/private.pem"
echo "   Public:  $KEYS_DIR/public.pem"
echo ""
echo "⚠️  Add keys/ to .gitignore (already included). Never commit these files."
