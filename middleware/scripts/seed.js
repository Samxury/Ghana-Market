// scripts/seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models (you would need to separate these into model files)
const User = require('../models/User');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ghana-market';

// Sample users
const sampleUsers = [
    {
        email: 'admin@ghanamarket.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        phone: '+233200000000',
        isAdmin: true
    },
    {
        email: 'seller1@ghanamarket.com',
        password: 'seller123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+233200000001',
        address: {
            street: '123 Main Street',
            city: 'Accra',
            region: 'Greater Accra',
            country: 'Ghana'
        }
    },
    {
        email: 'buyer1@ghanamarket.com',
        password: 'buyer123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+233200000002',
        address: {
            street: '456 Oak Avenue',
            city: 'Kumasi',
            region: 'Ashanti',
            country: 'Ghana'
        }
    }
];

// Extended product list
const sampleProducts = [
    {
        title: "iPhone 15 Pro Max",
        description: "Latest iPhone with titanium design, A17 Pro chip, and professional camera system. Unlocked for all networks in Ghana.",
        price: 4500,
        category: "Electronics",
        subcategory: "Smartphones",
        image: "mobile-alt",
        images: ["iphone-1.jpg", "iphone-2.jpg"],
        quantity: 10,
        featured: true,
        tags: ["iphone", "apple", "smartphone", "premium"]
    },
    {
        title: "Samsung Galaxy S24 Ultra",
        description: "Flagship Android phone with S Pen, 200MP camera, and AI features. Perfect for productivity and creativity.",
        price: 4200,
        category: "Electronics",
        subcategory: "Smartphones",
        image: "mobile-alt",
        quantity: 8,
        featured: true,
        tags: ["samsung", "android", "s-pen", "camera"]
    },
    {
        title: "MacBook Air M3",
        description: "Ultra-thin laptop with M3 chip, 18-hour battery life, and stunning Retina display. Perfect for students and professionals.",
        price: 6800,
        category: "Electronics",
        subcategory: "Laptops",
        image: "laptop",
        quantity: 5,
        featured: true,
        tags: ["macbook", "apple", "laptop", "m3"]
    },
    {
        title: "Adidas Ultraboost 23",
        description: "Premium running shoes with responsive Boost cushioning and Primeknit upper. Available in multiple colors.",
        price: 180,
        category: "Fashion",
        subcategory: "Footwear",
        image: "shoe",
        quantity: 25,
        tags: ["adidas", "running", "boost", "shoes"]
    },
    {
        title: "Nike Air Jordan 1",
        description: "Classic basketball sneakers with premium leather construction. Iconic design that never goes out of style.",
        price: 220,
        category: "Fashion",
        subcategory: "Footwear",
        image: "shoe",
        quantity: 15,
        featured: true,
        tags: ["nike", "jordan", "basketball", "sneakers"]
    },
    {
        title: "Sony WH-1000XM5",
        description: "Industry-leading noise canceling headphones with 30-hour battery life and crystal-clear call quality.",
        price: 350,
        category: "Electronics",
        subcategory: "Audio",
        image: "headphones",
        quantity: 20,
        featured: true,
        tags: ["sony", "headphones", "noise-canceling", "wireless"]
    },
    {
        title: "Dyson V15 Detect",
        description: "Advanced cordless vacuum with laser dust detection and powerful suction. Perfect for deep cleaning.",
        price: 650,
        category: "Home & Living",
        subcategory: "Appliances",
        image: "home",
        quantity: 8,
        tags: ["dyson", "vacuum", "cordless", "cleaning"]
    },
    {
        title: "KitchenAid Stand Mixer",
        description: "Professional-grade stand mixer with multiple attachments. Essential for baking enthusiasts.",
        price: 420,
        category: "Home & Living",
        subcategory: "Kitchen",
        image: "blender",
        quantity: 12,
        tags: ["kitchenaid", "mixer", "baking", "kitchen"]
    },
    {
        title: "Tesla Model Y Accessories Kit",
        description: "Complete accessories kit including floor mats, phone holder, and charging cable organizer.",
        price: 180,
        category: "Automotive",
        subcategory: "Accessories",
        image: "car",
        quantity: 15,
        tags: ["tesla", "accessories", "car", "electric"]
    },
    {
        title: "Calvin Klein Men's Watch",
        description: "Elegant stainless steel watch with Swiss movement. Perfect for business and formal occasions.",
        price: 280,
        category: "Fashion",
        subcategory: "Accessories",
        image: "clock",
        quantity: 18,
        tags: ["calvin-klein", "watch", "men", "luxury"]
    },
    {
        title: "IKEA Hemnes Bed Frame",
        description: "Solid wood bed frame with storage drawers. Available in white and natural wood finish.",
        price: 320,
        category: "Home & Living",
        subcategory: "Furniture",
        image: "bed",
        quantity: 6,
        tags: ["ikea", "bed", "furniture", "storage"]
    },
    {
        title: "Levi's 501 Original Jeans",
        description: "Classic straight-leg jeans in authentic indigo denim. Timeless style that fits every wardrobe.",
        price: 85,
        category: "Fashion",
        subcategory: "Clothing",
        image: "tshirt",
        quantity: 30,
        tags: ["levis", "jeans", "denim", "classic"]
    },
    {
        title: "PlayStation 5 Console",
        description: "Next-gen gaming console with 4K gaming, ray tracing, and lightning-fast SSD. Includes DualSense controller.",
        price: 2200,
        category: "Electronics",
        subcategory: "Gaming",
        image: "gamepad",
        quantity: 4,
        featured: true,
        tags: ["playstation", "ps5", "gaming", "console"]
    },
    {
        title: "Canon EOS R6 Mark II",
        description: "Professional mirrorless camera with 24.2MP full-frame sensor and 4K video recording capabilities.",
        price: 3500,
        category: "Electronics",
        subcategory: "Cameras",
        image: "camera",
        quantity: 3,
        featured: true,
        tags: ["canon", "camera", "mirrorless", "professional"]
    },
    {
        title: "Zara Women's Blazer",
        description: "Professional blazer perfect for office wear. Available in navy, black, and beige colors.",
        price: 120,
        category: "Fashion",
        subcategory: "Clothing",
        image: "user-tie",
        quantity: 20,
        tags: ["zara", "blazer", "women", "professional"]
    }
];

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        
        // Connect to database
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        // Clear existing data (optional - remove in production)
        if (process.env.NODE_ENV === 'development') {
            await User.deleteMany({});
            await Product.deleteMany({});
            console.log('🗑️  Cleared existing data');
        }

        // Create users
        console.log('👤 Creating users...');
        const createdUsers = [];
        
        for (const userData of sampleUsers) {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            const user = new User({
                ...userData,
                password: hashedPassword
            });
            await user.save();
            createdUsers.push(user);
            console.log(`   ✓ Created user: ${user.email}`);
        }

        // Create products
        console.log('📦 Creating products...');
        const adminUser = createdUsers.find(user => user.isAdmin);
        const sellerUser = createdUsers.find(user => !user.isAdmin);
        
        for (let i = 0; i < sampleProducts.length; i++) {
            const productData = sampleProducts[i];
            const seller = i % 3 === 0 ? adminUser._id : sellerUser._id; // Mix between admin and seller
            
            const product = new Product({
                ...productData,
                seller: seller
            });
            await product.save();
            console.log(`   ✓ Created product: ${product.title}`);
        }

        console.log(`✅ Seeding completed successfully!`);
        console.log(`📊 Created ${createdUsers.length} users and ${sampleProducts.length} products`);
        console.log(`🔐 Admin login: admin@ghanamarket.com / admin123`);
        console.log(`👤 Test user: buyer1@ghanamarket.com / buyer123`);
        
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run seeding if this script is executed directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;