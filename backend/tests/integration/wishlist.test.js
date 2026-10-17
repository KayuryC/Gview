import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/server';
import prisma from '../../src/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'gview-secret-dev';

describe('Wishlist API Integration', () => {
  let testUser;
  let testGame;
  let token;

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        name: 'Wishlist Tester',
        email: `wishlist-${Date.now()}@example.com`,
        passwordHash: 'dummyhash',
      },
    });

    testGame = await prisma.game.create({
      data: {
        title: 'Wishlist Test Game',
        slug: `wishlist-game-${Date.now()}`,
        shortDescription: 'Game for wishlist integration test',
      },
    });

    token = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (testGame?.id) {
      await prisma.game.delete({ where: { id: testGame.id } }).catch(() => {});
    }
    if (testUser?.id) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  it('GET /api/wishlist/check/:gameId deve retornar 401 para requisição sem token', async () => {
    const res = await request(app).get(`/api/wishlist/check/${testGame.id}`);
    expect(res.status).toBe(401);
  });

  it('GET /api/wishlist/check/:gameId deve retornar inWishlist: false quando o jogo não está na lista', async () => {
    const res = await request(app)
      .get(`/api/wishlist/check/${testGame.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ inWishlist: false });
  });

  it('GET /api/wishlist/check/:gameId deve retornar inWishlist: true após adicionar o jogo', async () => {
    const postRes = await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: testGame.id });

    expect(postRes.status).toBe(201);

    const checkRes = await request(app)
      .get(`/api/wishlist/check/${testGame.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body).toEqual({ inWishlist: true });
  });

  it('GET /api/wishlist/check/:gameId deve retornar inWishlist: false após remover o jogo', async () => {
    const delRes = await request(app)
      .delete(`/api/wishlist/${testGame.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(204);

    const checkRes = await request(app)
      .get(`/api/wishlist/check/${testGame.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body).toEqual({ inWishlist: false });
  });

  it('GET /api/wishlist/:userId deve listar a wishlist ordenada por createdAt desc', async () => {
    await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: testGame.id });

    const res = await request(app)
      .get(`/api/wishlist/${testUser.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].gameId).toBe(testGame.id);

    await request(app)
      .delete(`/api/wishlist/${testGame.id}`)
      .set('Authorization', `Bearer ${token}`);
  });
});
