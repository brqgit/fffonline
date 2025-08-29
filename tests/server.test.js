const request = require('supertest');
const { app } = require('../server');

describe('server', () => {
  test('GET / responds with 200', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });
});
