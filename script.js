// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Global state
let products = [];
let cart = [];
let cartItemsCount = 0;
let currentUser = null;
let authToken = null;
let currentTheme = 'dark';

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

// Initialize the app
function init() {
    loadThemePreference();
    loadAuthToken();
    loadProducts();
    loadCart();
    setupEventListeners();
    updateThemeIcon();
    updateUIBasedOnAuth();
}

// ========== AUTHENTICATION FUNCTIONS ==========

// Load auth token from localStorage
function loadAuthToken() {
    const token = localStorage.getItem('authToken');
    if (token) {
        authToken = token;
        fetchCurrentUser();
    }
}

// Fetch current user info
async function fetchCurrentUser() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            updateUIBasedOnAuth();
        } else {
            // Token invalid, remove it
            localStorage.removeItem('authToken');
            authToken = null;
        }
    } catch (error) {
        console.error('Failed to fetch current user:', error);
        localStorage.removeItem('authToken');
        authToken = null;
    }
}

// Update UI based on authentication status
function updateUIBasedOnAuth() {
    const userIcon = document.getElementById('user-icon');
    
    if (currentUser) {
        userIcon.innerHTML = `<i class="fas fa-user-circle"></i>`;
        userIcon.title = `${currentUser.firstName} ${currentUser.lastName}`;
    } else {
        userIcon.innerHTML = `<i class="fas fa-user"></i>`;
        userIcon.title = 'Login / Register';
    }
}

// Handle authentication form submission
async function handleAuth(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const email = formData.get('email') || event.target.querySelector('input[type="email"]').value;
    const password = formData.get('password') || event.target.querySelector('input[type="password"]').value;
    
    const formTitle = document.querySelector('#auth-modal h2').textContent;
    const isRegister = formTitle.includes('Create Account');
    
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const payload = { email, password };
    
    if (isRegister) {
        // For registration, we need additional fields
        payload.firstName = prompt('Enter your first name:') || 'User';
        payload.lastName = prompt('Enter your last name:') || 'Name';
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            
            authModal.classList.remove('active');
            updateUIBasedOnAuth();
            loadCart(); // Load user's cart
            
            showNotification(data.message, 'success');
        } else {
            showNotification(data.error || 'Authentication failed', 'error');
        }
    } catch (error) {
        console.error('Auth error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Logout
function logout() {
    authToken = null;
    currentUser = null;
    cart = [];
    cartItemsCount = 0;
    localStorage.removeItem('authToken');
    updateUIBasedOnAuth();
    updateCartCount();
    showNotification('Logged out successfully', 'success');
}

// ========== PRODUCT FUNCTIONS ==========

// Load products from API
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products?featured=true&limit=6`);
        const data = await response.json();
        
        if (response.ok) {
            products = data.products;
            renderProducts();
        } else {
            showNotification('Failed to load products', 'error');
            // Fallback to empty array
            products = [];
            renderProducts();
        }
    } catch (error) {
        console.error('Load products error:', error);
        showNotification('Network error loading products', 'error');
        products = [];
        renderProducts();
    }
}

// Search products
async function searchProducts(searchTerm) {
    try {
        const response = await fetch(`${API_BASE_URL}/products?search=${encodeURIComponent(searchTerm)}&limit=20`);
        const data = await response.json();
        
        if (response.ok) {
            products = data.products;
            renderProducts();
        } else {
            showNotification('Search failed', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Search network error', 'error');
    }
}

// Render products to the grid
function renderProducts() {
    productGrid.innerHTML = '';
    
    if (products.length === 0) {
        productGrid.innerHTML = '<p class="no-results">No products found. Try a different search term.</p>';
        return;
    }
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                <i class="fas fa-${product.image}"></i>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-price">₵${product.price.toFixed(2)}</p>
                <div class="product-actions">
                    <button class="btn btn-outline" onclick="viewProductDetails('${product._id}')">Details</button>
                    <button class="btn btn-primary" onclick="addToCart('${product._id}')" ${!product.inStock ? 'disabled' : ''}>
                        ${!product.inStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        `;
        productGrid.appendChild(productCard);
    });
}

// View product details
function viewProductDetails(productId) {
    // For now, show an alert. In a full implementation, this would open a product detail modal
    const product = products.find(p => p._id === productId);
    if (product) {
        alert(`Product: ${product.title}\nPrice: ₵${product.price}\nDescription: ${product.description}`);
    }
}

