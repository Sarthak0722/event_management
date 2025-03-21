import axios from 'axios';

const instance = axios.create({
    baseURL: 'http://localhost:5000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000 // 10 second timeout
});

// Add a response interceptor to handle errors
instance.interceptors.response.use(
    response => response,
    error => {
        if (axios.isCancel(error)) {
            console.log('Request cancelled:', error.message);
            return;
        }

        // Handle 401 (Unauthorized) errors by redirecting to login
        if (error.response && error.response.status === 401) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default instance; 