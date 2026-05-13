const mongoose = require('mongoose');

/**
 * Branch Schema
 * Defines the structure for gym branch locations
 */
const branchSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      minlength: [2, 'Branch name must be at least 2 characters'],
      maxlength: [255, 'Branch name cannot exceed 255 characters'],
    },
    branchCode: {
      type: String,
      required: [true, 'Branch code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]+$/, 'Branch code can only contain uppercase letters, numbers, and hyphens'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode/Zipcode is required'],
      match: [/^[0-9]{5,6}$/, 'Please provide a valid 5-6 digit pincode/zipcode'],
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit contact number'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    branchManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    assignedTrainers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    totalMembers: {
      type: Number,
      default: 0,
      min: [0, 'Total members cannot be negative'],
    },
    capacity: {
      type: Number,
      default: 500,
      min: [1, 'Capacity must be at least 1'],
    },
    openingTime: {
      type: String,
      required: [true, 'Opening time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format'],
    },
    closingTime: {
      type: String,
      required: [true, 'Closing time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format'],
    },
    facilities: [
      {
        type: String,
        trim: true,
      },
    ],
    branchStatus: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'under-maintenance'],
        message: 'Status must be active, inactive, or under-maintenance',
      },
      default: 'active',
    },
    description: {
      type: String,
      default: null,
    },
    images: [
      {
        type: String,
      },
    ],
    coordinates: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Indexes for faster queries
branchSchema.index({ branchCode: 1 });
branchSchema.index({ city: 1 });
branchSchema.index({ branchStatus: 1 });
branchSchema.index({ branchManager: 1 });

/**
 * Method to get public branch profile
 * @returns {Object} - Public branch data
 */
branchSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    branchName: this.branchName,
    branchCode: this.branchCode,
    address: this.address,
    city: this.city,
    state: this.state,
    pincode: this.pincode,
    contactNumber: this.contactNumber,
    email: this.email,
    branchManager: this.branchManager,
    assignedAdmins: this.assignedAdmins,
    assignedTrainers: this.assignedTrainers,
    totalMembers: this.totalMembers,
    capacity: this.capacity,
    openingTime: this.openingTime,
    closingTime: this.closingTime,
    facilities: this.facilities,
    branchStatus: this.branchStatus,
    description: this.description,
    images: this.images,
    coordinates: this.coordinates,
    isActive: this.isActive,
    occupancyRate: this.capacity > 0 ? ((this.totalMembers / this.capacity) * 100).toFixed(2) : 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Method to calculate occupancy rate
 * @returns {number} - Occupancy percentage
 */
branchSchema.methods.getOccupancyRate = function () {
  if (this.capacity === 0) return 0;
  return ((this.totalMembers / this.capacity) * 100).toFixed(2);
};

/**
 * Method to check if branch is at capacity
 * @returns {boolean} - True if at or over capacity
 */
branchSchema.methods.isAtCapacity = function () {
  return this.totalMembers >= this.capacity;
};

/**
 * Static method to find branch by code
 * @param {string} code - Branch code to search for
 * @returns {Promise<Object>} - Branch document
 */
branchSchema.statics.findByCode = function (code) {
  return this.findOne({ branchCode: code.toUpperCase() });
};

/**
 * Static method to get branches by city
 * @param {string} city - City name
 * @returns {Promise<Array>} - Array of branch documents
 */
branchSchema.statics.findByCity = function (city) {
  return this.find({ city: new RegExp(city, 'i') });
};

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
