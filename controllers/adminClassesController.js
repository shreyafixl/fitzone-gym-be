const asyncHandler = require('express-async-handler');
const Class = require('../models/Class');
const Schedule = require('../models/Schedule');
const Category = require('../models/Category');

// Get all classes with pagination, filtering, and search
exports.getAllClasses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, trainer, status, search } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (category) query.category = category;
  if (trainer) query.trainer = trainer;
  if (status) query.status = status;
  if (search) {
    query.$text = { $search: search };
  }

  const total = await Class.countDocuments(query);
  const classes = await Class.find(query)
    .populate('category', 'categoryName color')
    .populate('trainer', 'name email phone')
    .populate('createdBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: classes,
    message: 'Classes retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single class by ID
exports.getClassById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classData = await Class.findById(id)
    .populate('category', 'categoryName color description')
    .populate('trainer', 'name email phone')
    .populate('createdBy', 'name email');

  if (!classData) {
    return res.status(404).json({
      success: false,
      message: 'Class not found',
    });
  }

  // Get schedules for this class
  const schedules = await Schedule.find({ classId: id })
    .populate('bookedMembers', 'name email phone')
    .sort({ date: 1 });

  res.status(200).json({
    success: true,
    data: {
      ...classData.toObject(),
      schedules,
    },
    message: 'Class retrieved successfully',
  });
});

// Create new class
exports.createClass = asyncHandler(async (req, res) => {
  const { className, category, trainer, duration, capacity, difficultyLevel, description, price, image } = req.body;

  // Validate required fields
  if (!className || !category || !trainer || !duration || !capacity || !difficultyLevel || price === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: [
        { field: 'className', message: 'Class name is required' },
        { field: 'category', message: 'Category is required' },
        { field: 'trainer', message: 'Trainer is required' },
        { field: 'duration', message: 'Duration is required' },
        { field: 'capacity', message: 'Capacity is required' },
        { field: 'difficultyLevel', message: 'Difficulty level is required' },
        { field: 'price', message: 'Price is required' },
      ],
    });
  }

  // Check if category exists
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category',
    });
  }

  const newClass = await Class.create({
    className,
    category,
    trainer,
    duration,
    capacity,
    difficultyLevel,
    description,
    price,
    image,
    createdBy: req.user._id,
  });

  const populatedClass = await newClass.populate('category', 'categoryName color').populate('trainer', 'name email phone');

  res.status(201).json({
    success: true,
    data: populatedClass,
    message: 'Class created successfully',
  });
});

// Update class
exports.updateClass = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { className, category, trainer, duration, capacity, difficultyLevel, description, price, status, image } = req.body;

  const classData = await Class.findById(id);
  if (!classData) {
    return res.status(404).json({
      success: false,
      message: 'Class not found',
    });
  }

  // Check if category exists if being updated
  if (category && category !== classData.category.toString()) {
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
      });
    }
  }

  // Update fields
  if (className) classData.className = className;
  if (category) classData.category = category;
  if (trainer) classData.trainer = trainer;
  if (duration) classData.duration = duration;
  if (capacity) classData.capacity = capacity;
  if (difficultyLevel) classData.difficultyLevel = difficultyLevel;
  if (description) classData.description = description;
  if (price !== undefined) classData.price = price;
  if (status) classData.status = status;
  if (image) classData.image = image;

  await classData.save();

  const updatedClass = await Class.findById(id)
    .populate('category', 'categoryName color')
    .populate('trainer', 'name email phone');

  res.status(200).json({
    success: true,
    data: updatedClass,
    message: 'Class updated successfully',
  });
});

// Delete class
exports.deleteClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classData = await Class.findById(id);
  if (!classData) {
    return res.status(404).json({
      success: false,
      message: 'Class not found',
    });
  }

  // Check if class has active schedules
  const activeSchedules = await Schedule.findOne({
    classId: id,
    sessionStatus: { $in: ['scheduled', 'in-progress'] },
  });

  if (activeSchedules) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete class with active schedules',
    });
  }

  await Class.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Class deleted successfully',
  });
});

// Get classes by category
exports.getClassesByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const total = await Class.countDocuments({ category: categoryId, status: 'active' });
  const classes = await Class.find({ category: categoryId, status: 'active' })
    .populate('trainer', 'name email phone')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: classes,
    message: 'Classes retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get classes by trainer
exports.getClassesByTrainer = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const total = await Class.countDocuments({ trainer: trainerId, status: 'active' });
  const classes = await Class.find({ trainer: trainerId, status: 'active' })
    .populate('category', 'categoryName color')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: classes,
    message: 'Classes retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});
