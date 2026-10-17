import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/server';
import prisma from '../../src/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'gview-secret-dev';

describe('Games API Integration', () => {
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    adminUser = await prisma.user.create({
      data: {
        name: 'Admin Tester',
        email: `admin-${Date.now()}@example.com`,
        passwordHash: 'dummyhash',
        role: 'ADMIN',
      },
    });

    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
  });

  it('GET /api/games should return a list of games or fallback mock', async () => {
    const res = await request(app).get('/api/games');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('DELETE /api/games/:id deve excluir o jogo e seus registros dependentes em cascata', async () => {
    const game = await prisma.game.create({
      data: {
        title: 'Cascade Delete Game',
        slug: `cascade-game-${Date.now()}`,
        shortDescription: 'Game for cascade deletion test',
      },
    });

    await prisma.wishlist.create({
      data: {
        userId: adminUser.id,
        gameId: game.id,
      },
    });

    const deleteRes = await request(app)
      .delete(`/api/games/${game.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(204);

    const checkWishlist = await prisma.wishlist.findUnique({
      where: {
        userId_gameId: {
          userId: adminUser.id,
          gameId: game.id,
        },
      },
    });
    expect(checkWishlist).toBeNull();
  });
});
