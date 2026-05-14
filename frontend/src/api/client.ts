import axios from 'axios'

/**
 * Pre-configured Axios instance for all API requests.
 *
 * Request interceptor — attaches the JWT from localStorage as a Bearer token.
 * Response interceptor — on 401, clears stored credentials and redirects to /login,
 * but only when a token is already present so that a failed login attempt shows an
 * error toast instead of navigating away.
 */
const client = axios.create({
  baseURL: '/api',
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default client
