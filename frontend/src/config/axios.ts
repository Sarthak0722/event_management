import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

if (!API_URL) {
    console.error('REACT_APP_API_URL is not defined in environment variables!');
}

console.log('Using API URL:', API_URL);

const instance = axios.create({
    baseURL: API_URL,
    timeout: 30000, // Increased timeout for Render's cold starts
    withCredentials: true, // Important for cookies
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Add request interceptor for debugging and cookie handling
instance.interceptors.request.use(
    config => {
        // Don't log auth check requests to reduce console noise
        if (config.url !== '/auth/me') {
            console.log(`Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
        }

        // Always ensure credentials are included
        config.withCredentials = true;

        // Ensure headers are properly set
        if (config.headers) {
            config.headers['Content-Type'] = 'application/json';
            config.headers['Accept'] = 'application/json';
        }

        return config;
    },
    error => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
instance.interceptors.response.use(
    response => {
        // Check if we have a new token in the response
        const token = response.headers['authorization'] || response.headers['Authorization'];
        if (token) {
            // Update the Authorization header for subsequent requests
            instance.defaults.headers.common['Authorization'] = token;
        }

        // Check for successful auth response with token
        if (response.data?.token) {
            instance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }

        return response;
    },
    error => {
        // Don't log canceled requests or auth check errors to reduce console noise
        if (!axios.isCancel(error) && error.config.url !== '/auth/me') {
            if (!error.response) {
                console.error('Network Error - No Response:', {
                    message: error.message,
                    code: error.code,
                    config: {
                        url: error.config?.url,
                        baseURL: error.config?.baseURL,
                        method: error.config?.method
                    }
                });
            } else {
                console.error('Response Error:', {
                    message: error.message,
                    code: error.code,
                    status: error.response?.status,
                    data: error.response?.data
                });
            }
        }

        // Handle specific error cases
        if (error.code === 'ECONNABORTED') {
            console.log('Request canceled or timed out');
        }

        // Only redirect to login for 401 errors that are not auth check requests
        // and when the error is not due to token expiration during an auth check
        if (error.response?.status === 401 && 
            error.config.url !== '/auth/me' && 
            !error.config._isRetry &&
            !error.config.url?.includes('login')) {
            // Clear any stored auth data
            instance.defaults.headers.common['Authorization'] = '';
            // Only redirect if not already on login page
            if (!window.location.pathname.includes('login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default instance; 