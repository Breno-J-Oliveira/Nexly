const [major, minor, patch] = process.versions.node.split('.').map(Number);

if (major !== 24 || minor < 22 || (minor === 22 && patch < 1)) {
  console.error(
    `Node.js ${process.versions.node} não suportado. Use Node.js >=24.22.1 <25 (correções de segurança de outubro de 2026).`,
  );
  process.exit(1);
}

console.log(`Node.js ${process.versions.node}: versão de segurança validada.`);