// ========== CART FUNCTIONS ==========

// Load cart from API
async function loadCart() {
    if (!authToken) {
        cart = [];
        cartItemsCount = 0;
        updateCartCount();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const cartData = await response.json();
            cart = cartData.items || [];
            cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
            updateCartCount();
        }
    } catch (error) {
        console.error('Load cart error:', error);
    }
}

// Add product to cart
async function addToCart(productId) {
    if (!authToken) {
        showNotification('Please login to add items to cart', 'warning');
        authModal.classList.add('active');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });

        const data = await response.json();

        if (response.ok) {
            cart = data.cart.items || [];
            cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
            updateCartCount();
            
            const product = products.find(p => p._id === productId);
            showNotification(`${product?.title || 'Product'} added to cart!`, 'success');
        } else {
            showNotification(data.error || 'Failed to add to cart', 'error');
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Update cart count display
function updateCartCount() {
    cartCount.textContent = cartItemsCount;
}

// ========== THEME FUNCTIONS ==========

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
        if (mobileThemeText) mobileThemeText.textContent = 'Dark Mode';
    } else {
        themeIcon.className = 'fas fa-sun';
        if (mobileThemeText) mobileThemeText.textContent = 'Light Mode';
    }
}

// ========== UTILITY FUNCTIONS ==========

// Show notification to user
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    const colors = {
        success: 'var(--success)',
        error: '#ff4757',
        warning: 'var(--warning)',
        info: 'var(--accent)'
    };
    
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .no-results {
        text-align: center;
        padding: 2rem;
        color: var(--text-secondary);
        font-size: 1.1rem;
    }
`;
document.head.appendChild(style);

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== EVENT LISTENERS ==========

// Setup event listeners
function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    if (mobileThemeToggle) {
        mobileThemeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
    }
    
    // Mobile menu toggle
    menuIcon.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
    });
    
    // User icon click - show auth modal or user menu
    userIcon.addEventListener('click', () => {
        if (currentUser) {
            // Show user menu (could be expanded to a dropdown)
            const userMenu = confirm(`Welcome ${currentUser.firstName}!\n\nChoose an option:\nOK - View Profile\nCancel - Logout`);
            if (userMenu) {
                // View profile (could open profile modal)
                alert('Profile management coming soon!');
            } else {
                logout();
            }
        } else {
            authModal.classList.add('active');
        }
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
    authForm.addEventListener('submit', handleAuth);
    
    // Switch between login and register
    authSwitch.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });
    
    // Search functionality with debounce
    const debouncedSearch = debounce((searchTerm) => {
        if (searchTerm.trim() === '') {
            loadProducts(); // Load default products
        } else {
            searchProducts(searchTerm);
        }
    }, 300);
    
    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });

    // Cart icon click
    cartIcon.addEventListener('click', () => {
        if (!currentUser) {
            showNotification('Please login to view cart', 'warning');
            authModal.classList.add('active');
            return;
        }
        
        if (cart.length === 0) {
            showNotification('Your cart is empty', 'info');
            return;
        }
        
        // Show cart modal (this could be expanded to a full cart page)
        showCartModal();
    });
    
    // CTA button
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            document.querySelector('.products').scrollIntoView({ behavior: 'smooth' });
        });
    }
}

// Toggle between login and register modes
function toggleAuthMode() {
    const formTitle = document.querySelector('#auth-modal h2');
    const submitButton = document.querySelector('#auth-modal button[type="submit"]');
    const switchText = document.querySelector('.auth-switch');
    
    if (formTitle.textContent.includes('Login')) {
        formTitle.textContent = 'Create Account';
        submitButton.textContent = 'Register';
        switchText.innerHTML = 'Already have an account? <a href="#" id="switch-auth">Login</a>';
    } else {
        formTitle.textContent = 'Login / Register';
        submitButton.textContent = 'Continue';
        switchText.innerHTML = 'Don\'t have an account? <a href="#" id="switch-auth">Register</a>';
    }
    
    // Re-attach event listener to the new link
    document.getElementById('switch-auth').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });
}

// Show cart modal
function showCartModal() {
    const cartModal = document.createElement('div');
    cartModal.className = 'modal cart-modal';
    cartModal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Your Cart</h2>
            <div class="cart-items">
                ${cart.map(item => `
                    <div class="cart-item">
                        <div class="item-info">
                            <h4>${item.product.title}</h4>
                            <p>₵${item.price.toFixed(2)} x ${item.quantity}</p>
                        </div>
                        <div class="item-actions">
                            <button onclick="updateCartItem('${item.product._id}', ${item.quantity + 1})">+</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCartItem('${item.product._id}', ${item.quantity - 1})">-</button>
                            <button onclick="removeFromCart('${item.product._id}')" class="remove-btn">Remove</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="cart-total">
                <h3>Total: ₵${cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</h3>
            </div>
            <div class="cart-actions">
                <button class="btn btn-primary" onclick="proceedToCheckout()">Checkout</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(cartModal);
    cartModal.classList.add('active');
}

