const request = require('supertest');
const { app } = require('../../server/index');

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    test('GET /health should return system status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('memoryBackend');
      expect(response.body).toHaveProperty('memory', 'active');
    });
  });

  describe('Memory API', () => {
    const testNamespace = 'test-integration';
    const testKey = 'test-key';
    const testData = { message: 'Hello Integration Test', timestamp: Date.now() };

    test('POST /memory/:namespace/:key should store data', async () => {
      const response = await request(app)
        .post(`/memory/${testNamespace}/${testKey}`)
        .send({ data: testData })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('GET /memory/:namespace/:key should retrieve stored data', async () => {
      // First store the data
      await request(app)
        .post(`/memory/${testNamespace}/${testKey}`)
        .send({ data: testData })
        .expect(200);

      // Then retrieve it
      const response = await request(app)
        .get(`/memory/${testNamespace}/${testKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual(testData);
    });

    test('GET /memory/:namespace/:key should return null for non-existent keys', async () => {
      const response = await request(app)
        .get(`/memory/${testNamespace}/non-existent-key`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeNull();
    });

    test('should handle string data', async () => {
      const stringData = 'This is a test string';
      const stringKey = 'string-test';

      // Store string data
      await request(app)
        .post(`/memory/${testNamespace}/${stringKey}`)
        .send({ data: stringData })
        .expect(200);

      // Retrieve string data
      const response = await request(app)
        .get(`/memory/${testNamespace}/${stringKey}`)
        .expect(200);

      expect(response.body.data).toBe(stringData);
    });
  });

  describe('Agent API', () => {
    test('POST /agents/trigger/:agent should trigger agent processing', async () => {
      const testInput = {
        type: 'test_input',
        data: 'Integration test data'
      };

      const response = await request(app)
        .post('/agents/trigger/sonnet')
        .send({ input: testInput })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sessionId');
      expect(typeof response.body.sessionId).toBe('string');
    });

    test('should handle invalid agent names', async () => {
      const testInput = {
        type: 'test_input',
        data: 'Test data'
      };

      const response = await request(app)
        .post('/agents/trigger/invalid-agent')
        .send({ input: testInput })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sessionId');
    });

    test('should validate request body', async () => {
      const response = await request(app)
        .post('/agents/trigger/sonnet')
        .send({}) // Empty body
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      await request(app)
        .get('/non-existent-route')
        .expect(404);
    });

    test('should handle malformed JSON in memory API', async () => {
      const response = await request(app)
        .post('/memory/test/malformed')
        .send('{ invalid json }')
        .expect(400);
    });
  });

  describe('CORS', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('should handle OPTIONS requests', async () => {
      await request(app)
        .options('/health')
        .expect(200);
    });
  });
});