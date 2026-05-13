const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Trainer Schema
 * Manages trainer-specific information and functionality
 */
const trainerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [255, 'Name cannot exceed 255 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be male, female, or other',
      },
      required: [true, 'Gender is required'],
    },
    specialization: {
      type: [String],
      default: [],
      enum: {
        values: [
          'strength-training',
          'cardio',
          'yoga',
          'pilates',
          'crossfit',
          'bodybuilding',
          'weight-loss',
          'nutrition',
          'sports-training',
          'rehabilitation',
          'functional-training',
          'hiit',
          'zumba',
          'martial-arts',
          'personal-training',
          'group-fitness',
        ],
        message: 'Invalid specialization',
      },
    },
    certifications: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        issuingOrganization: {
          type: String,
          trim: true,
        },
        issueDate: {
          type: Date,
        },
        expiryDate: {
          type: Date,
        },
        certificateNumber: {
          type: String,
          trim: true,
        },
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
    ],
    experience: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative'],
      max: [50, 'Experience cannot exceed 50 years'],
    },
    assignedBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Assigned branch is required'],
      index: true,
    },
    assignedMembers: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        assignedDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['active', 'inactive', 'completed'],
          default: 'active',
        },
      },
    ],
    availability: {
      monday: {
        isAvailable: { type: Boolean, default: true },
        slots: [
          {
            startTime: String, // Format: "HH:MM"
            endTime: String,   // Format: "HH:MM"
          },
        ],
      },
      tuesday: {
        isAvailable: { type: Boolean, default: true },
        slots: [
          {
            startTime: String,
            endTime: String,
          },
        ],
      },
      wednesday: {
        isAvailable: { type: Boolean, default: true },
        slots: [
          {
            startTime: String,
            endTime: String,
          },
        ],
      },
      thursday: {
        isAvailable: { type: Boolean, default: true },
        slots: [
          {
            startTime: String,
            endTime: String,
          },
        ],
      },
      friday: {
        isAvailable: { type: Boolean, default: true },
        slots: [
          {
            startTime: String,
            endTime: String,
          },
        ],
      },
      saturday: {
        isAvailable: { type: Boolean, default: true },
        slots: [
          {
            startTime: String,
            endTime: String,
          },
        ],
      },
      sunday: {
        isAvailable: { type: Boolean, default: false },
        slots: [
          {
            startTime: String,
            endTime: String,
          },
        ],
      },
    },
    salary: {
      amount: {
        type: Number,
        required: [true, 'Salary amount is required'],
        min: [0, 'Salary cannot be negative'],
      },
      currency: {
        type: String,
        default: 'INR',
      },
      paymentFrequency: {
        type: String,
        enum: ['monthly', 'weekly', 'hourly'],
        default: 'monthly',
      },
    },
    attendance: [
      {
        date: {
          type: Date,
          required: true,
        },
        checkIn: {
          type: Date,
          required: true,
        },
        checkOut: {
          type: Date,
          default: null,
        },
        status: {
          type: String,
          enum: ['present', 'absent', 'late', 'half-day', 'leave'],
          default: 'present',
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    trainerStatus: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'on-leave'],
        message: 'Status must be active, inactive, or on-leave',
      },
      default: 'active',
      index: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
      default: Date.now,
    },
    address: {
      street: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        default: 'India',
      },
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
      },
      relationship: {
        type: String,
        trim: true,
      },
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    sessionsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Indexes for faster queries
trainerSchema.index({ email: 1 });
trainerSchema.index({ trainerStatus: 1 });
trainerSchema.index({ assignedBranch: 1 });
trainerSchema.index({ specialization: 1 });
trainerSchema.index({ 'assignedMembers.memberId': 1 });

/**
 * Pre-save middleware to hash password before saving
 * Only hashes if password is modified or new
 */
trainerSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare entered password with hashed password
 * @param {string} enteredPassword - Plain text password to compare
 * @returns {Promise<boolean>} - True if passwords match
 */
trainerSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Method to get public profile (without sensitive data)
 * @returns {Object} - Public profile data
 */
trainerSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    gender: this.gender,
    specialization: this.specialization,
    certifications: this.certifications,
    experience: this.experience,
    assignedBranch: this.assignedBranch,
    assignedMembersCount: this.assignedMembers.filter(m => m.status === 'active').length,
    trainerStatus: this.trainerStatus,
    profileImage: this.profileImage,
    joiningDate: this.joiningDate,
    bio: this.bio,
    rating: this.rating,
    sessionsCompleted: this.sessionsCompleted,
    isActive: this.isActive,
    attendanceCount: this.attendance.length,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Method to add attendance record
 * @param {Date} checkIn - Check-in time
 * @param {Date} checkOut - Check-out time (optional)
 * @param {String} status - Attendance status
 * @param {String} notes - Additional notes
 */
trainerSchema.methods.addAttendance = function (checkIn, checkOut = null, status = 'present', notes = '') {
  this.attendance.push({
    date: new Date(),
    checkIn: checkIn,
    checkOut: checkOut,
    status: status,
    notes: notes,
  });
  return this.save();
};

/**
 * Method to assign member to trainer
 * @param {String} memberId - Member ID to assign
 */
trainerSchema.methods.assignMember = function (memberId) {
  // Check if member is already assigned
  const existingMember = this.assignedMembers.find(
    (m) => m.memberId.toString() === memberId.toString() && m.status === 'active'
  );

  if (existingMember) {
    throw new Error('Member is already assigned to this trainer');
  }

  this.assignedMembers.push({
    memberId: memberId,
    assignedDate: new Date(),
    status: 'active',
  });

  return this.save();
};

/**
 * Method to unassign member from trainer
 * @param {String} memberId - Member ID to unassign
 */
trainerSchema.methods.unassignMember = function (memberId) {
  const member = this.assignedMembers.find(
    (m) => m.memberId.toString() === memberId.toString() && m.status === 'active'
  );

  if (member) {
    member.status = 'inactive';
  }

  return this.save();
};

/**
 * Method to get active members count
 * @returns {Number} - Count of active members
 */
trainerSchema.methods.getActiveMembersCount = function () {
  return this.assignedMembers.filter((m) => m.status === 'active').length;
};

/**
 * Method to update availability
 * @param {String} day - Day of week (monday, tuesday, etc.)
 * @param {Boolean} isAvailable - Availability status
 * @param {Array} slots - Time slots
 */
trainerSchema.methods.updateAvailability = function (day, isAvailable, slots = []) {
  if (this.availability[day]) {
    this.availability[day].isAvailable = isAvailable;
    this.availability[day].slots = slots;
  }
  return this.save();
};

/**
 * Method to add certification
 * @param {Object} certification - Certification details
 */
trainerSchema.methods.addCertification = function (certification) {
  this.certifications.push(certification);
  return this.save();
};

/**
 * Method to update rating
 * @param {Number} newRating - New rating value (1-5)
 */
trainerSchema.methods.updateRating = function (newRating) {
  const totalRating = this.rating.average * this.rating.count + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

/**
 * Static method to find trainer by email with password
 * @param {string} email - Email to search for
 * @returns {Promise<Object>} - Trainer document with password
 */
trainerSchema.statics.findByEmail = function (email) {
  return this.findOne({ email }).select('+password');
};

/**
 * Static method to get trainers by branch
 * @param {String} branchId - Branch ID
 * @returns {Promise<Array>} - Array of trainers
 */
trainerSchema.statics.getByBranch = function (branchId) {
  return this.find({ assignedBranch: branchId, isActive: true })
    .populate('assignedBranch', 'branchName branchCode')
    .populate('assignedMembers.memberId', 'fullName email phone');
};

/**
 * Static method to get available trainers
 * @param {String} day - Day of week
 * @returns {Promise<Array>} - Array of available trainers
 */
trainerSchema.statics.getAvailableTrainers = function (day) {
  const query = {
    isActive: true,
    trainerStatus: 'active',
  };
  
  if (day) {
    query[`availability.${day}.isAvailable`] = true;
  }
  
  return this.find(query)
    .populate('assignedBranch', 'branchName branchCode');
};

const Trainer = mongoose.model('Trainer', trainerSchema);

module.exports = Trainer;
