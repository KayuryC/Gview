import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/server'; // We need to export the app from server.js

describe('Games API Integration', () => {
  it('GET /api/games should return a list of games or fallback mock', async () => {
    const res = await request(app).get('/api/games');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
