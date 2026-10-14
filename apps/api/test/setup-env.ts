// Testes unitários usam mocks; não dependem de credenciais ou serviços reais.
import 'reflect-metadata';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://unit:unit@localhost:5432/nexly_unit';
process.env.REDIS_URL ??= 'redis://localhost:6379';
