import axios from 'axios';

const API = axios.create({
  baseURL: 'https://business-tracker-hlz7.onrender.com/api/', // Django backend
});

export default API;
