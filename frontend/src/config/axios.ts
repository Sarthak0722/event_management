import axios from 'axios';

// Log the API URL for debugging
console.log('API URL:', process.env.REACT_APP_API_URL);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const instance = axios.create({
    baseURL: API_URL,
    timeout: 15000, // Increased timeout for Render's cold starts
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add request interceptor for debugging
instance.interceptors.request.use(
    config => {
        console.log(`Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
        return config;
    },
    error => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
instance.interceptors.response.use(
    response => response,
    error => {
        console.error('Response error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            data: error.response?.data
        });

        if (error.code === 'ECONNABORTED') {
            console.log('Request canceled or timed out');
            return Promise.reject(error);
        }

        if (error.response?.status === 401) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default instance; 