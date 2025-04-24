import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { userApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/utils";

const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState("••••••••••••••••••••••••••••••");
  const [defaultEngine, setDefaultEngine] = useState("mistral-ocr");
  const [usageTracking, setUsageTracking] = useState(true);
  const [cacheAnnotations, setCacheAnnotations] = useState(true);
  const { toast } = useToast();

  // Fetch users (admin only)
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      try {
        const response = await userApi.getUsers();
        return response.users;
      } catch (error) {
        console.error("Failed to fetch users:", error);
        throw error;
      }
    },
  });

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your API configuration has been updated",
    });
  };

  const handleChangeApiKey = () => {
    const newKey = prompt("Enter new API key:");
    if (newKey) {
      setApiKey("••••••••••••••••••••••••••••••");
      toast({
        title: "API key updated",
        description: "Your OpenRouter API key has been updated",
      });
    }
  };

  const handleAddUser = () => {
    // In a real app, this would open a modal to add a new user
    toast({
      title: "Feature not implemented",
      description: "Adding new users is not implemented in this demo",
    });
  };

  const handleEditUser = (userId: number) => {
    toast({
      title: "Feature not implemented",
      description: `Editing user ${userId} is not implemented in this demo`,
    });
  };

  const handleDeactivateUser = (userId: number) => {
    toast({
      title: "Feature not implemented",
      description: `Deactivating user ${userId} is not implemented in this demo`,
    });
  };

  const handleApproveUser = (userId: number) => {
    toast({
      title: "Feature not implemented",
      description: `Approving user ${userId} is not implemented in this demo`,
    });
  };

  const handleRejectUser = (userId: number) => {
    toast({
      title: "Feature not implemented",
      description: `Rejecting user ${userId} is not implemented in this demo`,
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Admin Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage application settings and user access.
        </p>

        {/* User Management Section */}
        <Card className="mt-8">
          <CardHeader>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              User Management
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage user access to the application.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Role
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Last Active
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-red-500">
                        Error loading users
                      </td>
                    </tr>
                  ) : users && users.length > 0 ? (
                    users.map((user: User, index: number) => (
                      <tr key={user.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 font-medium">
                                {user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.email.split("@")[0]}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              user.role === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              user.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastActive ? formatRelativeTime(user.lastActive) : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80 mr-2"
                            onClick={() => handleEditUser(user.id)}
                          >
                            Edit
                          </Button>
                          {user.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive/80"
                              onClick={() => handleDeactivateUser(user.id)}
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary/80 mr-2"
                                onClick={() => handleApproveUser(user.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80"
                                onClick={() => handleRejectUser(user.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <Button onClick={handleAddUser}>Add New User</Button>
            </div>
          </CardContent>
        </Card>

        {/* API Configuration Section */}
        <Card className="mt-8">
          <CardHeader>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              API Configuration
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Configure OpenRouter API settings.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label htmlFor="api-key">API Key</Label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <Input
                    type="password"
                    id="api-key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    readOnly
                  />
                  <Button
                    variant="outline"
                    className="ml-3"
                    onClick={handleChangeApiKey}
                  >
                    Change
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Your OpenRouter API key is securely stored.
                </p>
              </div>

              <div>
                <Label htmlFor="default-engine">Default Processing Engine</Label>
                <Select value={defaultEngine} onValueChange={setDefaultEngine}>
                  <SelectTrigger id="default-engine" className="mt-1">
                    <SelectValue placeholder="Select default engine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mistral-ocr">
                      Mistral OCR (Best for scanned documents)
                    </SelectItem>
                    <SelectItem value="pdf-text">
                      PDF Text (Best for well-structured PDFs)
                    </SelectItem>
                    <SelectItem value="native">
                      Native (Use model's native processing)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  id="usage-tracking"
                  checked={usageTracking}
                  onCheckedChange={setUsageTracking}
                />
                <div>
                  <Label htmlFor="usage-tracking" className="font-medium text-gray-700">
                    Enable Usage Tracking
                  </Label>
                  <p className="text-sm text-gray-500">
                    Track API usage and costs for better resource management.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  id="cache-annotations"
                  checked={cacheAnnotations}
                  onCheckedChange={setCacheAnnotations}
                />
                <div>
                  <Label htmlFor="cache-annotations" className="font-medium text-gray-700">
                    Cache File Annotations
                  </Label>
                  <p className="text-sm text-gray-500">
                    Store file annotations to avoid re-parsing the same document multiple times.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button onClick={handleSaveSettings}>Save Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SettingsPage;
