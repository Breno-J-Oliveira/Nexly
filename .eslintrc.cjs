module.exports = {
  root: true,
  ignorePatterns: ['node_modules', 'dist', '.next', '.turbo', 'coverage'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Card 06 (S0) — previne SQL Injection: proíbe as variantes "Unsafe" do
    // Prisma, que aceitam string concatenada. Use $queryRaw/$executeRaw com
    // Prisma.sql`...` (template parametrizado).
    'no-restricted-syntax': [
      'error',
      {
        selector: "MemberExpression[property.name='$queryRawUnsafe']",
        message:
          'Use $queryRaw com Prisma.sql`...` (parametrizado). $queryRawUnsafe aceita SQL concatenado e permite SQL Injection.',
      },
      {
        selector: "MemberExpression[property.name='$executeRawUnsafe']",
        message:
          'Use $executeRaw com Prisma.sql`...` (parametrizado). $executeRawUnsafe aceita SQL concatenado e permite SQL Injection.',
      },
    ],
  },
};
