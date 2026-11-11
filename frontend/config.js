// URL base de la API: local cuando abres el sitio con Go Live, producción en Vercel.
const API_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'http://127.0.0.1:8000/api'
  : 'https://veterinaria-ma6r.onrender.com/api';