/* global describe test expect beforeAll */
const request = require('supertest');
const express = require('express');
const app = express();

describe('API endpoints', () => {
  test('GET /sitemap.json returns an object', async () => {
    const res = await request(app).get('/sitemap.json').set('User-Agent', 'Mozilla/5.0');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('length');
  }, 10000);

  test('GET /sitemap.xml returns XML content', async () => {
    const res = await request(app).get('/sitemap.xml').set('User-Agent', 'Mozilla/5.0');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    expect(res.text).toMatch(/<urlset/);
  }, 10000);

  test('GET /sitemap.txt returns plain text', async () => {
    const res = await request(app).get('/sitemap.txt').set('User-Agent', 'Mozilla/5.0');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text.split('\n').length).toBeGreaterThan(0);
  }, 10000);

  test('GET /ip returns an HTML page', async () => {
    const res = await request(app).get('/ip').set('User-Agent', 'Mozilla/5.0');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('<script>');
  }, 10000);

  test('Non-existent route returns 404', async () => {
    const res = await request(app).get('/non-existent-route-12345');
    expect(res.statusCode).toBe(404);
  });
});
