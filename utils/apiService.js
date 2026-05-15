/**
 * API Service Utility
 * Handles request/response interceptors, error handling, retry logic,
 * authentication token injection, and request/response logging
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

const ApiError = require('./ApiError');

/**
 * Configuration for API service
 */
const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
  REQUEST_TIMEOUT: 30000, // milliseconds
  ENABLE_LOGGING: process.env.NODE_ENV !== 'production',
};

/**
 * Logger utility for API requests and responses
 */
class APILogger {
  /**
   * Log incoming request
   * @param {Object} req - Express request object
   * @param {string} endpoint - API endpoint
   */
  static logRequest(req, endpoint) {
    if (!API_CONFIG.ENABLE_LOGGING) return;

    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      endpoint,
      userId: req.user?.id || 'anonymous',
      userRole: req.user?.role || 'unknown',
      ip: req.ip,
      query: req.query,
      body: this.sanitizeBody(req.body),
    };

    console.log('[API Request]', JSON.stringify(logData, null, 2));
  }

  /**
   * Log outgoing response
   * @param {Object} req - Express request object
   * @param {number} statusCode - HTTP status code
   * @param {Object} data - Response data
   * @param {string} endpoint - API endpoint
   * @param {number} duration - Request duration in milliseconds
   */
  static logResponse(req, statusCode, data, endpoint, duration) {
    if (!API_CONFIG.ENABLE_LOGGING) return;

    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      endpoint,
      statusCode,
      userId: req.user?.id || 'anonymous',
      duration: `${duration}ms`,
      dataSize: JSON.stringify(data).length,
    };

    console.log('[API Response]', JSON.stringify(logData, null, 2));
  }

  /**
   * Log error
   * @param {Object} req - Express request object
   * @param {Error} error - Error object
   * @param {string} endpoint - API endpoint
   * @param {number} duration - Request duration in milliseconds
   */
  static logError(req, error, endpoint, duration) {
    if (!API_CONFIG.ENABLE_LOGGING) return;

    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      endpoint,
      statusCode: error.statusCode || 500,
      message: error.message,
      userId: req.user?.id || 'anonymous',
      duration: `${duration}ms`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };

    console.error('[API Error]', JSON.stringify(logData, null, 2));
  }

  /**
   * Sanitize request body to remove sensitive data
   * @param {Object} body - Request body
   * @returns {Object} - Sanitized body
   */
  static sanitizeBody(body) {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'refreshToken'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}

/**
 * Request Interceptor
 * Adds authentication token to all requests
 * 
 * @param {Object} req - Express request object
 * @returns {Object} - Modified request object
 */
function requestInterceptor(req) {
  // Add authentication token if user is authenticated
  if (req.user && req.user.id) {
    req.headers = req.headers || {};
    // Token is already verified by auth middleware
    // This is for internal service-to-service calls if needed
    req.userId = req.user.id;
    req.userRole = req.user.role;
  }

  // Add request timestamp for tracking
  req.startTime = Date.now();

  return req;
}

/**
 * Response Interceptor
 * Handles response validation and logging
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @returns {Object} - Response data
 */
function responseInterceptor(req, res, data) {
  const duration = Date.now() - req.startTime;
  const statusCode = res.statusCode || 200;

  // Log response
  APILogger.logResponse(req, statusCode, data, req.path, duration);

  // Validate response format
  if (data && typeof data === 'object') {
    // Ensure response has required fields
    if (!data.hasOwnProperty('success')) {
      data.success = statusCode >= 200 && statusCode < 300;
    }
    if (!data.hasOwnProperty('message') && !data.success) {
      data.message = 'An error occurred';
    }
  }

  return data;
}

/**
 * Error Interceptor
 * Handles error responses and retry logic
 * 
 * @param {Object} req - Express request object
 * @param {Error} error - Error object
 * @param {number} retryCount - Current retry count
 * @returns {Promise} - Rejected promise with error
 */
async function errorInterceptor(req, error, retryCount = 0) {
  const duration = Date.now() - req.startTime;

  // Log error
  APILogger.logError(req, error, req.path, duration);

  // Determine if error is retryable
  const isRetryable = isRetryableError(error);
  const shouldRetry = isRetryable && retryCount < API_CONFIG.MAX_RETRIES;

  if (shouldRetry) {
    // Wait before retrying
    await delay(API_CONFIG.RETRY_DELAY * (retryCount + 1));

    // Log retry attempt
    if (API_CONFIG.ENABLE_LOGGING) {
      console.log(
        `[API Retry] Attempt ${retryCount + 1}/${API_CONFIG.MAX_RETRIES} for ${req.method} ${req.path}`
      );
    }

    return { shouldRetry: true, retryCount: retryCount + 1 };
  }

  // Convert error to ApiError if not already
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    throw new ApiError(statusCode, message);
  }

  throw error;
}

/**
 * Determine if an error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} - True if error is retryable
 */
function isRetryableError(error) {
  // Retry on network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Retry on 5xx errors (server errors)
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }

  // Retry on 429 (Too Many Requests)
  if (error.statusCode === 429) {
    return true;
  }

  // Don't retry on 4xx errors (client errors)
  if (error.statusCode >= 400 && error.statusCode < 500) {
    return false;
  }

  return false;
}

/**
 * Delay utility for retry logic
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Resolves after delay
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Middleware to apply request/response interceptors
 * Should be used as early middleware in Express app
 * 
 * @returns {Function} - Express middleware function
 */
function apiServiceMiddleware() {
  return (req, res, next) => {
    // Apply request interceptor
    requestInterceptor(req);

    // Store original res.json to intercept responses
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Apply response interceptor
      const interceptedData = responseInterceptor(req, res, data);
      return originalJson(interceptedData);
    };

    next();
  };
}

/**
 * Wrapper for async operations with retry logic
 * 
 * @param {Function} operation - Async operation to execute
 * @param {Object} req - Express request object
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise} - Result of operation
 */
async function executeWithRetry(operation, req, operationName = 'Operation') {
  let lastError;
  let retryCount = 0;

  while (retryCount <= API_CONFIG.MAX_RETRIES) {
    try {
      if (API_CONFIG.ENABLE_LOGGING && retryCount > 0) {
        console.log(`[${operationName}] Retry attempt ${retryCount}/${API_CONFIG.MAX_RETRIES}`);
      }

      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error) || retryCount >= API_CONFIG.MAX_RETRIES) {
        break;
      }

      // Wait before retrying
      await delay(API_CONFIG.RETRY_DELAY * (retryCount + 1));
      retryCount++;
    }
  }

  // All retries exhausted, throw error
  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError(
    lastError.statusCode || 500,
    lastError.message || 'Operation failed after retries'
  );
}

/**
 * Validate request data
 * 
 * @param {Object} data - Data to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} - Validation result { valid: boolean, errors: Array }
 */
function validateRequestData(data, requiredFields = []) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Request data must be an object'],
    };
  }

  requiredFields.forEach((field) => {
    if (!data.hasOwnProperty(field) || data[field] === null || data[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format pagination parameters
 * 
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Object} - Formatted pagination { skip: number, limit: number }
 */
function formatPaginationParams(page = 1, limit = 10) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));

  return {
    skip: (pageNum - 1) * limitNum,
    limit: limitNum,
    page: pageNum,
  };
}

/**
 * Format filter parameters
 * 
 * @param {Object} filters - Filter object
 * @param {Array} allowedFilters - Array of allowed filter keys
 * @returns {Object} - Formatted filters
 */
function formatFilterParams(filters = {}, allowedFilters = []) {
  const formatted = {};

  allowedFilters.forEach((key) => {
    if (filters.hasOwnProperty(key) && filters[key] !== null && filters[key] !== undefined) {
      formatted[key] = filters[key];
    }
  });

  return formatted;
}

/**
 * Format sort parameters
 * 
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order ('asc' or 'desc')
 * @param {Array} allowedFields - Array of allowed sort fields
 * @returns {Object} - Formatted sort { [field]: 1 or -1 }
 */
function formatSortParams(sortBy = 'createdAt', sortOrder = 'desc', allowedFields = []) {
  const field = allowedFields.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder === 'asc' ? 1 : -1;

  return {
    [field]: order,
  };
}

/**
 * Build query string from parameters
 * 
 * @param {Object} params - Query parameters
 * @returns {string} - Query string
 */
function buildQueryString(params = {}) {
  const queryParts = [];

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });

  return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
}

module.exports = {
  // Configuration
  API_CONFIG,

  // Interceptors
  requestInterceptor,
  responseInterceptor,
  errorInterceptor,

  // Middleware
  apiServiceMiddleware,

  // Utilities
  executeWithRetry,
  validateRequestData,
  formatPaginationParams,
  formatFilterParams,
  formatSortParams,
  buildQueryString,
  isRetryableError,
  delay,

  // Logger
  APILogger,
};
