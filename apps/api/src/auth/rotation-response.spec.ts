import { RotationResponse } from './rotation-response';

describe('Resposta cifrada da rotação de sessão', () => {
  const cipher = new RotationResponse();
  const rotatedAt = new Date('2026-10-20T12:00:00.000Z');
  const token = 'a'.repeat(96);

  it('recupera o token sem armazená-lo em texto e usa um IV novo a cada resposta', () => {
    const sealed = cipher.seal(token, 'session-a', 'parent-a', rotatedAt);
    expect(sealed).not.toContain(token);
    expect(cipher.open(sealed, 'session-a', 'parent-a', rotatedAt)).toBe(token);
    expect(cipher.seal(token, 'session-a', 'parent-a', rotatedAt)).not.toBe(sealed);
  });

  it.each([
    ['session-b', 'parent-a', rotatedAt],
    ['session-a', 'parent-b', rotatedAt],
    ['session-a', 'parent-a', new Date(rotatedAt.getTime() + 1)],
  ] as const)('não recupera resposta fora do contexto vinculado %s %s', (session, parent, date) => {
    const sealed = cipher.seal(token, 'session-a', 'parent-a', rotatedAt);
    expect(() => cipher.open(sealed, session, parent, date)).toThrow();
  });

  it('rejeita conteúdo adulterado, texto simples e formatos inválidos', () => {
    const parts = cipher.seal(token, 'session-a', 'parent-a', rotatedAt).split('.');
    parts[3] = (parts[3]!.startsWith('A') ? 'B' : 'A') + parts[3]!.slice(1);
    for (const value of [parts.join('.'), token, '', 'v1.AA.AA.AA', 'x'.repeat(513)]) {
      expect(() => cipher.open(value, 'session-a', 'parent-a', rotatedAt)).toThrow();
    }
  });

  it.each([4, 12, 15])('rejeita tag válida truncada para %i bytes', (length) => {
    const parts = cipher.seal(token, 'session-a', 'parent-a', rotatedAt).split('.');
    parts[2] = Buffer.from(parts[2]!, 'base64url').subarray(0, length).toString('base64url');
    expect(() => cipher.open(parts.join('.'), 'session-a', 'parent-a', rotatedAt)).toThrow();
  });
});
