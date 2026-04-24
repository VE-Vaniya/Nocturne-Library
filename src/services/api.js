import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('nocturne_logged_in_user'));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  signup: (userData) => api.post('/auth/signup', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (passwords) => api.put('/auth/change-password', passwords),
};

export const userService = {
  getUsers: () => api.get('/users'),
  getSentRequests: () => api.get('/users/requests/sent'),
  connect: (id) => api.post(`/users/connect/${id}`),
  cancelConnect: (id) => api.delete(`/users/connect/${id}`),
  disconnect: (id) => api.delete(`/users/disconnect/${id}`),
};

export const notificationService = {
  getNotifications: () => api.get('/notifications'),
  respond: (id, status) => api.put(`/notifications/${id}`, { status }),
};

export const quoteService = {
  share: (shareData) => api.post('/quotes/share', shareData),
};

export default api;
