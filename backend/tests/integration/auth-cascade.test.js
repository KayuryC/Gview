import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/server';
import prisma from '../../src/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'gview-secret-dev';

describe('Auth Account Deletion and Cascade Integration', () => {
  it('DELETE /api/auth/me deve excluir o usuario e suas GameJams associadas em cascata', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Cascade User Tester',
        email: `cascade-user-${Date.now()}@example.com`,
        passwordHash: 'dummyhash',
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const jam = await prisma.gameJam.create({
      data: {
        title: 'Cascade Test Jam',
        description: 'Jam for cascade delete test',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        creatorId: user.id,
      },
    });

    const deleteRes = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({ success: true });

    const checkUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(checkUser).toBeNull();

    const checkJam = await prisma.gameJam.findUnique({ where: { id: jam.id } });
    expect(checkJam).toBeNull();
  });
});
