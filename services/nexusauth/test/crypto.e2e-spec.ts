import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { decrypt, encrypt } from '../src/common/utils/crypto.util';

describe('Authenticated encryption', () => {
  let previousKey: string | undefined;
  beforeEach(() => {
    previousKey = process.env.ENCRYPTION_KEY;
    // Fixture only. Never consume or print a configured application key.
    process.env.ENCRYPTION_KEY = 'ab'.repeat(32);
  });
  afterEach(() => {
    if (previousKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = previousKey;
  });

  it('round-trips Unicode using a 16-byte authentication tag', () => {
    const plaintext = 'Dados de teste: ação 🔐';
    const encrypted = encrypt(plaintext);
    expect(encrypted.split(':')[1]).toHaveLength(32);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it.each([4, 8, 12, 13, 14, 15])(
    'rejects an otherwise valid tag truncated to %i bytes',
    (length) => {
      const [iv, tag, data] = encrypt('fixture').split(':');
      expect(() => decrypt(`${iv}:${tag.slice(0, length * 2)}:${data}`)).toThrow(
        'Invalid auth tag format',
      );
    },
  );

  it.each(['not-hex', 'a', ''])('rejects malformed encrypted data %j', (data) => {
    const [iv, tag] = encrypt('fixture').split(':');
    expect(() => decrypt(`${iv}:${tag}:${data}`)).toThrow();
  });

  it('rejects tampering without revealing cryptographic errors', () => {
    const [iv, tag, data] = encrypt('fixture').split(':');
    const changed = `${data.startsWith('00') ? '01' : '00'}${data.slice(2)}`;
    expect(() => decrypt(`${iv}:${tag}:${changed}`)).toThrow(
      'Decryption failed: invalid ciphertext or tampered data',
    );
  });
});
