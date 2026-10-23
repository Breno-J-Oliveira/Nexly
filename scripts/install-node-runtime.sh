#!/usr/bin/env bash
set -euo pipefail

# Nixpacks selects a major line from its Nix archive, not an exact patched release.
# Install the official binary and verify a pinned checksum before npm or app code runs.
NODE_RELEASE=24.22.1
case "$(uname -m)" in
  x86_64) NODE_ARCH=x64; NODE_SHA256=6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6 ;;
  aarch64|arm64) NODE_ARCH=arm64; NODE_SHA256=dbabf7a1cbf947e6059ffad2c27b80041db97dea1e553b62afdee7f13fca336e ;;
  *) echo 'Unsupported Node.js runtime architecture' >&2; exit 1 ;;
esac

NODE_ARCHIVE="node-v${NODE_RELEASE}-linux-${NODE_ARCH}.tar.xz"
NODE_TEMP_DIR="$(mktemp -d)"
trap 'rm -rf -- "$NODE_TEMP_DIR"' EXIT
curl --fail --show-error --silent --location --proto '=https' --tlsv1.2 \
  "https://nodejs.org/dist/v${NODE_RELEASE}/${NODE_ARCHIVE}" \
  --output "${NODE_TEMP_DIR}/${NODE_ARCHIVE}"
printf '%s  %s\n' "$NODE_SHA256" "${NODE_TEMP_DIR}/${NODE_ARCHIVE}" | sha256sum --check --status
mkdir -p /opt/nexly-node
tar -xJf "${NODE_TEMP_DIR}/${NODE_ARCHIVE}" -C /opt/nexly-node --strip-components=1
/opt/nexly-node/bin/node scripts/check-node-version.cjs
