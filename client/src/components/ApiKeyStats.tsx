import React, { useState, useEffect } from 'react';
import { userApi } from '../lib/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ApiKeyStatsProps {
  className?: string;
}

interface ApiKeyUsage {
  requests_last_minute: number;
  rate_limit_percent: number;
}

interface ApiKeyStats {
  [service: string]: {
    [maskedKey: string]: ApiKeyUsage;
  };
}

export const ApiKeyStats: React.FC<ApiKeyStatsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getApiKeyStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load API key statistics');
    } finally {
      setLoading(false);
    }
  };

  const refreshApiKeys = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await userApi.refreshApiKeys();
      // Fetch updated stats
      await fetchStats();
    } catch (err: any) {
      setError(err.message || 'Failed to refresh API keys');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
        <h3 className="text-lg font-medium mb-4">API Key Usage</h3>
        <div className="flex justify-center">
          <div className="animate-pulse">Loading statistics...</div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
        <h3 className="text-lg font-medium mb-4">API Key Usage</h3>
        <div className="bg-red-50 p-3 rounded-md border border-red-200">
          <div className="flex items-center text-red-800">
            <AlertCircle size={16} className="mr-2" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">API Key Usage</h3>
        <button
          onClick={refreshApiKeys}
          disabled={refreshing}
          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
        >
          <RefreshCw size={14} className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 p-3 rounded-md border border-red-200 mb-4">
          <div className="flex items-center text-red-800">
            <AlertCircle size={16} className="mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {stats && Object.keys(stats).length === 0 && (
        <div className="text-gray-500 italic">No API key usage data available</div>
      )}

      {stats &&
        Object.entries(stats).map(([service, keyStats]) => (
          <div key={service} className="mb-6">
            <h4 className="text-md font-medium mb-2 capitalize">{service} API Keys</h4>
            <div className="space-y-4">
              {Object.entries(keyStats).map(([maskedKey, usage]) => (
                <div key={maskedKey} className="border rounded-md p-3">
                  <div className="flex justify-between mb-2">
                    <span className="font-mono text-sm">{maskedKey}</span>
                    <span className="text-sm">
                      {usage.requests_last_minute} req/min
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        usage.rate_limit_percent > 80
                          ? 'bg-red-600'
                          : usage.rate_limit_percent > 50
                          ? 'bg-yellow-400'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, usage.rate_limit_percent)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">0%</span>
                    <span className="text-xs text-gray-500">
                      {usage.rate_limit_percent.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">100%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
};

export default ApiKeyStats;
