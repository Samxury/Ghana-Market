// Sample product data
const products = [
    {
        id: 1,
        title: "Wireless Bluetooth Headphones",
        price: "₵120.00",
        category: "Electronics",
        image: "headphones"
    },
    {
        id: 2,
        title: "Men's Casual T-Shirt",
        price: "₵45.00",
        category: "Fashion",
        image: "tshirt"
    },
    {
        id: 3,
        title: "Smartphone X Pro",
        price: "₵980.00",
        category: "Electronics",
        image: "smartphone"
    },
    {
        id: 4,
        title: "Home Blender 2000",
        price: "₵85.00",
        category: "Home & Living",
        image: "blender"
    },
    {
        id: 5,
        title: "Women's Running Shoes",
        price: "₵110.00",
        category: "Fashion",
        image: "shoes"
    },
    {
        id: 6,
        title: "Car Phone Holder",
        price: "₵35.00",
        category: "Automotive",
        image: "phone-holder"
    }
];

// DOM Elements
const productGrid = document.getElementById('product-grid');
const cartIcon = document.getElementById('cart-icon');
const cartCount = document.querySelector('.cart-count');
const menuIcon = document.getElementById('menu-icon');
const mobileNav = document.getElementById('mobile-nav');
const userIcon = document.getElementById('user-icon');
const authModal = document.getElementById('auth-modal');
const closeModal = document.querySelector('.close');
const authForm = document.getElementById('auth-form');
const authSwitch = document.getElementById('switch-auth');
const searchInput = document.getElementById('search-input');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
const mobileThemeText = document.querySelector('#mobile-theme-toggle span');

// Cart state
let cart = [];
let cartItemsCount = 0;

// Theme state
let currentTheme = 'dark'; // Default theme

// Initialize the app
function init() {
    loadThemePreference();
    renderProducts();
    setupEventListeners();
    updateThemeIcon();
}

// Load theme preference from localStorage
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', currentTheme);
    }
}

// Toggle between dark and light themes
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

// Update theme icon based on current theme
function updateThemeIcon() {
    if (currentTheme === 'dark') {
        themeIcon.className = 'fas fa-moon';
        mobileThemeText.textContent = 'Dark Mode';
    } else {
        themeIcon.className = 'fas fa-sun';
        mobileThemeText.textContent = 'Light Mode';
    }
}

// Render products to the grid
function renderProducts() {
    productGrid.innerHTML = '';
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                <i class="fas fa-${product.image}"></i>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-price">${product.price}</p>
                <div class="product-actions">
                    <button class="btn btn-outline">Details</button>
                    <button class="btn btn-primary" data-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        `;
        productGrid.appendChild(productCard);
    });
    
    // Add event listeners to Add to Cart buttons
    const addToCartButtons = document.querySelectorAll('.btn-primary');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            addToCart(productId);
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    mobileThemeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
    });
    
    // Mobile menu toggle
    menuIcon.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
    });
    
    // User icon click - show auth modal
    userIcon.addEventListener('click', () => {
        authModal.classList.add('active');
    });
    
    // Close modal
    closeModal.addEventListener('click', () => {
        authModal.classList.remove('active');
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.classList.remove('active');
        }
    });
    
    // Auth form submission
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Here you would typically handle authentication
        alert('Authentication would be handled here with Supabase');
        authModal.classList.remove('active');
    });
    
    // Switch between login and register
    authSwitch.addEventListener('click', (e) => {
        e.preventDefault();
        const formTitle = document.querySelector('#auth-modal h2');
        const submitButton = document.querySelector('#auth-modal button');
        const switchText = document.querySelector('.auth-switch');
        
        if (formTitle.textContent === 'Login / Register') {
            formTitle.textContent = 'Create Account';
            submitButton.textContent = 'Register';
            switchText.innerHTML = 'Already have an account? <a href="#" id="switch-auth">Login</a>';
        } else {
            formTitle.textContent = 'Login / Register';
            submitButton.textContent = 'Continue';
            switchText.innerHTML = 'Don\'t have an account? <a href="#" id="switch-auth">Register</a>';
        }
        
        // Re-attach event listener to the new link
        document.getElementById('switch-auth').addEventListener('click', authSwitch.click);
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = products.filter(product => 
            product.title.toLowerCase().includes(searchTerm) || 
            product.category.toLowerCase().includes(searchTerm)
        );
        
        // Re-render filtered products
        productGrid.innerHTML = '';
        if (filteredProducts.length > 0) {
            filteredProducts.forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.innerHTML = `
                    <div class="product-image">
                        <i class="fas fa-${product.image}"></i>
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.title}</h3>
                        <p class="product-price">${product.price}</p>
                        <div class="product-actions">
                            <button class="btn btn-outline">Details</button>
                            <button class="btn btn-primary" data-id="${product.id}">Add to Cart</button>
                        </div>
                    </div>
                `;
                productGrid.appendChild(productCard);
            });
            
            // Add event listeners to new Add to Cart buttons
            const addToCartButtons = document.querySelectorAll('.btn-primary');
            addToCartButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = parseInt(e.target.getAttribute('data-id'));
                    addToCart(productId);
                });
            });
        } else {
            productGrid.innerHTML = '<p class="no-results">No products found. Try a different search term.</p>';
        }
    });
}

// Add product to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        cart.push(product);
        cartItemsCount++;
        cartCount.textContent = cartItemsCount;
        
        // Show feedback to user
        const feedback = document.createElement('div');
        feedback.className = 'cart-feedback';
        feedback.textContent = `${product.title} added to cart!`;
        feedback.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 400;
        `;
        document.body.appendChild(feedback);
        
        // Remove feedback after 3 seconds
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);