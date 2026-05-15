/**
 * Unit Tests for API Service Utility
 * Tests request/response interceptors, error handling, retry logic,
 * authentication token injection, and request/response logging
 */

const apiService = require('./apiService');
const ApiError = require('./ApiError');

describe('API Service Utility', () => {
  // Mock request and response objects
  const createMockReq = (overrides = {}) => ({
    method: 'GET',
    path: '/api/test',
    headers: {},
    query: {},
    body: {},
    user: { id: 'user123', role: 'trainer' },
    ip: '127.0.0.1',
    startTime: Date.now(),
    ...overrides,
  });

  const createMockRes = (overrides = {}) => ({
    statusCode: 200,
    json: jest.fn(function (data) {
      return this;
    }),
    ...overrides,
  });

  describe('API_CONFIG', () => {
    test('should have correct default configuration', () => {
      expect(apiService.API_CONFIG).toHaveProperty('MAX_RETRIES', 3);
      expect(apiService.API_CONFIG).toHaveProperty('RETRY_DELAY', 1000);
      expect(apiService.API_CONFIG).toHaveProperty('REQUEST_TIMEOUT', 30000);
      expect(apiService.API_CONFIG).toHaveProperty('ENABLE_LOGGING');
    });
  });

  describe('APILogger', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      console.log.mockRestore();
      console.error.mockRestore();
    });

    test('logRequest should log request details', () => {
      const req = createMockReq();
      apiService.APILogger.logRequest(req, '/api/test');

      if (apiService.API_CONFIG.ENABLE_LOGGING) {
        expect(console.log).toHaveBeenCalledWith(
          '[API Request]',
          expect.stringContaining('GET')
        );
      }
    });

    test('logResponse should log response details', () => {
      const req = createMockReq();
      const res = createMockRes();
      const data = { success: true, message: 'Success' };

      apiService.APILogger.logResponse(req, 200, data, '/api/test', 100);

      if (apiService.API_CONFIG.ENABLE_LOGGING) {
        expect(console.log).toHaveBeenCalledWith(
          '[API Response]',
          expect.stringContaining('200')
        );
      }
    });

    test('logError should log error details', () => {
      const req = createMockReq();
      const error = new ApiError(500, 'Server Error');

      apiService.APILogger.logError(req, error, '/api/test', 100);

      if (apiService.API_CONFIG.ENABLE_LOGGING) {
        expect(console.error).toHaveBeenCalledWith(
          '[API Error]',
          expect.stringContaining('500')
        );
      }
    });

    test('sanitizeBody should redact sensitive fields', () => {
      const body = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
        token: 'abc123',
      };

      const sanitized = apiService.APILogger.sanitizeBody(body);

      expect(sanitized.username).toBe('john');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.password).toBe('***REDACTED***');
      expect(sanitized.token).toBe('***REDACTED***');
    });

    test('sanitizeBody should handle null body', () => {
      const result = apiService.APILogger.sanitizeBody(null);
      expect(result).toBeNull();
    });
  });

  describe('requestInterceptor', () => {
    test('should add user information to request', () => {
      const req = createMockReq();
      const result = apiService.requestInterceptor(req);

      expect(result.userId).toBe('user123');
      expect(result.userRole).toBe('trainer');
    });

    test('should add startTime to request', () => {
      const req = createMockReq();
      const result = apiService.requestInterceptor(req);

      expect(result.startTime).toBeDefined();
      expect(typeof result.startTime).toBe('number');
    });

    test('should handle request without user', () => {
      const req = createMockReq({ user: null });
      const result = apiService.requestInterceptor(req);

      expect(result.userId).toBeUndefined();
      expect(result.userRole).toBeUndefined();
    });
  });

  describe('responseInterceptor', () => {
    test('should add success flag to response', () => {
      const req = createMockReq();
      const res = createMockRes({ statusCode: 200 });
      const data = { message: 'Success' };

      const result = apiService.responseInterceptor(req, res, data);

      expect(result.success).toBe(true);
    });

    test('should mark failed responses as unsuccessful', () => {
      const req = createMockReq();
      const res = createMockRes({ statusCode: 500 });
      const data = { message: 'Error' };

      const result = apiService.responseInterceptor(req, res, data);

      expect(result.success).toBe(false);
    });

    test('should add default message for failed responses', () => {
      const req = createMockReq();
      const res = createMockRes({ statusCode: 500 });
      const data = { success: false };

      const result = apiService.responseInterceptor(req, res, data);

      expect(result.message).toBe('An error occurred');
    });
  });

  describe('isRetryableError', () => {
    test('should return true for connection errors', () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';

      expect(apiService.isRetryableError(error)).toBe(true);
    });

    test('should return true for 5xx errors', () => {
      const error = new ApiError(500, 'Server Error');
      expect(apiService.isRetryableError(error)).toBe(true);

      const error503 = new ApiError(503, 'Service Unavailable');
      expect(apiService.isRetryableError(error503)).toBe(true);
    });

    test('should return true for 429 (Too Many Requests)', () => {
      const error = new ApiError(429, 'Too Many Requests');
      expect(apiService.isRetryableError(error)).toBe(true);
    });

    test('should return false for 4xx errors (except 429)', () => {
      const error400 = new ApiError(400, 'Bad Request');
      expect(apiService.isRetryableError(error400)).toBe(false);

      const error401 = new ApiError(401, 'Unauthorized');
      expect(apiService.isRetryableError(error401)).toBe(false);

      const error404 = new ApiError(404, 'Not Found');
      expect(apiService.isRetryableError(error404)).toBe(false);
    });

    test('should return false for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(apiService.isRetryableError(error)).toBe(false);
    });
  });

  describe('delay', () => {
    test('should delay execution', async () => {
      const start = Date.now();
      await apiService.delay(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('executeWithRetry', () => {
    test('should execute operation successfully on first try', async () => {
      const operation = jest.fn().mockResolvedValue({ success: true });
      const req = createMockReq();

      const result = await apiService.executeWithRetry(operation, req, 'Test');

      expect(result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry on retryable error', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new ApiError(500, 'Server Error'))
        .mockResolvedValueOnce({ success: true });

      const req = createMockReq();

      const result = await apiService.executeWithRetry(operation, req, 'Test');

      expect(result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should throw error after max retries', async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new ApiError(500, 'Server Error'));

      const req = createMockReq();

      await expect(apiService.executeWithRetry(operation, req, 'Test')).rejects.toThrow(
        ApiError
      );

      expect(operation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    test('should not retry on non-retryable error', async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new ApiError(400, 'Bad Request'));

      const req = createMockReq();

      await expect(apiService.executeWithRetry(operation, req, 'Test')).rejects.toThrow(
        ApiError
      );

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateRequestData', () => {
    test('should validate required fields', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const result = apiService.validateRequestData(data, ['name', 'email']);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should report missing required fields', () => {
      const data = { name: 'John' };
      const result = apiService.validateRequestData(data, ['name', 'email']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: email');
    });

    test('should report null required fields', () => {
      const data = { name: 'John', email: null };
      const result = apiService.validateRequestData(data, ['name', 'email']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: email');
    });

    test('should handle non-object data', () => {
      const result = apiService.validateRequestData('invalid', ['name']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Request data must be an object');
    });

    test('should handle null data', () => {
      const result = apiService.validateRequestData(null, ['name']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Request data must be an object');
    });
  });

  describe('formatPaginationParams', () => {
    test('should format pagination with default values', () => {
      const result = apiService.formatPaginationParams();

      expect(result).toEqual({
        skip: 0,
        limit: 10,
        page: 1,
      });
    });

    test('should format pagination with custom values', () => {
      const result = apiService.formatPaginationParams(2, 20);

      expect(result).toEqual({
        skip: 20,
        limit: 20,
        page: 2,
      });
    });

    test('should enforce minimum page of 1', () => {
      const result = apiService.formatPaginationParams(0, 10);

      expect(result.page).toBe(1);
      expect(result.skip).toBe(0);
    });

    test('should enforce maximum limit of 100', () => {
      const result = apiService.formatPaginationParams(1, 200);

      expect(result.limit).toBe(100);
    });

    test('should enforce minimum limit of 1', () => {
      const result = apiService.formatPaginationParams(1, 0);

      expect(result.limit).toBe(1);
    });
  });

  describe('formatFilterParams', () => {
    test('should format allowed filters', () => {
      const filters = { status: 'active', role: 'trainer', invalid: 'value' };
      const result = apiService.formatFilterParams(filters, ['status', 'role']);

      expect(result).toEqual({
        status: 'active',
        role: 'trainer',
      });
      expect(result.invalid).toBeUndefined();
    });

    test('should exclude null and undefined filters', () => {
      const filters = { status: 'active', role: null, goal: undefined };
      const result = apiService.formatFilterParams(filters, ['status', 'role', 'goal']);

      expect(result).toEqual({
        status: 'active',
      });
    });

    test('should handle empty filters', () => {
      const result = apiService.formatFilterParams({}, ['status', 'role']);

      expect(result).toEqual({});
    });
  });

  describe('formatSortParams', () => {
    test('should format sort with default values', () => {
      const result = apiService.formatSortParams();

      expect(result).toEqual({
        createdAt: -1,
      });
    });

    test('should format sort with custom field and order', () => {
      const result = apiService.formatSortParams('name', 'asc', ['name', 'createdAt']);

      expect(result).toEqual({
        name: 1,
      });
    });

    test('should use default field if not allowed', () => {
      const result = apiService.formatSortParams('invalid', 'asc', ['name']);

      expect(result).toEqual({
        createdAt: 1,
      });
    });

    test('should default to desc order', () => {
      const result = apiService.formatSortParams('name', 'invalid', ['name']);

      expect(result).toEqual({
        name: -1,
      });
    });
  });

  describe('buildQueryString', () => {
    test('should build query string from parameters', () => {
      const params = { page: 1, limit: 10, search: 'john' };
      const result = apiService.buildQueryString(params);

      expect(result).toContain('page=1');
      expect(result).toContain('limit=10');
      expect(result).toContain('search=john');
      expect(result).toStartWith('?');
    });

    test('should exclude null and undefined parameters', () => {
      const params = { page: 1, limit: null, search: undefined };
      const result = apiService.buildQueryString(params);

      expect(result).toContain('page=1');
      expect(result).not.toContain('limit');
      expect(result).not.toContain('search');
    });

    test('should exclude empty string parameters', () => {
      const params = { page: 1, search: '' };
      const result = apiService.buildQueryString(params);

      expect(result).toContain('page=1');
      expect(result).not.toContain('search');
    });

    test('should return empty string for empty parameters', () => {
      const result = apiService.buildQueryString({});

      expect(result).toBe('');
    });

    test('should encode special characters', () => {
      const params = { search: 'john doe', email: 'john@example.com' };
      const result = apiService.buildQueryString(params);

      expect(result).toContain('search=john%20doe');
      expect(result).toContain('email=john%40example.com');
    });
  });

  describe('apiServiceMiddleware', () => {
    test('should return middleware function', () => {
      const middleware = apiService.apiServiceMiddleware();

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // (req, res, next)
    });

    test('should apply request interceptor', () => {
      const middleware = apiService.apiServiceMiddleware();
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.startTime).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    test('should intercept response.json calls', () => {
      const middleware = apiService.apiServiceMiddleware();
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      middleware(req, res, next);

      const data = { message: 'Success' };
      res.json(data);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
