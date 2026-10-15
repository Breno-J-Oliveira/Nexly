module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.m?js$': [
      'babel-jest',
      {
        plugins: [
          '@babel/plugin-transform-dynamic-import',
          '@babel/plugin-transform-modules-commonjs',
          'babel-plugin-transform-import-meta',
        ],
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!@nestjs/)'],
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  moduleNameMapper: {
    '^@nexly/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
