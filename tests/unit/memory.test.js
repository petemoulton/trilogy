const PostgreSQLMemory = require('../../server/database');

describe('PostgreSQL Memory System', () => {
  let memory;

  beforeAll(async () => {
    // Use test database configuration
    memory = new PostgreSQLMemory({
      host: 'localhost',
      port: 5432,
      database: 'trilogy_test',
      user: 'trilogy',
      password: 'trilogy123'
    });
  });

  afterAll(async () => {
    if (memory) {
      await memory.close();
    }
  });

  describe('Connection', () => {
    test('should connect to PostgreSQL', async () => {
      const connected = await memory.connect();
      expect(connected).toBe(true);
      expect(memory.isConnected).toBe(true);
    });

    test('should handle connection failure gracefully', async () => {
      const badMemory = new PostgreSQLMemory({
        host: 'nonexistent-host',
        port: 5432,
        database: 'trilogy_test',
        user: 'trilogy',
        password: 'trilogy123'
      });

      const connected = await badMemory.connect();
      expect(connected).toBe(false);
      expect(badMemory.isConnected).toBe(false);
    });
  });

  describe('Memory Operations', () => {
    beforeEach(async () => {
      if (!memory.isConnected) {
        await memory.connect();
      }
    });

    test('should write and read string data', async () => {
      const testData = 'Hello, World!';
      const namespace = 'test';
      const key = 'string-test';

      await memory.write(namespace, key, testData);
      const result = await memory.read(namespace, key);

      expect(result).toBe(testData);
    });

    test('should write and read JSON data', async () => {
      const testData = { message: 'Hello, World!', number: 42, array: [1, 2, 3] };
      const namespace = 'test';
      const key = 'json-test';

      await memory.write(namespace, key, testData);
      const result = await memory.read(namespace, key);

      expect(result).toEqual(testData);
    });

    test('should return null for non-existent keys', async () => {
      const result = await memory.read('test', 'non-existent-key');
      expect(result).toBeNull();
    });

    test('should list keys by namespace', async () => {
      const namespace = 'list-test';
      await memory.write(namespace, 'key1', 'value1');
      await memory.write(namespace, 'key2', 'value2');
      await memory.write(namespace, 'key3', 'value3');

      const keys = await memory.list(namespace);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys.length).toBeGreaterThanOrEqual(3);
    });

    test('should delete data', async () => {
      const namespace = 'delete-test';
      const key = 'deletable-key';
      
      await memory.write(namespace, key, 'delete me');
      expect(await memory.read(namespace, key)).toBe('delete me');
      
      const deleted = await memory.delete(namespace, key);
      expect(deleted).toBe(true);
      expect(await memory.read(namespace, key)).toBeNull();
    });
  });

  describe('Locking Mechanism', () => {
    beforeEach(async () => {
      if (!memory.isConnected) {
        await memory.connect();
      }
    });

    test('should acquire and release locks', async () => {
      const namespace = 'lock-test';
      const key = 'lockable-key';

      const acquired = await memory.acquireLock(namespace, key, 5000);
      expect(acquired).toBe(true);

      // Should not be able to acquire same lock again
      const acquiredAgain = await memory.acquireLock(namespace, key, 5000);
      expect(acquiredAgain).toBe(false);

      await memory.releaseLock(namespace, key);

      // Should be able to acquire after release
      const acquiredAfterRelease = await memory.acquireLock(namespace, key, 5000);
      expect(acquiredAfterRelease).toBe(true);
      
      await memory.releaseLock(namespace, key);
    });

    test('should handle lock expiration', async () => {
      const namespace = 'lock-test';
      const key = 'expiring-lock';

      const acquired = await memory.acquireLock(namespace, key, 100); // 100ms
      expect(acquired).toBe(true);

      // Wait for lock to expire
      await testUtils.delay(150);

      // Should be able to acquire expired lock
      const acquiredAfterExpiry = await memory.acquireLock(namespace, key, 5000);
      expect(acquiredAfterExpiry).toBe(true);
      
      await memory.releaseLock(namespace, key);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      if (!memory.isConnected) {
        await memory.connect();
      }
    });

    test('should return memory statistics', async () => {
      // Add some test data
      await memory.write('stats-test', 'key1', 'value1');
      await memory.write('stats-test', 'key2', { test: true });

      const stats = await memory.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalKeys).toBe('number');
      expect(Array.isArray(stats.keysByNamespace)).toBe(true);
      expect(typeof stats.activeLocks).toBe('number');
    });
  });
});