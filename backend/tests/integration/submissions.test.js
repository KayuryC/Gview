import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/server';
import prisma from '../../src/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'gview-secret-dev';

describe('Submissions API Integration', () => {
  let adminUser;
  let regularUser;
  let adminToken;
  let regularToken;
  let sub1;
  let sub2;

  beforeAll(async () => {
    adminUser = await prisma.user.create({
      data: {
        name: 'Submission Admin',
        email: `sub-admin-${Date.now()}@example.com`,
        passwordHash: 'dummyhash',
        role: 'ADMIN',
      },
    });

    regularUser = await prisma.user.create({
      data: {
        name: 'Regular Player',
        email: `player-${Date.now()}@example.com`,
        passwordHash: 'dummyhash',
        role: 'PLAYER',
      },
    });

    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    regularToken = jwt.sign(
      { id: regularUser.id, email: regularUser.email, role: regularUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    sub1 = await prisma.submission.create({
      data: {
        gameTitle: 'Submission Game 1',
        description: 'First submission desc',
        contactEmail: 'sub1@example.com',
      },
    });

    sub2 = await prisma.submission.create({
      data: {
        gameTitle: 'Submission Game 2',
        description: 'Second submission desc',
        contactEmail: 'sub2@example.com',
      },
    });
  });

  afterAll(async () => {
    if (sub1?.id) await prisma.submission.delete({ where: { id: sub1.id } }).catch(() => {});
    if (sub2?.id) await prisma.submission.delete({ where: { id: sub2.id } }).catch(() => {});
    if (adminUser?.id) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    if (regularUser?.id) await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
  });

  it('GET /api/submissions deve retornar 401 sem autenticacao', async () => {
    const res = await request(app).get('/api/submissions');
    expect(res.status).toBe(401);
  });

  it('GET /api/submissions deve retornar 403 para usuario nao admin', async () => {
    const res = await request(app)
      .get('/api/submissions')
      .set('Authorization', `Bearer ${regularToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/submissions deve retornar 200 e lista ordenada para admin', async () => {
    const res = await request(app)
      .get('/api/submissions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});
