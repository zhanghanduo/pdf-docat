import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { userApi } from "@/lib/api";
import { CreditInfoResponse, CreditLog } from "@/lib/types";
import { useLanguage } from "@/hooks/use-language";

// Helper function to format a date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("default", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

// Helper to determine text color based on tier
function getTierColorClass(tier: string): string {
  switch (tier.toLowerCase()) {
    case "free":
      return "text-blue-600";
    case "plus":
      return "text-purple-600";
    case "pro":
      return "text-amber-600";
    default:
      return "text-gray-600";
  }
}

// Helper to determine progress color based on percentage
function getProgressColor(percentage: number): string {
  if (percentage < 50) return "var(--green-500, #22c55e)";
  if (percentage < 80) return "var(--yellow-500, #eab308)";
  return "var(--red-500, #ef4444)";
}

const UsagePage: React.FC = () => {
  const [creditInfo, setCreditInfo] = useState<CreditInfoResponse | null>(null);
  const [creditLogs, setCreditLogs] = useState<CreditLog[]>([]);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Fetch user credit information
  useEffect(() => {
    const fetchCreditInfo = async () => {
      try {
        setIsLoadingCredits(true);
        const creditsResponse = await userApi.getCredits();
        setCreditInfo(creditsResponse);
        
        const logsResponse = await userApi.getCreditLogs();
        setCreditLogs(logsResponse.logs || []);
      } catch (error: any) {
        toast({
          title: "Error fetching credit information",
          description: error.message || "Failed to load credit information",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCredits(false);
      }
    };
    
    fetchCreditInfo();
  }, [toast]);

  // Calculate usage percentage
  const usagePercentage = creditInfo ? Math.min(100, (creditInfo.used / creditInfo.limit) * 100) : 0;
  // Progress bar color based on usage percentage
  const progressColor = getProgressColor(usagePercentage);
  
  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">{t('usage')}</h1>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Credit Usage Overview Card */}
          <Card className="shadow-md border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{t('Credit Usage Overview')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingCredits ? (
                <div className="h-20 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : creditInfo ? (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t('Your current tier')}:</p>
                      <p className={`text-xl font-bold ${getTierColorClass(creditInfo.tier)}`}>
                        {t(creditInfo.tier.charAt(0).toUpperCase() + creditInfo.tier.slice(1) + ' Tier')}
                      </p>
                    </div>
                    <div className="mt-3 md:mt-0">
                      <p className="text-sm text-gray-500 mb-1">{t('Credits used')}:</p>
                      <p className="text-xl font-semibold">
                        {creditInfo.used} / {creditInfo.limit === Number.MAX_SAFE_INTEGER ? "∞" : creditInfo.limit}
                      </p>
                    </div>
                  </div>
                  
                  {creditInfo.limit !== Number.MAX_SAFE_INTEGER && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Usage ({Math.floor(usagePercentage)}%)</p>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full" 
                          style={{
                            width: `${usagePercentage}%`,
                            backgroundColor: progressColor
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="font-medium mb-3">{t('Processing Costs')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="font-medium">{t('Scanned Documents')}</p>
                        <p className="text-sm text-gray-600">5 {t('credits per document')}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="font-medium">{t('Digital PDFs')}</p>
                        <p className="text-sm text-gray-600">1 {t('credits per document')}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="font-medium mb-3">{t('Your Tier Benefits')}</h3>
                    {creditInfo.tier === "free" && (
                      <div className="bg-blue-50 p-4 rounded-md">
                        <h4 className="font-medium text-blue-700">{t('Free Tier')}</h4>
                        <ul className="mt-2 space-y-1 text-sm text-blue-800">
                          <li>• 500 credits per month</li>
                          <li>• Process approximately 100 digital PDFs</li>
                          <li>• Basic translation features</li>
                        </ul>
                      </div>
                    )}
                    
                    {creditInfo.tier === "plus" && (
                      <div className="bg-purple-50 p-4 rounded-md">
                        <h4 className="font-medium text-purple-700">{t('Plus Tier')}</h4>
                        <ul className="mt-2 space-y-1 text-sm text-purple-800">
                          <li>• 50,000 credits per month</li>
                          <li>• Process thousands of documents</li>
                          <li>• Advanced translation features</li>
                          <li>• Priority processing</li>
                        </ul>
                      </div>
                    )}
                    
                    {creditInfo.tier === "pro" && (
                      <div className="bg-amber-50 p-4 rounded-md">
                        <h4 className="font-medium text-amber-700">{t('Pro Tier')}</h4>
                        <ul className="mt-2 space-y-1 text-sm text-amber-800">
                          <li>• Unlimited credits</li>
                          <li>• No restrictions on document processing</li>
                          <li>• Premium support</li>
                          <li>• API access</li>
                          <li>• Custom integrations</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>{t('Unable to load credit information')}</p>
                  <p className="text-sm mt-2">{t('Please try again later')}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Credit Usage History Card */}
          <Card className="shadow-md border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{t('Credit Usage History')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingCredits ? (
                <div className="h-20 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : !creditLogs || creditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{t('No credit usage history yet')}</p>
                  <p className="text-sm mt-2">{t('Process your first document to start tracking usage')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Date')}</th>
                        <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Description')}</th>
                        <th className="px-4 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Credits')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {creditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(log.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{log.description}</td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${log.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {log.amount > 0 ? `+${log.amount}` : log.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default UsagePage;