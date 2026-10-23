import express from 'express';
import request from 'supertest';
import { registerRequestBodyParsers } from './request-body-parsers';

describe('Entrada HTTP sem descompressão', () => {
  const app = express();
  registerRequestBodyParsers(app);
  app.post('/api/example', (req, res) => res.json(req.body));
  app.post('/api/gestao/importacao', (req, res) => res.json({ length: req.body.text.length }));

  it.each(['br', 'gzip', 'deflate'])(
    'rejeita JSON, formulário e importação com Content-Encoding %s',
    async (encoding) => {
      for (const [path, contentType] of [
        ['/api/example', 'application/json'],
        ['/api/example', 'application/x-www-form-urlencoded'],
        ['/api/gestao/importacao', 'application/json'],
      ] as const) {
        await request(app)
          .post(path)
          .set('Content-Type', contentType)
          .set('Content-Encoding', encoding)
          .send('untrusted compressed data')
          .expect(415);
      }
    },
  );

  it('preserva JSON e formulário sem compressão', async () => {
    await request(app).post('/api/example').send({ nome: 'Nexly' }).expect(200, { nome: 'Nexly' });
    await request(app)
      .post('/api/example')
      .type('form')
      .send({ nome: 'Nexly' })
      .expect(200, { nome: 'Nexly' });
  });

  it('preserva o limite maior da importação e o teto de 100 KB das demais rotas', async () => {
    const text = 'a'.repeat(120_000);
    await request(app)
      .post('/api/gestao/importacao')
      .send({ text })
      .expect(200, { length: text.length });
    await request(app).post('/api/example').send({ text }).expect(413);
  });
});
