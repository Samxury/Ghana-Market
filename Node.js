// server.js - Main server file
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ghana-market';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        region: String,
        country: { type: String, default: 'Ghana' }
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Product Schema
const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'GHS'
    },
    category: {
        type: String,
        required: true,
        enum: ['Electronics', 'Fashion', 'Home & Living', 'Automotive', 'Books', 'Sports', 'Beauty', 'Food']
    },
    subcategory: String,
    image: {
        type: String,
        required: true
    },
    images: [String], // Additional images
    inStock: {
        type: Boolean,
        default: true
    },
    quantity: {
        type: Number,
        default: 1,
        min: 0
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    ratings: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    },
    tags: [String],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Cart Schema
const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Order Schema
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        title: String // Store product title at time of order
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash_on_delivery', 'mobile_money'],
        default: 'cash_on_delivery'
    },
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        region: { type: String, required: true },
        phone: { type: String, required: true }
    },
    notes: String,
    trackingNumber: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);

// Middleware for authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Middleware for admin authentication
const requireAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ========== AUTH ROUTES ==========

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = new User({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// ========== PRODUCT ROUTES ==========

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const { 
            category, 
            search, 
            minPrice, 
            maxPrice, 
            featured, 
            page = 1, 
            limit = 12,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query
        let query = { inStock: true };

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        if (featured === 'true') {
            query.featured = true;
        }

        // Sort options
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const products = await Product.find(query)
            .populate('seller', 'firstName lastName')
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit));

        const total = await Product.countDocuments(query);

        res.json({
            products,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                totalProducts: total,
                hasNext: skip + products.length < total,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('seller', 'firstName lastName email phone');
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Create product (authenticated users only)
app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const {
            title,
            description,
            price,
            category,
            subcategory,
            image,
            images,
            quantity,
            tags
        } = req.body;

        const product = new Product({
            title,
            description,
            price,
            category,
            subcategory,
            image,
            images,
            quantity,
            tags,
            seller: req.user.userId
        });

        await product.save();
        await product.populate('seller', 'firstName lastName');

        res.status(201).json({
            message: 'Product created successfully',
            product
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Update product (seller or admin only)
app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if user is the seller or admin
        if (product.seller.toString() !== req.user.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to update this product' });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        ).populate('seller', 'firstName lastName');

        res.json({
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product (seller or admin only)
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if user is the seller or admin
        if (product.seller.toString() !== req.user.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to delete this product' });
        }

        await Product.findByIdAndDelete(req.params.id);

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Get categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Product.distinct('category');
        const categoryStats = await Product.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            categories,
            stats: categoryStats
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// ========== CART ROUTES ==========

// Get user's cart
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.userId })
            .populate('items.product');

        if (!cart) {
            cart = new Cart({ user: req.user.userId, items: [] });
            await cart.save();
        }

        res.json(cart);
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// Add item to cart
app.post('/api/cart/add', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (!product.inStock || product.quantity < quantity) {
            return res.status(400).json({ error: 'Product not available in requested quantity' });
        }

        let cart = await Cart.findOne({ user: req.user.userId });
        
        if (!cart) {
            cart = new Cart({ user: req.user.userId, items: [] });
        }

        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (existingItemIndex > -1) {
            // Update quantity
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                quantity,
                price: product.price
            });
        }

        // Calculate total
        cart.totalAmount = cart.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        cart.updatedAt = Date.now();
        await cart.save();
        await cart.populate('items.product');

        res.json({
            message: 'Item added to cart',
            cart
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// Update cart item quantity
app.put('/api/cart/update', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (quantity <= 0) {
            return res.status(400).json({ error: 'Quantity must be greater than 0' });
        }

        const cart = await Cart.findOne({ user: req.user.userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        cart.items[itemIndex].quantity = quantity;

        // Recalculate total
        cart.totalAmount = cart.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        cart.updatedAt = Date.now();
        await cart.save();
        await cart.populate('items.product');

        res.json({
            message: 'Cart updated successfully',
            cart
        });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// Remove item from cart
app.delete('/api/cart/remove/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: req.user.userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        cart.items = cart.items.filter(
            item => item.product.toString() !== productId
        );

        // Recalculate total
        cart.totalAmount = cart.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        cart.updatedAt = Date.now();
        await cart.save();
        await cart.populate('items.product');

        res.json({
            message: 'Item removed from cart',
            cart
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});

// Clear cart
app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
    try {
        await Cart.findOneAndUpdate(
            { user: req.user.userId },
            { items: [], totalAmount: 0, updatedAt: Date.now() }
        );

        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

// ========== ORDER ROUTES ==========

// Create order from cart
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { shippingAddress, paymentMethod = 'cash_on_delivery', notes } = req.body;

        const cart = await Cart.findOne({ user: req.user.userId })
            .populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Verify product availability
        for (const item of cart.items) {
            if (!item.product.inStock || item.product.quantity < item.quantity) {
                return res.status(400).json({ 
                    error: `${item.product.title} is not available in requested quantity` 
                });
            }
        }

        // Create order
        const order = new Order({
            user: req.user.userId,
            items: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.price,
                title: item.product.title
            })),
            totalAmount: cart.totalAmount,
            paymentMethod,
            shippingAddress,
            notes,
            trackingNumber: generateTrackingNumber()
        });

        await order.save();

        // Update product quantities
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(
                item.product._id,
                { $inc: { quantity: -item.quantity } }
            );
        }

        // Clear cart
        await Cart.findOneAndUpdate(
            { user: req.user.userId },
            { items: [], totalAmount: 0, updatedAt: Date.now() }
        );

        await order.populate('items.product user');

        res.status(201).json({
            message: 'Order created successfully',
            order
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Get user's orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const orders = await Order.find({ user: req.user.userId })
            .populate('items.product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments({ user: req.user.userId });

        res.json({
            orders,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                totalOrders: total
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get single order
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product user');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if user owns the order or is admin
        if (order.user._id.toString() !== req.user.userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to view this order' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Update order status (admin only)
app.put('/api/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() },
            { new: true }
        ).populate('items.product user');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// ========== USER ROUTES ==========

// Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password; // Don't allow password updates through this route

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updates,
            { new: true }
        ).select('-password');

        res.json({
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
app.put('/api/users/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await User.findByIdAndUpdate(req.user.userId, { password: hashedPassword });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ========== ADMIN ROUTES ==========

// Get all orders (admin only)
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (status) {
            query.status = status;
        }

        const orders = await Order.find(query)
            .populate('user', 'firstName lastName email')
            .populate('items.product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                totalOrders: total
            }
        });
    } catch (error) {
        console.error('Get admin orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await User.countDocuments();

        res.json({
            users,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                totalUsers: total
            }
        });
    } catch (error) {
        console.error('Get admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Dashboard stats (admin only)
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        
        const revenueData = await Order.aggregate([
            { $match: { status: { $in: ['delivered', 'confirmed'] } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

        const recentOrders = await Order.find()
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            stats: {
                totalUsers,
                totalProducts,
                totalOrders,
                totalRevenue
            },
            recentOrders
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

// ========== UTILITY FUNCTIONS ==========

// Generate tracking number
function generateTrackingNumber() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GM${timestamp.slice(-6)}${random}`;
}

// ========== SEED DATA ==========

// Initialize database with sample data
async function seedDatabase() {
    try {
        // Check if products already exist
        const existingProducts = await Product.countDocuments();
        if (existingProducts > 0) {
            console.log('Database already seeded with products');
            return;
        }

        // Create admin user
        const adminExists = await User.findOne({ email: 'admin@ghanamarket.com' });
        let adminUser;
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            adminUser = new User({
                email: 'admin@ghanamarket.com',
                password: hashedPassword,
                firstName: 'Admin',
                lastName: 'User',
                isAdmin: true
            });
            await adminUser.save();
            console.log('Admin user created: admin@ghanamarket.com / admin123');
        } else {
            adminUser = adminExists;
        }

        // Sample products data
        const sampleProducts = [
            {
                title: "Wireless Bluetooth Headphones",
                description: "High-quality wireless headphones with noise cancellation and 20-hour battery life. Perfect for music lovers and professionals.",
                price: 120,
                category: "Electronics",
                image: "headphones",
                quantity: 25,
                featured: true,
                tags: ["wireless", "bluetooth", "audio", "headphones"],
                seller: adminUser._id
            },
            {
                title: "Men's Casual T-Shirt",
                description: "Comfortable 100% cotton t-shirt available in multiple colors. Perfect for everyday wear.",
                price: 45,
                category: "Fashion",
                image: "tshirt",
                quantity: 50,
                tags: ["cotton", "casual", "men", "clothing"],
                seller: adminUser._id
            },
            {
                title: "Smartphone X Pro",
                description: "Latest smartphone with 128GB storage, dual camera, and fast charging. Unlocked for all networks.",
                price: 980,
                category: "Electronics",
                image: "smartphone",
                quantity: 15,
                featured: true,
                tags: ["smartphone", "mobile", "android", "camera"],
                seller: adminUser._id
            },
            {
                title: "Home Blender 2000",
                description: "Powerful 1000W blender perfect for smoothies, soups, and food processing. Easy to clean and durable.",
                price: 85,
                category: "Home & Living",
                image: "blender",
                quantity: 20,
                tags: ["blender", "kitchen", "appliance", "smoothie"],
                seller: adminUser._id
            },
            {
                title: "Women's Running Shoes",
                description: "Lightweight running shoes with excellent cushioning and breathable material. Available in sizes 36-42.",
                price: 110,
                category: "Fashion",
                image: "shoe",
                quantity: 30,
                tags: ["shoes", "running", "women", "sports"],
                seller: adminUser._id
            },
            {
                title: "Car Phone Holder",
                description: "Universal car phone holder with 360-degree rotation. Compatible with all phone sizes.",
                price: 35,
                category: "Automotive",
                image: "mobile-alt",
                quantity: 40,
                tags: ["car", "phone", "holder", "automotive"],
                seller: adminUser._id
            },
            {
                title: "Wireless Keyboard",
                description: "Slim wireless keyboard with backlight and long battery life. Perfect for office and home use.",
                price: 65,
                category: "Electronics",
                image: "keyboard",
                quantity: 20,
                tags: ["keyboard", "wireless", "office", "computer"],
                seller: adminUser._id
            },
            {
                title: "Women's Handbag",
                description: "Elegant leather handbag with multiple compartments. Perfect for work and casual outings.",
                price: 75,
                category: "Fashion",
                image: "handbag",
                quantity: 15,
                tags: ["handbag", "leather", "women", "accessories"],
                seller: adminUser._id
            },
            {
                title: "LED Desk Lamp",
                description: "Adjustable LED desk lamp with USB charging port and touch controls. Energy efficient.",
                price: 55,
                category: "Home & Living",
                image: "lightbulb",
                quantity: 25,
                tags: ["lamp", "led", "desk", "lighting"],
                seller: adminUser._id
            },
            {
                title: "Bluetooth Speaker",
                description: "Portable Bluetooth speaker with excellent sound quality and 12-hour battery life. Waterproof design.",
                price: 90,
                category: "Electronics",
                image: "volume-up",
                quantity: 18,
                featured: true,
                tags: ["speaker", "bluetooth", "portable", "waterproof"],
                seller: adminUser._id
            }
        ];

        // Insert sample products
        await Product.insertMany(sampleProducts);
        console.log('Sample products seeded successfully');

    } catch (error) {
        console.error('Seed database error:', error);
    }
}

// ========== ERROR HANDLING ==========

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
    try {
        await mongoose.connection.once('open', () => {
            console.log('MongoDB connected successfully');
        });
        
        // Seed database with sample data
        await seedDatabase();
        
        app.listen(PORT, () => {
            console.log(`🚀 Ghana Market Backend running on port ${PORT}`);
            console.log(`📱 Frontend should be served from: http://localhost:${PORT}`);
            console.log(`🔧 API Base URL: http://localhost:${PORT}/api`);
            console.log(`👤 Admin login: admin@ghanamarket.com / admin123`);
        });
    } catch (error) {
        console.error('Server startup error:', error);
        process.exit(1);
    }
}

startServer();