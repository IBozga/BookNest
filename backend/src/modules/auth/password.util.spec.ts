import { hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  it('hashes to a salted saltHex:hashHex value that never contains the password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    const [salt, key] = hash.split(':');

    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(key).toMatch(/^[0-9a-f]{128}$/);
    expect(hash).not.toContain('correct horse');
  });

  it('produces a different hash for the same password each time (random salt)', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
  });

  it('verifies the correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('s3cret-Pass!');
    await expect(verifyPassword('s3cret-Pass!', hash)).resolves.toBe(true);
    await expect(verifyPassword('s3cret-Pass', hash)).resolves.toBe(false);
  });

  it('rejects malformed stored hashes without throwing', async () => {
    await expect(verifyPassword('x', '')).resolves.toBe(false);
    await expect(verifyPassword('x', 'no-colon')).resolves.toBe(false);
    await expect(verifyPassword('x', 'abcd:1234')).resolves.toBe(false);
  });
});
