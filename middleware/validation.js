// middleware/validation.js
const validator = require('validator');

// Validation middleware for user registration
const validateRegistration = (req, res, next) => {
    const { email, password, firstName, lastName } = req.body;
    const errors = [];

    // Email validation
    if (!email || !validator.isEmail(email)) {
        errors.push('Valid email is required');
    }

    // Password validation
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    // Name validation
    if (!firstName || firstName.trim().length < 2) {
        errors.push('First name must be at least 2 characters long');
    }

    if (!lastName || lastName.trim().length < 2) {
        errors.push('Last name must be at least 2 characters long');
    }

    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: errors 
        });
    }

    next();
};

// Validation middleware for login
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email || !validator.isEmail(email)) {
        errors.push('Valid email is required');
    }

    if (!password) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: errors 
        });
    }

    next();
};

// Validation middleware for product creation
const validateProduct = (req, res, next) => {
    const { title, description, price, category, image } = req.body;
    const errors = [];

    if (!title || title.trim().length < 3) {
        errors.push('Product title must be at least 3 characters long');
    }

    if (!description || description.trim().length < 10) {
        errors.push('Product description must be at least 10 characters long');
    }

    if (!price || price <= 0) {
        errors.push('Price must be a positive number');
    }

    if (!category) {
        errors.push('Category is required');
    }

    if (!image) {
        errors.push('Product image is required');
    }

    const validCategories = ['Electronics', 'Fashion', 'Home & Living', 'Automotive', 'Books', 'Sports', 'Beauty', 'Food'];
    if (category && !validCategories.includes(category)) {
        errors.push('Invalid category selected');
    }

    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: errors 
        });
    }

    next();
};

// Validation middleware for cart operations
const validateCartItem = (req, res, next) => {
    const { productId, quantity } = req.body;
    const errors = [];

    if (!productId || !validator.isMongoId(productId)) {
        errors.push('Valid product ID is required');
    }

    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1)) {
        errors.push('Quantity must be a positive integer');
    }

    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: errors 
        });
    }

    next();
};

// Validation middleware for order creation
const validateOrder = (req, res, next) => {
    const { shippingAddress, paymentMethod } = req.body;
    const errors = [];

    if (!shippingAddress) {
        errors.push('Shipping address is required');
    } else {
        if (!shippingAddress.street || shippingAddress.street.trim().length < 5) {
            errors.push('Street address must be at least 5 characters long');
        }

        if (!shippingAddress.city || shippingAddress.city.trim().length < 2) {
            errors.push('City is required');
        }

        if (!shippingAddress.region) {
            errors.push('Region is required');
        }

        if (!shippingAddress.phone || !validator.isMobilePhone(shippingAddress.phone, 'any')) {
            errors.push('Valid phone number is required');
        }
    }

    const validPaymentMethods = ['cash_on_delivery', 'mobile_money'];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
        errors.push('Invalid payment method');
    }

    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: errors 
        });
    }

    next();
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
    // Trim whitespace from string fields
    Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
            req.body[key] = req.body[key].trim();
        }
    });

    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateProduct,
    validateCartItem,
    validateOrder,
    sanitizeInput
};