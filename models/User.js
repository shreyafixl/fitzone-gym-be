const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Defines the structure for gym members, trainers, and staff
 */
const userSchema = new mongoose.Schema(
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
      trim: true,
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
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [13, 'Age must be at least 13'],
      max: [120, 'Age must be less than 120'],
    },
    height: {
      type: Number,
      min: [50, 'Height must be at least 50 cm'],
      max: [300, 'Height must be less than 300 cm'],
      default: null,
    },
    weight: {
      type: Number,
      min: [20, 'Weight must be at least 20 kg'],
      max: [500, 'Weight must be less than 500 kg'],
      default: null,
    },
    fitnessGoal: {
      type: String,
      enum: {
        values: ['weight-loss', 'muscle-gain', 'fitness', 'strength', 'endurance', 'flexibility', 'general-health', 'none'],
        message: 'Invalid fitness goal',
      },
      default: 'none',
    },
    membershipPlan: {
      type: String,
      enum: {
        values: ['monthly', 'quarterly', 'half-yearly', 'yearly', 'none'],
        message: 'Invalid membership plan',
      },
      default: 'none',
    },
    membershipStatus: {
      type: String,
      enum: {
        values: ['active', 'expired', 'pending'],
        message: 'Status must be active, expired, or pending',
      },
      default: 'pending',
    },
    membershipStartDate: {
      type: Date,
      default: null,
    },
    membershipEndDate: {
      type: Date,
      default: null,
    },
    assignedTrainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    role: {
      type: String,
      enum: ['member', 'trainer', 'staff'],
      default: 'member',
    },
    attendance: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        checkIn: {
          type: Date,
          required: true,
        },
        checkOut: {
          type: Date,
          default: null,
        },
      },
    ],
    profileImage: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      default: null,
    },
    emergencyContact: {
      name: {
        type: String,
        default: null,
      },
      phone: {
        type: String,
        default: null,
      },
      relationship: {
        type: String,
        default: null,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    joinDate: {
      type: Date,
      default: Date.now,
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
userSchema.index({ email: 1 });
userSchema.index({ membershipStatus: 1 });
userSchema.index({ role: 1 });
userSchema.index({ assignedTrainer: 1 });

/**
 * Pre-save middleware to hash password before saving
 * Only hashes if password is modified or new
 */
userSchema.pre('save', async function (next) {
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
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Method to get public profile (without sensitive data)
 * @returns {Object} - Public profile data
 */
userSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    gender: this.gender,
    age: this.age,
    membershipPlan: this.membershipPlan,
    membershipStatus: this.membershipStatus,
    membershipStartDate: this.membershipStartDate,
    membershipEndDate: this.membershipEndDate,
    assignedTrainer: this.assignedTrainer,
    role: this.role,
    profileImage: this.profileImage,
    address: this.address,
    emergencyContact: this.emergencyContact,
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
 */
userSchema.methods.addAttendance = function (checkIn, checkOut = null) {
  this.attendance.push({
    date: new Date(),
    checkIn: checkIn,
    checkOut: checkOut,
  });
  return this.save();
};

/**
 * Method to calculate membership days remaining
 * @returns {number} - Days remaining in membership
 */
userSchema.methods.getMembershipDaysRemaining = function () {
  if (!this.membershipEndDate) return 0;
  
  const today = new Date();
  const endDate = new Date(this.membershipEndDate);
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};

/**
 * Static method to find user by email with password
 * @param {string} email - Email to search for
 * @returns {Promise<Object>} - User document with password
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email }).select('+password');
};

const User = mongoose.model('User', userSchema);

module.exports = User;
