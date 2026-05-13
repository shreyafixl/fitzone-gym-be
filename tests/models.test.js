const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const CheckIn = require('../models/CheckIn');
const Branch = require('../models/Branch');

// Test database connection
const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/fitzone_test';

describe('Model Tests - User, Attendance, CheckIn', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Clean up and disconnect
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await User.deleteMany({});
    await Attendance.deleteMany({});
    await CheckIn.deleteMany({});
    await Branch.deleteMany({});
  });

  // ============================================
  // USER MODEL TESTS
  // ============================================
  describe('User Model', () => {
    test('should import User model successfully', () => {
      expect(User).toBeDefined();
      expect(User.modelName).toBe('User');
    });

    test('should create a new user document', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePassword123',
        phone: '1234567890',
        gender: 'male',
        age: 30,
      };

      const user = await User.create(userData);

      expect(user._id).toBeDefined();
      expect(user.fullName).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.phone).toBe('1234567890');
      expect(user.gender).toBe('male');
      expect(user.age).toBe(30);
      expect(user.role).toBe('member'); // Default role
      expect(user.membershipStatus).toBe('pending'); // Default status
    });

    test('should hash password before saving', async () => {
      const userData = {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'SecurePassword123',
        phone: '1234567891',
        gender: 'female',
        age: 28,
      };

      const user = await User.create(userData);
      const savedUser = await User.findById(user._id).select('+password');

      expect(savedUser.password).not.toBe('SecurePassword123');
      expect(savedUser.password).toBeDefined();
    });

    test('should compare password correctly', async () => {
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'SecurePassword123',
        phone: '1234567892',
        gender: 'male',
        age: 25,
      };

      const user = await User.create(userData);

      const isMatch = await user.comparePassword('SecurePassword123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('WrongPassword');
      expect(isNotMatch).toBe(false);
    });

    test('should query users by email', async () => {
      const userData = {
        fullName: 'Email Test',
        email: 'emailtest@example.com',
        password: 'SecurePassword123',
        phone: '1234567893',
        gender: 'male',
        age: 30,
      };

      await User.create(userData);
      const user = await User.findByEmail('emailtest@example.com');

      expect(user).toBeDefined();
      expect(user.email).toBe('emailtest@example.com');
      expect(user.fullName).toBe('Email Test');
    });

    test('should return public profile without sensitive data', async () => {
      const userData = {
        fullName: 'Profile Test',
        email: 'profile@example.com',
        password: 'SecurePassword123',
        phone: '1234567894',
        gender: 'female',
        age: 27,
        address: '123 Main St',
      };

      const user = await User.create(userData);
      const publicProfile = user.getPublicProfile();

      expect(publicProfile.id).toBeDefined();
      expect(publicProfile.fullName).toBe('Profile Test');
      expect(publicProfile.email).toBe('profile@example.com');
      expect(publicProfile.address).toBe('123 Main St');
      expect(publicProfile.password).toBeUndefined();
    });

    test('should auto-generate timestamps', async () => {
      const userData = {
        fullName: 'Timestamp Test',
        email: 'timestamp@example.com',
        password: 'SecurePassword123',
        phone: '1234567895',
        gender: 'male',
        age: 32,
      };

      const user = await User.create(userData);

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt instanceof Date).toBe(true);
      expect(user.updatedAt instanceof Date).toBe(true);
    });

    test('should calculate membership days remaining', async () => {
      const userData = {
        fullName: 'Membership Test',
        email: 'membership@example.com',
        password: 'SecurePassword123',
        phone: '1234567896',
        gender: 'male',
        age: 29,
        membershipStatus: 'active',
        membershipStartDate: new Date(),
        membershipEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };

      const user = await User.create(userData);
      const daysRemaining = user.getMembershipDaysRemaining();

      expect(daysRemaining).toBeGreaterThan(0);
      expect(daysRemaining).toBeLessThanOrEqual(30);
    });

    test('should add attendance record', async () => {
      const userData = {
        fullName: 'Attendance Test',
        email: 'attendance@example.com',
        password: 'SecurePassword123',
        phone: '1234567897',
        gender: 'male',
        age: 26,
      };

      const user = await User.create(userData);
      const checkInTime = new Date();
      const checkOutTime = new Date(checkInTime.getTime() + 60 * 60 * 1000); // 1 hour later

      await user.addAttendance(checkInTime, checkOutTime);
      const updatedUser = await User.findById(user._id);

      expect(updatedUser.attendance.length).toBe(1);
      expect(updatedUser.attendance[0].checkIn).toEqual(checkInTime);
      expect(updatedUser.attendance[0].checkOut).toEqual(checkOutTime);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        fullName: 'Invalid User',
        // Missing email, password, phone, gender, age
      };

      await expect(User.create(invalidData)).rejects.toThrow();
    });

    test('should validate email format', async () => {
      const userData = {
        fullName: 'Email Validation',
        email: 'invalid-email', // Invalid email
        password: 'SecurePassword123',
        phone: '1234567898',
        gender: 'male',
        age: 30,
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    test('should validate phone number format', async () => {
      const userData = {
        fullName: 'Phone Validation',
        email: 'phone@example.com',
        password: 'SecurePassword123',
        phone: '123', // Invalid phone (not 10 digits)
        gender: 'male',
        age: 30,
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  // ============================================
  // ATTENDANCE MODEL TESTS
  // ============================================
  describe('Attendance Model', () => {
    let testUser;
    let testBranch;

    beforeEach(async () => {
      // Create test user and branch
      testUser = await User.create({
        fullName: 'Test Member',
        email: 'member@example.com',
        password: 'SecurePassword123',
        phone: '1234567890',
        gender: 'male',
        age: 30,
      });

      testBranch = await Branch.create({
        branchName: 'Main Branch',
        branchCode: 'MB001',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        pincode: '10001',
        contactNumber: '2125551234',
        email: 'main@branch.com',
        openingTime: '06:00',
        closingTime: '22:00',
      });
    });

    test('should import Attendance model successfully', () => {
      expect(Attendance).toBeDefined();
      expect(Attendance.modelName).toBe('Attendance');
    });

    test('should create an attendance record', async () => {
      const attendanceData = {
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: new Date(),
        attendanceStatus: 'present',
      };

      const attendance = await Attendance.create(attendanceData);

      expect(attendance._id).toBeDefined();
      expect(attendance.memberId).toEqual(testUser._id);
      expect(attendance.branchId).toEqual(testBranch._id);
      expect(attendance.attendanceStatus).toBe('present');
      expect(attendance.duration).toBe(0); // No checkout yet
    });

    test('should calculate duration on save', async () => {
      const checkInTime = new Date();
      const checkOutTime = new Date(checkInTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

      const attendanceData = {
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: checkInTime,
        checkOutTime: checkOutTime,
        attendanceStatus: 'present',
      };

      const attendance = await Attendance.create(attendanceData);

      expect(attendance.duration).toBe(120); // 2 hours = 120 minutes
    });

    test('should checkout member and calculate duration', async () => {
      const checkInTime = new Date();
      const attendance = await Attendance.create({
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: checkInTime,
        attendanceStatus: 'present',
      });

      const checkOutTime = new Date(checkInTime.getTime() + 90 * 60 * 1000); // 90 minutes later
      await attendance.checkOut(checkOutTime);

      const updatedAttendance = await Attendance.findById(attendance._id);
      expect(updatedAttendance.checkOutTime).toEqual(checkOutTime);
      expect(updatedAttendance.duration).toBe(90);
    });

    test('should get attendance by date range', async () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      await Attendance.create({
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: today,
        checkInTime: new Date(),
        attendanceStatus: 'present',
      });

      const records = await Attendance.getByDateRange(startDate, endDate);

      expect(records.length).toBeGreaterThan(0);
      expect(records[0].memberId._id).toEqual(testUser._id);
    });

    test('should get member attendance history', async () => {
      const checkInTime = new Date();
      await Attendance.create({
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: checkInTime,
        attendanceStatus: 'present',
      });

      const history = await Attendance.getMemberHistory(testUser._id);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].memberId._id).toEqual(testUser._id);
    });

    test('should get attendance statistics', async () => {
      await Attendance.create({
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: new Date(),
        attendanceStatus: 'present',
      });

      await Attendance.create({
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: new Date(),
        attendanceStatus: 'absent',
      });

      const stats = await Attendance.getStats();

      expect(stats.total).toBe(2);
      expect(stats.present).toBe(1);
      expect(stats.absent).toBe(1);
    });

    test('should auto-generate timestamps', async () => {
      const attendance = await Attendance.create({
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: new Date(),
        attendanceStatus: 'present',
      });

      expect(attendance.createdAt).toBeDefined();
      expect(attendance.updatedAt).toBeDefined();
    });

    test('should return public profile', async () => {
      const attendance = await Attendance.create({
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: new Date(),
        attendanceStatus: 'present',
      });

      const publicProfile = attendance.getPublicProfile();

      expect(publicProfile.id).toBeDefined();
      expect(publicProfile.memberId).toEqual(testUser._id);
      expect(publicProfile.attendanceStatus).toBe('present');
    });
  });

  // ============================================
  // CHECK-IN MODEL TESTS
  // ============================================
  describe('CheckIn Model', () => {
    let testUser;
    let testBranch;

    beforeEach(async () => {
      testUser = await User.create({
        fullName: 'Test Member',
        email: 'checkin@example.com',
        password: 'SecurePassword123',
        phone: '1234567890',
        gender: 'male',
        age: 30,
      });

      testBranch = await Branch.create({
        branchName: 'Test Branch',
        branchCode: 'TB001',
        address: '456 Test Ave',
        city: 'Boston',
        state: 'MA',
        pincode: '02101',
        contactNumber: '6175551234',
        email: 'test@branch.com',
        openingTime: '06:00',
        closingTime: '22:00',
      });
    });

    test('should import CheckIn model successfully', () => {
      expect(CheckIn).toBeDefined();
      expect(CheckIn.modelName).toBe('CheckIn');
    });

    test('should create a check-in record', async () => {
      const checkInData = {
        memberId: testUser._id,
        checkInTime: new Date(),
        branchId: testBranch._id,
      };

      const checkIn = await CheckIn.create(checkInData);

      expect(checkIn._id).toBeDefined();
      expect(checkIn.memberId).toEqual(testUser._id);
      expect(checkIn.status).toBe('active');
      expect(checkIn.duration).toBe(0);
    });

    test('should checkout member with duration calculation', async () => {
      const checkInTime = new Date();
      const checkIn = await CheckIn.create({
        memberId: testUser._id,
        checkInTime: checkInTime,
        branchId: testBranch._id,
      });

      const checkOutTime = new Date(checkInTime.getTime() + 75 * 60 * 1000); // 75 minutes later
      await checkIn.checkOut(checkOutTime, false);

      const updatedCheckIn = await CheckIn.findById(checkIn._id);
      expect(updatedCheckIn.status).toBe('checked-out');
      expect(updatedCheckIn.checkOutTime).toEqual(checkOutTime);
      expect(updatedCheckIn.duration).toBe(75);
      expect(updatedCheckIn.isAutoCheckout).toBe(false);
    });

    test('should handle auto-checkout', async () => {
      const checkInTime = new Date();
      const checkIn = await CheckIn.create({
        memberId: testUser._id,
        checkInTime: checkInTime,
        branchId: testBranch._id,
      });

      const checkOutTime = new Date(checkInTime.getTime() + 60 * 60 * 1000); // 1 hour later
      await checkIn.checkOut(checkOutTime, true);

      const updatedCheckIn = await CheckIn.findById(checkIn._id);
      expect(updatedCheckIn.status).toBe('auto-checked-out');
      expect(updatedCheckIn.isAutoCheckout).toBe(true);
    });

    test('should get active check-ins', async () => {
      await CheckIn.create({
        memberId: testUser._id,
        checkInTime: new Date(),
        branchId: testBranch._id,
      });

      const activeCheckIns = await CheckIn.getActiveCheckins();

      expect(activeCheckIns.length).toBeGreaterThan(0);
      expect(activeCheckIns[0].status).toBe('active');
    });

    test('should get check-ins by date', async () => {
      const today = new Date();
      await CheckIn.create({
        memberId: testUser._id,
        checkInTime: today,
        branchId: testBranch._id,
      });

      const checkIns = await CheckIn.getByDate(today);

      expect(checkIns.length).toBeGreaterThan(0);
      expect(checkIns[0].memberId._id).toEqual(testUser._id);
    });

    test('should get check-in statistics', async () => {
      const checkInTime = new Date();
      const checkIn1 = await CheckIn.create({
        memberId: testUser._id,
        checkInTime: checkInTime,
        branchId: testBranch._id,
      });

      const checkIn2 = await CheckIn.create({
        memberId: testUser._id,
        checkInTime: new Date(),
        branchId: testBranch._id,
      });

      await checkIn1.checkOut(new Date(checkInTime.getTime() + 60 * 60 * 1000), false);

      const stats = await CheckIn.getStats();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats['checked-out']).toBe(1);
    });

    test('should get average duration', async () => {
      const checkInTime1 = new Date();
      const checkIn1 = await CheckIn.create({
        memberId: testUser._id,
        checkInTime: checkInTime1,
        branchId: testBranch._id,
      });

      const checkInTime2 = new Date();
      const checkIn2 = await CheckIn.create({
        memberId: testUser._id,
        checkInTime: checkInTime2,
        branchId: testBranch._id,
      });

      // Checkout first one: 60 minutes
      await checkIn1.checkOut(new Date(checkInTime1.getTime() + 60 * 60 * 1000), false);

      // Checkout second one: 120 minutes
      await checkIn2.checkOut(new Date(checkInTime2.getTime() + 120 * 60 * 1000), false);

      const avgDuration = await CheckIn.getAverageDuration();

      expect(avgDuration).toBe(90); // Average of 60 and 120
    });

    test('should auto-generate timestamps', async () => {
      const checkIn = await CheckIn.create({
        memberId: testUser._id,
        checkInTime: new Date(),
        branchId: testBranch._id,
      });

      expect(checkIn.createdAt).toBeDefined();
      expect(checkIn.updatedAt).toBeDefined();
    });

    test('should return public profile', async () => {
      const checkIn = await CheckIn.create({
        memberId: testUser._id,
        checkInTime: new Date(),
        branchId: testBranch._id,
      });

      const publicProfile = checkIn.getPublicProfile();

      expect(publicProfile.id).toBeDefined();
      expect(publicProfile.memberId).toEqual(testUser._id);
      expect(publicProfile.status).toBe('active');
    });
  });

  // ============================================
  // RELATIONSHIP TESTS
  // ============================================
  describe('Model Relationships', () => {
    let testUser;
    let testBranch;

    beforeEach(async () => {
      testUser = await User.create({
        fullName: 'Relationship Test User',
        email: 'relationship@example.com',
        password: 'SecurePassword123',
        phone: '1234567890',
        gender: 'male',
        age: 30,
      });

      testBranch = await Branch.create({
        branchName: 'Relationship Test Branch',
        branchCode: 'RTB001',
        address: '789 Relationship St',
        city: 'Chicago',
        state: 'IL',
        pincode: '60601',
        contactNumber: '3125551234',
        email: 'relationship@branch.com',
        openingTime: '06:00',
        closingTime: '22:00',
      });
    });

    test('should confirm memberId references work correctly', async () => {
      const attendance = await Attendance.create({
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: new Date(),
        attendanceStatus: 'present',
      });

      expect(attendance.memberId).toEqual(testUser._id);
    });

    test('should populate referenced User document in Attendance', async () => {
      await Attendance.create({
        memberId: testUser._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: new Date(),
        attendanceStatus: 'present',
      });

      const attendance = await Attendance.findOne({})
        .populate('memberId', 'fullName email')
        .populate('branchId', 'branchName');

      expect(attendance.memberId.fullName).toBe('Relationship Test User');
      expect(attendance.memberId.email).toBe('relationship@example.com');
      expect(attendance.branchId.branchName).toBe('Relationship Test Branch');
    });

    test('should populate referenced User document in CheckIn', async () => {
      await CheckIn.create({
        memberId: testUser._id,
        checkInTime: new Date(),
        branchId: testBranch._id,
      });

      const checkIn = await CheckIn.findOne({})
        .populate('memberId', 'fullName email')
        .populate('branchId', 'branchName');

      expect(checkIn.memberId.fullName).toBe('Relationship Test User');
      expect(checkIn.memberId.email).toBe('relationship@example.com');
      expect(checkIn.branchId.branchName).toBe('Relationship Test Branch');
    });

    test('should query with populated references', async () => {
      const checkInTime = new Date();
      const checkIn = await CheckIn.create({
        memberId: testUser._id,
        checkInTime: checkInTime,
        branchId: testBranch._id,
      });

      const activeCheckIns = await CheckIn.getActiveCheckins();

      expect(activeCheckIns.length).toBeGreaterThan(0);
      expect(activeCheckIns[0].memberId).toBeDefined();
      expect(activeCheckIns[0].memberId.fullName).toBe('Relationship Test User');
    });

    test('should handle multiple references in Attendance', async () => {
      const trainer = await User.create({
        fullName: 'Test Trainer',
        email: 'trainer@example.com',
        password: 'SecurePassword123',
        phone: '1234567891',
        gender: 'male',
        age: 35,
        role: 'trainer',
      });

      const attendance = await Attendance.create({
        memberId: testUser._id,
        trainerId: trainer._id,
        branchId: testBranch._id,
        attendanceDate: new Date(),
        checkInTime: new Date(),
        attendanceStatus: 'present',
      });

      const populated = await Attendance.findById(attendance._id)
        .populate('memberId', 'fullName')
        .populate('trainerId', 'fullName')
        .populate('branchId', 'branchName');

      expect(populated.memberId.fullName).toBe('Relationship Test User');
      expect(populated.trainerId.fullName).toBe('Test Trainer');
      expect(populated.branchId.branchName).toBe('Relationship Test Branch');
    });
  });
});
