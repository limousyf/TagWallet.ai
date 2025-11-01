class WalletTagsApp {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken');

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthStatus();
        this.showLanding();
    }

    setupEventListeners() {
        // Navigation toggle
        document.getElementById('nav-toggle')?.addEventListener('click', this.toggleNavMenu.bind(this));

        // Form submissions
        document.getElementById('login-form')?.addEventListener('submit', this.handleLogin.bind(this));
        document.getElementById('register-form')?.addEventListener('submit', this.handleRegister.bind(this));
        document.getElementById('create-pass-form')?.addEventListener('submit', this.handleCreatePass.bind(this));

        // Modal overlay clicks
        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                this.closeModal();
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    async checkAuthStatus() {
        if (this.authToken) {
            try {
                const response = await this.apiCall('/auth/me', 'GET');
                if (response.user) {
                    this.currentUser = response.user;
                    this.updateNavigation();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                this.logout();
            }
        }
    }

    updateNavigation() {
        const navAuth = document.getElementById('nav-auth');
        const navUser = document.getElementById('nav-user');

        if (this.currentUser) {
            navAuth?.classList.add('hidden');
            navUser?.classList.remove('hidden');
        } else {
            navAuth?.classList.remove('hidden');
            navUser?.classList.add('hidden');
        }
    }

    toggleNavMenu() {
        const navMenu = document.getElementById('nav-menu');
        navMenu?.classList.toggle('active');
    }

    // Navigation methods
    showLanding() {
        this.hideAllSections();
        document.getElementById('landing')?.classList.remove('hidden');
    }

    async showDashboard() {
        if (!this.currentUser) {
            this.showLogin();
            return;
        }

        this.hideAllSections();
        document.getElementById('dashboard')?.classList.remove('hidden');
        await this.loadDashboardData();
    }

    async showAdmin() {
        if (!this.currentUser?.isAdmin) {
            this.showToast('Access denied', 'error');
            return;
        }

        this.hideAllSections();
        document.getElementById('admin')?.classList.remove('hidden');
        await this.loadAdminData();
    }

    hideAllSections() {
        const sections = ['landing', 'dashboard', 'admin'];
        sections.forEach(section => {
            document.getElementById(section)?.classList.add('hidden');
        });
    }

    // Modal methods
    showLogin() {
        this.showModal('login-modal');
    }

    showRegister() {
        this.showModal('register-modal');
    }

    showCreatePass() {
        if (!this.currentUser) {
            this.showLogin();
            return;
        }
        this.loadTemplatesForSelect();
        this.showModal('create-pass-modal');
    }

    showModal(modalId) {
        const overlay = document.getElementById('modal-overlay');
        const modals = overlay?.querySelectorAll('.modal');

        modals?.forEach(modal => modal.classList.add('hidden'));
        overlay?.classList.remove('hidden');
        document.getElementById(modalId)?.classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('modal-overlay')?.classList.add('hidden');
        this.clearForms();
    }

    clearForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => form.reset());
    }

    // Authentication methods
    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;

        try {
            const response = await this.apiCall('/auth/login', 'POST', {
                email,
                password
            });

            if (response.token) {
                this.authToken = response.token;
                localStorage.setItem('authToken', this.authToken);
                this.currentUser = response.user;
                this.updateNavigation();
                this.closeModal();
                this.showDashboard();
                this.showToast('Login successful', 'success');
            }
        } catch (error) {
            this.showToast(error.message || 'Login failed', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const email = document.getElementById('register-email')?.value;
        const firstName = document.getElementById('register-first-name')?.value;
        const lastName = document.getElementById('register-last-name')?.value;
        const password = document.getElementById('register-password')?.value;

        try {
            const response = await this.apiCall('/auth/register', 'POST', {
                email,
                firstName,
                lastName,
                password
            });

            if (response.token) {
                this.authToken = response.token;
                localStorage.setItem('authToken', this.authToken);
                this.currentUser = response.user;
                this.updateNavigation();
                this.closeModal();
                this.showDashboard();
                this.showToast('Account created successfully', 'success');
            }
        } catch (error) {
            this.showToast(error.message || 'Registration failed', 'error');
        }
    }

    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        this.updateNavigation();
        this.showLanding();
        this.showToast('Logged out successfully', 'success');
    }

    // Pass creation
    async handleCreatePass(e) {
        e.preventDefault();

        const walletType = document.getElementById('pass-wallet-type')?.value;
        const templateId = document.getElementById('pass-template')?.value || undefined;
        const organizationName = document.getElementById('pass-organization')?.value;
        const logoText = document.getElementById('pass-logo-text')?.value;
        const description = document.getElementById('pass-description')?.value;
        const backgroundColor = document.getElementById('pass-bg-color')?.value;
        const foregroundColor = document.getElementById('pass-fg-color')?.value;

        this.showLoading();

        try {
            const response = await this.apiCall('/passes', 'POST', {
                walletType,
                templateId,
                passData: {
                    organizationName,
                    logoText,
                    description,
                    backgroundColor,
                    foregroundColor,
                    serialNumber: `WT-${Date.now()}`,
                    barcode: {
                        message: `${organizationName}-${logoText}`,
                        format: 'PKBarcodeFormatQR',
                        messageEncoding: 'iso-8859-1'
                    }
                }
            });

            this.hideLoading();
            this.closeModal();
            this.showToast('Pass created successfully', 'success');
            this.loadDashboardData();
        } catch (error) {
            this.hideLoading();
            this.showToast(error.message || 'Failed to create pass', 'error');
        }
    }

    // Data loading methods
    async loadDashboardData() {
        try {
            const [statsResponse, passesResponse] = await Promise.all([
                this.apiCall('/passes/stats', 'GET'),
                this.apiCall('/passes?limit=10', 'GET')
            ]);

            this.updateStats(statsResponse.stats);
            this.updatePassesTable(passesResponse.passes);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    async loadAdminData() {
        try {
            const [statsResponse, usersResponse] = await Promise.all([
                this.apiCall('/admin/stats', 'GET'),
                this.apiCall('/admin/users?limit=20', 'GET')
            ]);

            this.updateAdminStats(statsResponse.stats);
            this.updateUsersTable(usersResponse.users);
        } catch (error) {
            console.error('Failed to load admin data:', error);
        }
    }

    async loadTemplatesForSelect() {
        try {
            const response = await this.apiCall('/templates', 'GET');
            const select = document.getElementById('pass-template');

            // Clear existing options except the first one
            while (select?.children.length > 1) {
                select.removeChild(select.lastChild);
            }

            response.templates?.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = template.name;
                select?.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    // UI update methods
    updateStats(stats) {
        document.getElementById('total-passes').textContent = stats.totalPasses || 0;
        document.getElementById('apple-passes').textContent = stats.applePasses || 0;
        document.getElementById('google-passes').textContent = stats.googlePasses || 0;
        document.getElementById('today-passes').textContent = stats.todayPasses || 0;
    }

    updateAdminStats(stats) {
        document.getElementById('admin-total-users').textContent = stats.totalUsers || 0;
        document.getElementById('admin-total-passes').textContent = stats.totalPasses || 0;
        document.getElementById('admin-total-templates').textContent = stats.totalTemplates || 0;
        document.getElementById('admin-today-passes').textContent = stats.todayPasses || 0;
    }

    updatePassesTable(passes) {
        const tbody = document.getElementById('passes-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!passes || passes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No passes found</td></tr>';
            return;
        }

        passes.forEach(pass => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${pass.serialNumber}</td>
                <td>${pass.passData?.logoText || 'N/A'}</td>
                <td>${pass.walletType}</td>
                <td>${new Date(pass.createdAt).toLocaleDateString()}</td>
                <td>
                    ${pass.downloadUrl ? `<a href="${pass.downloadUrl}" class="btn btn-sm btn-primary" target="_blank">Download</a>` : ''}
                    ${pass.qrCodeUrl ? `<a href="${pass.qrCodeUrl}" class="btn btn-sm btn-secondary" target="_blank">QR Code</a>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateUsersTable(users) {
        const tbody = document.getElementById('users-admin-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.email}</td>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.isAdmin ? 'Yes' : 'No'}</td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    ${!user.isAdmin ? `<button class="btn btn-sm btn-error" onclick="app.deleteUser('${user.id}')">Delete</button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Tab management
    showPassesTab() {
        this.switchTab('passes-tab');
    }

    showTemplatesTab() {
        this.switchTab('templates-tab');
    }

    showUsersAdminTab() {
        this.switchTab('users-admin-tab');
    }

    showPassesAdminTab() {
        this.switchTab('passes-admin-tab');
    }

    showTemplatesAdminTab() {
        this.switchTab('templates-admin-tab');
    }

    switchTab(tabId) {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        // Add active class to selected tab
        const button = event?.target || document.querySelector(`[onclick*="${tabId}"]`);
        button?.classList.add('active');
        document.getElementById(tabId)?.classList.add('active');
    }

    // Utility methods
    showLoading() {
        document.getElementById('loading-spinner')?.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-spinner')?.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);

        // Remove on click
        toast.addEventListener('click', () => {
            toast.remove();
        });
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (this.authToken) {
            options.headers.Authorization = `Bearer ${this.authToken}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }

        return result;
    }

    // Demo functionality
    showDemo() {
        this.showToast('Demo functionality coming soon!', 'info');
    }

    async refreshAdminData() {
        await this.loadAdminData();
        this.showToast('Admin data refreshed', 'success');
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            await this.apiCall(`/admin/users/${userId}`, 'DELETE');
            this.showToast('User deleted successfully', 'success');
            this.loadAdminData();
        } catch (error) {
            this.showToast(error.message || 'Failed to delete user', 'error');
        }
    }
}

// Global functions for onclick handlers
function showLogin() {
    app.showLogin();
}

function showRegister() {
    app.showRegister();
}

function showDashboard() {
    app.showDashboard();
}

function showCreatePass() {
    app.showCreatePass();
}

function showTemplates() {
    app.showToast('Templates feature coming soon!', 'info');
}

function showDemo() {
    app.showDemo();
}

function logout() {
    app.logout();
}

function closeModal() {
    app.closeModal();
}

function showPassesTab() {
    app.showPassesTab();
}

function showTemplatesTab() {
    app.showTemplatesTab();
}

function showUsersAdminTab() {
    app.showUsersAdminTab();
}

function showPassesAdminTab() {
    app.showPassesAdminTab();
}

function showTemplatesAdminTab() {
    app.showTemplatesAdminTab();
}

function refreshAdminData() {
    app.refreshAdminData();
}

// Initialize the app
const app = new WalletTagsApp();