import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
    console.error('REACT_APP_API_URL is not defined in environment variables!');
}

console.log('Using API URL:', API_URL);

const instance = axios.create({
    baseURL: API_URL,
    timeout: 30000, // Increased timeout for Render's cold starts
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add request interceptor for debugging
instance.interceptors.request.use(
    config => {
        // Don't log auth check requests to reduce console noise
        if (config.url !== '/auth/me') {
            console.log(`Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
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
    response => response,
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

        if (error.code === 'ECONNABORTED') {
            console.log('Request canceled or timed out');
        }

        if (error.response?.status === 401) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default instance; 