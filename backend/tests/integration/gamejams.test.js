import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/server';
import prisma from '../../src/lib/prisma';

describe('GameJams API Integration', () => {
  let user;
  let jam1;
  let jam2;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        name: 'Jam Creator',
        email: `jam-creator-${Date.now()}@example.com`,
        passwordHash: 'dummyhash',
      },
    });

    jam1 = await prisma.gameJam.create({
      data: {
        title: 'Jam One',
        description: 'First jam',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        creatorId: user.id,
      },
    });

    jam2 = await prisma.gameJam.create({
      data: {
        title: 'Jam Two',
        description: 'Second jam',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        creatorId: user.id,
      },
    });
  });

  afterAll(async () => {
    if (jam1?.id) await prisma.gameJam.delete({ where: { id: jam1.id } }).catch(() => {});
    if (jam2?.id) await prisma.gameJam.delete({ where: { id: jam2.id } }).catch(() => {});
    if (user?.id) await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it('GET /api/gamejams deve listar as Game Jams com status 200', async () => {
    const res = await request(app).get('/api/gamejams');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});
