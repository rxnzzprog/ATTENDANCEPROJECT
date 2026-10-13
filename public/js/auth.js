// API URL helper to seamlessly handle file:// protocol or standalone static hosts
function getApiUrl(endpoint) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
    if (window.location.protocol === 'file:') {
        return `http://localhost:3000${endpoint}`;
    }
    return endpoint;
}

// Authentication logic
async function checkAuth() {
    try {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(getApiUrl('/api/auth/me'), { headers });
        const data = await res.json();

        if (data.success && data.user) {
            window.currentUser = data.user;
            showAppView();
        } else {
            showLoginView();
        }
    } catch (err) {
        console.error('Auth check failed:', err);
        showLoginView();
    }
}

async function loginUser(username, password) {
    try {
        const res = await fetch(getApiUrl('/api/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.success) {
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            window.currentUser = data.user;
            showToast('Login successful!', 'success');
            showAppView();
        } else {
            showToast(data.message || 'Invalid username or password.', 'danger');
        }
    } catch (err) {
        console.error('Login error:', err);
        showToast('Network Error: Please ensure backend server is running on http://localhost:3000', 'danger');
    }
}

async function logout() {
    try {
        await fetch(getApiUrl('/api/auth/logout'), { method: 'POST' });
    } catch (err) {
        console.error('Logout error:', err);
    }
    localStorage.removeItem('token');
    window.currentUser = null;
    if (window.activeQrTimer) clearInterval(window.activeQrTimer);
    if (window.qrScannerInstance) {
        try { window.qrScannerInstance.stop(); } catch(e){}
    }
    showToast('Logged out successfully.', 'info');
    showLoginView();
}
