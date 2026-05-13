const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Class = require('../models/Class');

// Get all categories
exports.getAllCategories = asyncHandler(async (req, res) => {
  const { status } = req.query;

  let query = {};
  if (status) query.status = status;

  const categories = await Category.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  // Add class count for each category
  const categoriesWithCount = await Promise.all(
    categories.map(async (category) => {
      const classCount = await Class.countDocuments({ category: category._id, status: 'active' });
      return {
        ...category.toObject(),
        classCount,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: categoriesWithCount,
    message: 'Categories retrieved successfully',
  });
});

// Get single category by ID
exports.getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id).populate('createdBy', 'name email');

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }

  // Get classes in this category
  const classes = await Class.find({ category: id, status: 'active' })
    .populate('trainer', 'name email phone')
    .sort({ createdAt: -1 });

  const classCount = classes.length;

  res.status(200).json({
    success: true,
    data: {
      ...category.toObject(),
      classCount,
      classes,
    },
    message: 'Category retrieved successfully',
  });
});

// Create new category
exports.createCategory = asyncHandler(async (req, res) => {
  const { categoryName, description, icon, color } = req.body;

  // Validate required fields
  if (!categoryName) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: [{ field: 'categoryName', message: 'Category name is required' }],
    });
  }

  // Check if category already exists
  const existingCategory = await Category.findOne({ categoryName });
  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: 'Category with this name already exists',
    });
  }

  const newCategory = await Category.create({
    categoryName,
    description,
    icon,
    color: color || '#000000',
    createdBy: req.user._id,
  });

  const populatedCategory = await Category.findById(newCategory._id).populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    data: populatedCategory,
    message: 'Category created successfully',
  });
});

// Update category
exports.updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { categoryName, description, icon, color, status } = req.body;

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }

  // Check if new category name already exists (excluding current)
  if (categoryName && categoryName !== category.categoryName) {
    const existingCategory = await Category.findOne({ categoryName });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists',
      });
    }
  }

  // Update fields
  if (categoryName) category.categoryName = categoryName;
  if (description) category.description = description;
  if (icon) category.icon = icon;
  if (color) category.color = color;
  if (status) category.status = status;

  await category.save();

  const updatedCategory = await Category.findById(id).populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    data: updatedCategory,
    message: 'Category updated successfully',
  });
});

// Delete category
exports.deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }

  // Check if category has active classes
  const activeClasses = await Class.findOne({ category: id, status: 'active' });

  if (activeClasses) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete category with active classes',
    });
  }

  await Category.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
  });
});

// Get category statistics
exports.getCategoryStats = asyncHandler(async (req, res) => {
  const categories = await Category.find({ status: 'active' });

  const stats = await Promise.all(
    categories.map(async (category) => {
      const classCount = await Class.countDocuments({ category: category._id, status: 'active' });
      return {
        categoryId: category._id,
        categoryName: category.categoryName,
        classCount,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: stats,
    message: 'Category statistics retrieved successfully',
  });
});
