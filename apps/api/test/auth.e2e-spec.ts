import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, resetDatabase } from './test-app';

const alice = { username: 'alice', password: 'correct-horse' };

// Pulls the auth cookie out of a response's Set-Cookie header.
function authCookie(res: request.Response): string {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const cookie = cookies.find((c) => c.startsWith('access_token='));
  if (!cookie) {
    throw new Error('No access_token cookie was set');
  }
  return cookie;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  describe('POST /api/auth/register', () => {
    it('creates the user, logs them in, and never returns the hash', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send(alice)
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        username: 'alice',
        createdAt: expect.any(String),
      });
      expect(JSON.stringify(res.body)).not.toContain('password');

      const cookie = authCookie(res);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
    });

    it('normalizes the username to lowercase', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send({ username: '  Alice ', password: alice.password })
        .expect(201);
      expect(res.body.username).toBe('alice');
    });

    it('rejects a duplicate username, ignoring case, with 409', async () => {
      await api().post('/api/auth/register').send(alice).expect(201);
      const res = await api()
        .post('/api/auth/register')
        .send({ username: 'ALICE', password: 'another-password' })
        .expect(409);
      expect(res.body.message).toBe('Username is already taken');
    });

    it.each([
      ['a missing body', {}],
      ['a short username', { username: 'al', password: alice.password }],
      [
        'a username with spaces',
        { username: 'al ice', password: alice.password },
      ],
      ['a short password', { username: 'alice', password: 'short' }],
      ['a non-string password', { username: 'alice', password: 12345678 }],
      ['an unknown field', { ...alice, isAdmin: true }],
    ])('rejects %s with 400', async (_label, body) => {
      await api().post('/api/auth/register').send(body).expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await api().post('/api/auth/register').send(alice).expect(201);
    });

    it('logs in with the right password and sets the cookie', async () => {
      const res = await api().post('/api/auth/login').send(alice).expect(200);
      expect(res.body.username).toBe('alice');
      authCookie(res);
    });

    it('accepts the username in any case', async () => {
      await api()
        .post('/api/auth/login')
        .send({ username: 'ALICE', password: alice.password })
        .expect(200);
    });

    it('gives the same 401 for a wrong password and an unknown user', async () => {
      const wrongPassword = await api()
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'wrong-password' })
        .expect(401);
      const unknownUser = await api()
        .post('/api/auth/login')
        .send({ username: 'nobody', password: alice.password })
        .expect(401);

      expect(wrongPassword.body.message).toBe('Invalid username or password');
      expect(unknownUser.body.message).toBe(wrongPassword.body.message);
      expect(wrongPassword.headers['set-cookie']).toBeUndefined();
    });

    it('rejects a malformed body with 400', async () => {
      await api()
        .post('/api/auth/login')
        .send({ username: 'alice' })
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without a cookie', async () => {
      await api().get('/api/auth/me').expect(401);
    });

    it('returns 401 for a tampered token', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send(alice)
        .expect(201);
      const token = authCookie(res).split(';')[0].replace('access_token=', '');
      // Swap in a payload claiming to be a different user, keeping the
      // original signature. The signature no longer matches, so it's rejected.
      const [header, , signature] = token.split('.');
      const forgedPayload = Buffer.from(
        JSON.stringify({ sub: 'someone-else' }),
      ).toString('base64url');
      const forged = `${header}.${forgedPayload}.${signature}`;
      await api()
        .get('/api/auth/me')
        .set('Cookie', `access_token=${forged}`)
        .expect(401);
    });

    it('returns 401 when the token belongs to a deleted user', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send(alice)
        .expect(201);
      const cookie = authCookie(res);
      await resetDatabase(app);
      await api().get('/api/auth/me').set('Cookie', cookie).expect(401);
    });

    it('returns the logged-in user', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/api/auth/register').send(alice).expect(201);
      const res = await agent.get('/api/auth/me').expect(200);
      expect(res.body.username).toBe('alice');
      expect(JSON.stringify(res.body)).not.toContain('password');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the cookie so the next request is logged out', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/api/auth/register').send(alice).expect(201);
      await agent.get('/api/auth/me').expect(200);

      const res = await agent.post('/api/auth/logout').expect(204);
      expect(authCookie(res)).toContain('Expires=Thu, 01 Jan 1970');

      await agent.get('/api/auth/me').expect(401);
    });
  });
});
