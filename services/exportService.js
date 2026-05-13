/**
 * Export Service
 * Handles data export to CSV and JSON formats
 */

const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');

class ExportService {
  /**
   * Export data to CSV or JSON
   * @param {Array} data - Data to export
   * @param {String} format - Export format (csv, json)
   * @param {String} filename - Output filename
   * @param {Object} options - Export options
   * @returns {Promise<Object>} - Export result
   */
  static async exportData(data, format = 'csv', filename = 'export', options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportDir = path.join(process.cwd(), 'exports');
      const exportFileName = `${filename}-${timestamp}.${format}`;
      const exportPath = path.join(exportDir, exportFileName);

      // Create exports directory if it doesn't exist
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      let fileContent;
      let fileSize;

      if (format === 'csv') {
        fileContent = await this.convertToCSV(data, options);
      } else if (format === 'json') {
        fileContent = JSON.stringify(data, null, 2);
      } else {
        throw new Error('Unsupported export format');
      }

      // Write file
      fs.writeFileSync(exportPath, fileContent, 'utf8');

      // Get file size
      const stats = fs.statSync(exportPath);
      fileSize = stats.size;

      return {
        success: true,
        fileName: exportFileName,
        filePath: exportPath,
        fileSize,
        recordCount: data.length,
        format,
        message: `Data exported successfully to ${format.toUpperCase()}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Export failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Convert data to CSV format
   * @param {Array} data - Data to convert
   * @param {Object} options - CSV options
   * @returns {String} - CSV string
   */
  static async convertToCSV(data, options = {}) {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }

      // Get fields from first object if not provided
      const fields = options.fields || Object.keys(data[0]);

      const json2csvParser = new Parser({
        fields,
        ...options,
      });

      return json2csvParser.parse(data);
    } catch (error) {
      throw new Error(`CSV conversion failed: ${error.message}`);
    }
  }

  /**
   * Export users data
   * @param {Array} users - Users data
   * @param {String} format - Export format
   * @returns {Promise<Object>} - Export result
   */
  static async exportUsers(users, format = 'csv') {
    const exportData = users.map((user) => ({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      age: user.age,
      role: user.role,
      membershipPlan: user.membershipPlan,
      membershipStatus: user.membershipStatus,
      membershipStartDate: user.membershipStartDate,
      membershipEndDate: user.membershipEndDate,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));

    return await this.exportData(exportData, format, 'users');
  }

  /**
   * Export trainers data
   * @param {Array} trainers - Trainers data
   * @param {String} format - Export format
   * @returns {Promise<Object>} - Export result
   */
  static async exportTrainers(trainers, format = 'csv') {
    const exportData = trainers.map((trainer) => ({
      id: trainer._id,
      fullName: trainer.fullName,
      email: trainer.email,
      phone: trainer.phone,
      gender: trainer.gender,
      specialization: trainer.specialization?.join(', '),
      experience: trainer.experience,
      trainerStatus: trainer.trainerStatus,
      assignedBranch: trainer.assignedBranch?.branchName || '',
      activeMembersCount: trainer.assignedMembers?.filter((m) => m.status === 'active').length || 0,
      rating: trainer.rating?.average || 0,
      sessionsCompleted: trainer.sessionsCompleted,
      joiningDate: trainer.joiningDate,
      createdAt: trainer.createdAt,
    }));

    return await this.exportData(exportData, format, 'trainers');
  }

  /**
   * Export memberships data
   * @param {Array} memberships - Memberships data
   * @param {String} format - Export format
   * @returns {Promise<Object>} - Export result
   */
  static async exportMemberships(memberships, format = 'csv') {
    const exportData = memberships.map((membership) => ({
      id: membership._id,
      memberId: membership.memberId?._id || membership.memberId,
      memberName: membership.memberId?.fullName || '',
      membershipPlan: membership.membershipPlan,
      membershipStartDate: membership.membershipStartDate,
      membershipEndDate: membership.membershipEndDate,
      membershipStatus: membership.membershipStatus,
      paymentStatus: membership.paymentStatus,
      assignedBranch: membership.assignedBranch?.branchName || '',
      autoRenewal: membership.autoRenewal,
      createdAt: membership.createdAt,
    }));

    return await this.exportData(exportData, format, 'memberships');
  }

  /**
   * Export attendance data
   * @param {Array} attendance - Attendance data
   * @param {String} format - Export format
   * @returns {Promise<Object>} - Export result
   */
  static async exportAttendance(attendance, format = 'csv') {
    const exportData = attendance.map((record) => ({
      id: record._id,
      memberId: record.memberId?._id || record.memberId,
      memberName: record.memberId?.fullName || '',
      trainerId: record.trainerId?._id || record.trainerId,
      trainerName: record.trainerId?.fullName || '',
      branchId: record.branchId?._id || record.branchId,
      branchName: record.branchId?.branchName || '',
      attendanceDate: record.attendanceDate,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      attendanceStatus: record.attendanceStatus,
      notes: record.notes,
      createdAt: record.createdAt,
    }));

    return await this.exportData(exportData, format, 'attendance');
  }

  /**
   * Export financial transactions
   * @param {Array} transactions - Transaction data
   * @param {String} format - Export format
   * @returns {Promise<Object>} - Export result
   */
  static async exportTransactions(transactions, format = 'csv') {
    const exportData = transactions.map((transaction) => ({
      id: transaction._id,
      transactionType: transaction.transactionType,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      paymentStatus: transaction.paymentStatus,
      memberId: transaction.memberId?._id || transaction.memberId,
      memberName: transaction.memberId?.fullName || '',
      branchId: transaction.branchId?._id || transaction.branchId,
      branchName: transaction.branchId?.branchName || '',
      description: transaction.description,
      transactionDate: transaction.transactionDate,
      createdAt: transaction.createdAt,
    }));

    return await this.exportData(exportData, format, 'transactions');
  }

  /**
   * Export support tickets
   * @param {Array} tickets - Ticket data
   * @param {String} format - Export format
   * @returns {Promise<Object>} - Export result
   */
  static async exportSupportTickets(tickets, format = 'csv') {
    const exportData = tickets.map((ticket) => ({
      id: ticket._id,
      ticketTitle: ticket.ticketTitle,
      ticketCategory: ticket.ticketCategory,
      priorityLevel: ticket.priorityLevel,
      ticketStatus: ticket.ticketStatus,
      createdByName: ticket.createdBy?.userName || '',
      createdByEmail: ticket.createdBy?.userEmail || '',
      assignedToName: ticket.assignedTo?.userName || '',
      responseTime: ticket.responseTime,
      resolutionTime: ticket.resolutionTime,
      createdAt: ticket.createdAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
    }));

    return await this.exportData(exportData, format, 'support-tickets');
  }

  /**
   * Delete export file
   * @param {String} filePath - Path to export file
   * @returns {Promise<Object>} - Delete result
   */
  static async deleteExport(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        success: true,
        message: 'Export file deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Delete failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Format file size to human-readable format
   * @param {Number} bytes - Size in bytes
   * @returns {String} - Formatted size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = ExportService;
