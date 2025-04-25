import React, { useState, useEffect } from 'react';

export const DebugAuth: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  // Function to reload auth state from localStorage
  const refreshAuthState = () => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      setToken(storedToken);
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error parsing stored auth data:', error);
    }
  };
  
  // Initial load
  useEffect(() => {
    refreshAuthState();
    
    // Add event listener for storage changes
    window.addEventListener('storage', refreshAuthState);
    
    // Clean up
    return () => {
      window.removeEventListener('storage', refreshAuthState);
    };
  }, []);
  
  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    refreshAuthState();
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-slate-900 text-white rounded-lg shadow-lg opacity-80 hover:opacity-100 transition-opacity max-w-sm text-xs overflow-auto" style={{ maxHeight: '300px' }}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Auth Debug</h3>
        <div className="space-x-2">
          <button 
            onClick={refreshAuthState} 
            className="px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
          >
            Refresh
          </button>
          <button 
            onClick={handleLogout} 
            className="px-2 py-1 bg-red-600 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div>
          <strong>Auth Status:</strong> {token ? 'Authenticated' : 'Not Authenticated'}
        </div>
        
        {token && (
          <div>
            <strong>Token:</strong> {token.substring(0, 15)}...
          </div>
        )}
        
        {user && (
          <div>
            <strong>User:</strong> 
            <pre>{JSON.stringify(user, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugAuth;