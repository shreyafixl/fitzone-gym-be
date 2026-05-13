/**
 * Import Service
 * Handles data import from CSV and JSON formats
 */

const fs = require('fs');
const csv = require('csv-parser');

class ImportService {
  /**
   * Import data from CSV or JSON file
   * @param {String} filePath - Path to import file
   * @param {String} format - File format (csv, json)
   * @param {Object} options - Import options
   * @returns {Promise<Object>} - Import result
   */
  static async importData(filePath, format = 'csv', options = {}) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Import file not found');
      }

      let data;

      if (format === 'csv') {
        data = await this.parseCSV(filePath, options);
      } else if (format === 'json') {
        data = await this.parseJSON(filePath);
      } else {
        throw new Error('Unsupported import format');
      }

      // Validate data
      const validation = this.validateImportData(data, options);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      return {
        success: true,
        data,
        recordCount: data.length,
        format,
        message: `Data imported successfully from ${format.toUpperCase()}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Parse CSV file
   * @param {String} filePath - Path to CSV file
   * @param {Object} options - Parse options
   * @returns {Promise<Array>} - Parsed data
   */
  static async parseCSV(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      const results = [];

      fs.createReadStream(filePath)
        .pipe(csv(options))
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Parse JSON file
   * @param {String} filePath - Path to JSON file
   * @returns {Promise<Array>} - Parsed data
   */
  static async parseJSON(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      // Ensure data is an array
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
  }

  /**
   * Validate import data
   * @param {Array} data - Data to validate
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  static validateImportData(data, options = {}) {
    const errors = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { isValid: false, errors };
    }

    if (data.length === 0) {
      errors.push('No data to import');
      return { isValid: false, errors };
    }

    // Validate required fields if specified
    if (options.requiredFields && Array.isArray(options.requiredFields)) {
      data.forEach((record, index) => {
        options.requiredFields.forEach((field) => {
          if (!record[field]) {
            errors.push(`Record ${index + 1}: Missing required field '${field}'`);
          }
        });
      });
    }

    // Validate data types if specified
    if (options.fieldTypes) {
      data.forEach((record, index) => {
        Object.keys(options.fieldTypes).forEach((field) => {
          if (record[field] !== undefined) {
            const expectedType = options.fieldTypes[field];
            const actualType = typeof record[field];

            if (actualType !== expectedType) {
              errors.push(
                `Record ${index + 1}: Field '${field}' should be ${expectedType}, got ${actualType}`
              );
            }
          }
        });
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Import users data
   * @param {String} filePath - Path to import file
   * @param {String} format - File format
   * @returns {Promise<Object>} - Import result
   */
  static async importUsers(filePath, format = 'csv') {
    const options = {
      requiredFields: ['fullName', 'email', 'phone', 'gender'],
      fieldTypes: {
        fullName: 'string',
        email: 'string',
        phone: 'string',
        gender: 'string',
        age: 'number',
      },
    };

    const result = await this.importData(filePath, format, options);

    if (result.success) {
      // Transform data for user creation
      result.data = result.data.map((record) => ({
        fullName: record.fullName,
        email: record.email.toLowerCase(),
        phone: record.phone,
        gender: record.gender.toLowerCase(),
        age: parseInt(record.age) || 25,
        role: record.role || 'member',
        membershipPlan: record.membershipPlan || 'none',
        membershipStatus: record.membershipStatus || 'pending',
        isActive: record.isActive !== 'false',
      }));
    }

    return result;
  }

  /**
   * Import trainers data
   * @param {String} filePath - Path to import file
   * @param {String} format - File format
   * @returns {Promise<Object>} - Import result
   */
  static async importTrainers(filePath, format = 'csv') {
    const options = {
      requiredFields: ['fullName', 'email', 'phone', 'gender'],
      fieldTypes: {
        fullName: 'string',
        email: 'string',
        phone: 'string',
        gender: 'string',
        experience: 'number',
      },
    };

    const result = await this.importData(filePath, format, options);

    if (result.success) {
      // Transform data for trainer creation
      result.data = result.data.map((record) => ({
        fullName: record.fullName,
        email: record.email.toLowerCase(),
        phone: record.phone,
        gender: record.gender.toLowerCase(),
        specialization: record.specialization ? record.specialization.split(',').map((s) => s.trim()) : [],
        experience: parseInt(record.experience) || 0,
        trainerStatus: record.trainerStatus || 'active',
        isActive: record.isActive !== 'false',
      }));
    }

    return result;
  }

  /**
   * Import attendance data
   * @param {String} filePath - Path to import file
   * @param {String} format - File format
   * @returns {Promise<Object>} - Import result
   */
  static async importAttendance(filePath, format = 'csv') {
    const options = {
      requiredFields: ['memberId', 'attendanceDate', 'checkInTime'],
      fieldTypes: {
        memberId: 'string',
        attendanceDate: 'string',
        checkInTime: 'string',
      },
    };

    const result = await this.importData(filePath, format, options);

    if (result.success) {
      // Transform data for attendance creation
      result.data = result.data.map((record) => ({
        memberId: record.memberId,
        trainerId: record.trainerId || null,
        branchId: record.branchId || null,
        attendanceDate: new Date(record.attendanceDate),
        checkInTime: new Date(record.checkInTime),
        checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : null,
        attendanceStatus: record.attendanceStatus || 'present',
        notes: record.notes || '',
      }));
    }

    return result;
  }

  /**
   * Sanitize import data
   * @param {Array} data - Data to sanitize
   * @returns {Array} - Sanitized data
   */
  static sanitizeData(data) {
    return data.map((record) => {
      const sanitized = {};

      Object.keys(record).forEach((key) => {
        let value = record[key];

        // Trim strings
        if (typeof value === 'string') {
          value = value.trim();
        }

        // Convert empty strings to null
        if (value === '') {
          value = null;
        }

        sanitized[key] = value;
      });

      return sanitized;
    });
  }

  /**
   * Validate email format
   * @param {String} email - Email to validate
   * @returns {Boolean} - Is valid
   */
  static validateEmail(email) {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   * @param {String} phone - Phone to validate
   * @returns {Boolean} - Is valid
   */
  static validatePhone(phone) {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Get import statistics
   * @param {Array} data - Imported data
   * @returns {Object} - Statistics
   */
  static getImportStatistics(data) {
    return {
      totalRecords: data.length,
      fields: data.length > 0 ? Object.keys(data[0]) : [],
      fieldCount: data.length > 0 ? Object.keys(data[0]).length : 0,
    };
  }
}

module.exports = ImportService;