// Update cart item quantity
async function updateCartItem(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cart/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ productId, quantity: newQuantity })
        });

        if (response.ok) {
            loadCart();
            // Refresh cart modal if open
            const cartModal = document.querySelector('.cart-modal');
            if (cartModal) {
                cartModal.remove();
                showCartModal();
            }
        }
    } catch (error) {
        console.error('Update cart error:', error);
        showNotification('Failed to update cart', 'error');
    }
}

// Remove item from cart
async function removeFromCart(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cart/remove/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            loadCart();
            showNotification('Item removed from cart', 'success');
            // Refresh cart modal if open
            const cartModal = document.querySelector('.cart-modal');
            if (cartModal) {
                cartModal.remove();
                showCartModal();
            }
        }
    } catch (error) {
        console.error('Remove from cart error:', error);
        showNotification('Failed to remove item', 'error');
    }
}

// Proceed to checkout
function proceedToCheckout() {
    if (!currentUser) {
        showNotification('Please login to proceed', 'warning');
        return;
    }
    
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'warning');
        return;
    }
    
    showCheckoutModal();
}

// Show checkout modal
function showCheckoutModal() {
    const checkoutModal = document.createElement('div');
    checkoutModal.className = 'modal checkout-modal';
    checkoutModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Checkout</h2>
            <form id="checkout-form">
                <div class="form-group">
                    <label>Street Address</label>
                    <input type="text" name="street" required placeholder="Enter your street address">
                </div>
                <div class="form-group">
                    <label>City</label>
                    <input type="text" name="city" required placeholder="Enter your city">
                </div>
                <div class="form-group">
                    <label>Region</label>
                    <select name="region" required>
                        <option value="">Select Region</option>
                        <option value="Greater Accra">Greater Accra</option>
                        <option value="Ashanti">Ashanti</option>
                        <option value="Western">Western</option>
                        <option value="Central">Central</option>
                        <option value="Eastern">Eastern</option>
                        <option value="Volta">Volta</option>
                        <option value="Northern">Northern</option>
                        <option value="Upper East">Upper East</option>
                        <option value="Upper West">Upper West</option>
                        <option value="Brong Ahafo">Brong Ahafo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" required placeholder="Enter your phone number">
                </div>
                <div class="form-group">
                    <label>Payment Method</label>
                    <select name="paymentMethod" required>
                        <option value="cash_on_delivery">Cash on Delivery</option>
                        <option value="mobile_money">Mobile Money (Coming Soon)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Order Notes (Optional)</label>
                    <textarea name="notes" placeholder="Any special instructions..."></textarea>
                </div>
                <div class="order-summary">
                    <h3>Order Summary</h3>
                    ${cart.map(item => `
                        <div class="summary-item">
                            <span>${item.product.title} (${item.quantity}x)</span>
                            <span>₵${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                    <div class="summary-total">
                        <strong>Total: ₵${cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</strong>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                    Place Order
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(checkoutModal);
    checkoutModal.classList.add('active');
    
    // Handle checkout form submission
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
}

// Handle checkout form submission
async function handleCheckout(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const orderData = {
        shippingAddress: {
            street: formData.get('street'),
            city: formData.get('city'),
            region: formData.get('region'),
            phone: formData.get('phone')
        },
        paymentMethod: formData.get('paymentMethod'),
        notes: formData.get('notes')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Order placed successfully!', 'success');
            
            // Close checkout modal
            document.querySelector('.checkout-modal').remove();
            
            // Clear local cart
            cart = [];
            cartItemsCount = 0;
            updateCartCount();
            
            // Show order confirmation
            showOrderConfirmation(data.order);
        } else {
            showNotification(data.error || 'Failed to place order', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Show order confirmation
function showOrderConfirmation(order) {
    const confirmationModal = document.createElement('div');
    confirmationModal.className = 'modal confirmation-modal';
    confirmationModal.innerHTML = `
        <div class="modal-content" style="text-align: center;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <div style="color: var(--success); font-size: 3rem; margin-bottom: 1rem;">
                <i class="fas fa-check-circle"></i>
            </div>
            <h2>Order Confirmed!</h2>
            <p>Your order has been placed successfully.</p>
            <div class="order-details" style="margin: 1.5rem 0; text-align: left; background: var(--card-bg); padding: 1rem; border-radius: 8px;">
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
                <p><strong>Total Amount:</strong> ₵${order.totalAmount.toFixed(2)}</p>
                <p><strong>Payment:</strong> ${order.paymentMethod.replace('_', ' ').toUpperCase()}</p>
                <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">
                You will receive a confirmation call/SMS shortly. 
                Your order will be delivered within 2-3 business days.
            </p>
            <button class="btn btn-primary" onclick="this.closest('.modal').remove()" style="margin-top: 1rem;">
                Continue Shopping
            </button>
        </div>
    `;
    
    document.body.appendChild(confirmationModal);
    confirmationModal.classList.add('active');
}

// ========== CATEGORY FUNCTIONS ==========

// Load and display categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const data = await response.json();
        
        if (response.ok) {
            updateCategoryCards(data.categories);
        }
    } catch (error) {
        console.error('Load categories error:', error);
    }
}

// Update category cards with click handlers
function updateCategoryCards(categories) {
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const categoryName = card.querySelector('h3').textContent;
            filterByCategory(categoryName);
        });
    });
}

// Filter products by category
async function filterByCategory(category) {
    try {
        const response = await fetch(`${API_BASE_URL}/products?category=${encodeURIComponent(category)}`);
        const data = await response.json();
        
        if (response.ok) {
            products = data.products;
            renderProducts();
            
            // Scroll to products section
            document.querySelector('.products').scrollIntoView({ behavior: 'smooth' });
            
            // Update products section title
            document.querySelector('.products h2').textContent = `${category} Products`;
        }
    } catch (error) {
        console.error('Filter by category error:', error);
        showNotification('Failed to filter products', 'error');
    }
}

// ========== INITIALIZATION ==========

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
    loadCategories();
    
    // Add some additional CSS for new modals
    const additionalStyles = document.createElement('style');
    additionalStyles.textContent = `
        .cart-modal .modal-content {
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .cart-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .item-actions {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }
        
        .item-actions button {
            padding: 0.25rem 0.5rem;
            border: none;
            border-radius: 4px;
            background: var(--accent);
            color: white;
            cursor: pointer;
            font-size: 0.9rem;
        }
        
        .remove-btn {
            background: #ff4757 !important;
        }
        
        .cart-total {
            margin: 1rem 0;
            text-align: right;
            padding-top: 1rem;
            border-top: 2px solid var(--accent);
        }
        
        .order-summary {
            background: var(--card-bg);
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
        
        .summary-item {
            display: flex;
            justify-content: space-between;
            margin: 0.5rem 0;
        }
        
        .summary-total {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 0.5rem;
            margin-top: 0.5rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
            font-weight: 500;
        }
        
        .form-group select, .form-group textarea {
            width: 100%;
            padding: 0.8rem;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background-color: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            outline: none;
        }
        
        .form-group select:focus, .form-group textarea:focus {
            border-color: var(--accent);
        }
        
        .confirmation-modal .modal-content {
            max-width: 500px;
        }
        
        @media (max-width: 768px) {
            .cart-modal .modal-content,
            .checkout-modal .modal-content {
                width: 95%;
                max-height: 90vh;
            }
            
            .cart-item {
                flex-direction: column;
                gap: 1rem;
                align-items: flex-start;
            }
            
            .item-actions {
                align-self: flex-end;
            }
        }
    `;
    document.head.appendChild(additionalStyles);
});

// ========== GLOBAL FUNCTIONS FOR INLINE HANDLERS ==========

// Make functions globally available for onclick handlers
window.addToCart = addToCart;
window.viewProductDetails = viewProductDetails;
window.updateCartItem = updateCartItem;
window.removeFromCart = removeFromCart;
window.proceedToCheckout = proceedToCheckout;