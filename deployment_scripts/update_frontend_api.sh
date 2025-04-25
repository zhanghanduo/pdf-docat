#!/bin/bash
# Script to update frontend API endpoints to work with the new Python backend

echo "Updating frontend API endpoints..."

# Create API client for the new Python backend
mkdir -p client/src/api
cat > client/src/api/apiClient.ts << EOL
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token in requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
EOL

# Create auth API module
cat > client/src/api/auth.ts << EOL
import apiClient from './apiClient';

export const login = async (email: string, password: string) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  
  const response = await apiClient.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
};

export const register = async (userData: {
  email: string;
  password: string;
  confirm_password: string;
  name?: string;
}) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/users/me');
  return response.data;
};
EOL

# Create PDF API module
cat > client/src/api/pdf.ts << EOL
import apiClient from './apiClient';

export const processPDF = async (
  file: File,
  options: {
    engine?: string;
    translate_enabled?: boolean;
    target_language?: string;
    dual_language?: boolean;
  }
) => {
  const formData = new FormData();
  formData.append('file', file);
  
  if (options.engine) {
    formData.append('engine', options.engine);
  }
  
  if (options.translate_enabled !== undefined) {
    formData.append('translate_enabled', options.translate_enabled.toString());
  }
  
  if (options.target_language) {
    formData.append('target_language', options.target_language);
  }
  
  if (options.dual_language !== undefined) {
    formData.append('dual_language', options.dual_language.toString());
  }
  
  const response = await apiClient.post('/pdf/process', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const getProcessingLogs = async (limit = 10, offset = 0) => {
  const response = await apiClient.get(\`/pdf/logs?limit=\${limit}&offset=\${offset}\`);
  return response.data;
};

export const getProcessingLog = async (logId: number) => {
  const response = await apiClient.get(\`/pdf/logs/\${logId}\`);
  return response.data;
};
EOL

# Create credits API module
cat > client/src/api/credits.ts << EOL
import apiClient from './apiClient';

export const getUserCredits = async () => {
  const response = await apiClient.get('/credits');
  return response.data;
};

export const getCreditLogs = async (limit = 10, offset = 0) => {
  const response = await apiClient.get(\`/credits/logs?limit=\${limit}&offset=\${offset}\`);
  return response.data;
};
EOL

# Create index file to export all API modules
cat > client/src/api/index.ts << EOL
export * from './auth';
export * from './pdf';
export * from './credits';
export { default as apiClient } from './apiClient';
EOL

echo "Frontend API endpoints updated!"
echo "You'll need to update your components to use these new API modules."
echo "Example usage:"
echo "  import { login, register } from '../api';"
echo "  const handleLogin = async () => {"
echo "    try {"
echo "      const data = await login(email, password);"
echo "      // Handle successful login"
echo "    } catch (error) {"
echo "      // Handle error"
echo "    }"
echo "  };"
