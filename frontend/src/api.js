import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://member-360-health-intelligence-assistant.onrender.com/api'

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('m360_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('m360_token')
      localStorage.removeItem('m360_display_name')
      localStorage.removeItem('m360_role')
      localStorage.removeItem('m360_username')
      localStorage.removeItem('m360_email')
    }
    return Promise.reject(error)
  },
)

export const api = {
  login: (username, password) =>
    client.post('/auth/login', { username, password }).then((r) => r.data),

  ssoLogin: () => client.post('/auth/sso').then((r) => r.data),

  me: () => client.get('/auth/me').then((r) => r.data),

  getDashboardStats: () => client.get('/dashboard/stats').then((r) => r.data),
  getRecentSearches: () => client.get('/dashboard/recent-searches').then((r) => r.data),
  getAlerts: (priority) => client.get('/alerts', { params: { priority } }).then((r) => r.data),

  listMembers: (q) => client.get('/members', { params: { q: q || undefined } }).then((r) => r.data),
  getMember: (id) => client.get(`/members/${encodeURIComponent(id)}`).then((r) => r.data),
  getOverview: (id) => client.get(`/members/${encodeURIComponent(id)}/overview`).then((r) => r.data),
  getEligibility: (id) => client.get(`/members/${encodeURIComponent(id)}/eligibility`).then((r) => r.data),
  getClaims: (id) => client.get(`/members/${encodeURIComponent(id)}/claims`).then((r) => r.data),
  getMedications: (id) => client.get(`/members/${encodeURIComponent(id)}/medications`).then((r) => r.data),
  getAuthorizations: (id) => client.get(`/members/${encodeURIComponent(id)}/authorizations`).then((r) => r.data),
  getInteractions: (id) => client.get(`/members/${encodeURIComponent(id)}/interactions`).then((r) => r.data),
  getTimeline: (id) => client.get(`/members/${encodeURIComponent(id)}/timeline`).then((r) => r.data),
  getAiSummary: (id) => client.get(`/members/${encodeURIComponent(id)}/ai-summary`).then((r) => r.data),
  sendChatMessage: (id, message, history) =>
    client.post(`/members/${encodeURIComponent(id)}/chat`, { message, history }).then((r) => r.data),
}

export default api
