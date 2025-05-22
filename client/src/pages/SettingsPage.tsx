import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { userApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/utils";
import { UserFormDialog } from "@/components/UserFormDialog";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Loader2, AlertTriangle } from "lucide-react";
import ApiKeyStats from "@/components/ApiKeyStats";

const SettingsPage: React.FC = () => {
  const [openRouterApiKey, setOpenRouterApiKey] = useState("••••••••••••••••••••••••••••••");
  const [geminiApiKey, setGeminiApiKey] = useState("••••••••••••••••••••••••••••••");
  const [defaultEngine, setDefaultEngine] = useState("mistral-ocr");
  const [usageTracking, setUsageTracking] = useState(true);
  const [cacheAnnotations, setCacheAnnotations] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // User dialog states
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | undefined>(undefined);

  // Fetch users (admin only)
  const { data: usersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await userApi.getUsers();
      return response;
    },
  });

  // Get the users array from the response
  const users = usersResponse || [];

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User created",
        description: "New user has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating user",
        description: error.response?.data?.message || "An error occurred while creating the user",
        variant: "destructive",
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: number, userData: any }) =>
      userApi.updateUser(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User updated",
        description: "User has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating user",
        description: error.response?.data?.message || "An error occurred while updating the user",
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting user",
        description: error.response?.data?.message || "An error occurred while deleting the user",
        variant: "destructive",
      });
    }
  });

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await userApi.getSettings();
      return response;
    },
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: userApi.updateSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Setting updated",
        description: "API configuration has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating setting",
        description: error.response?.data?.message || "An error occurred while updating the setting",
        variant: "destructive",
      });
    }
  });

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your API configuration has been updated",
    });
  };

  const handleChangeOpenRouterApiKey = () => {
    const newKey = prompt("Enter new OpenRouter API key:");
    if (newKey) {
      updateSettingMutation.mutate({
        key: "OPENROUTER_API_KEY",
        value: newKey,
        description: "OpenRouter API key for AI model access"
      });
      setOpenRouterApiKey("••••••••••••••••••••••••••••••");
      toast({
        title: "API key updated",
        description: "Your OpenRouter API key has been updated",
      });
    }
  };

  const handleChangeGeminiApiKey = () => {
    const newKeys = prompt("Enter Gemini API keys (separate multiple keys with commas):");
    if (newKeys) {
      updateSettingMutation.mutate({
        key: "GEMINI_API_KEY_POOL",
        value: newKeys,
        description: "Gemini API key pool for translation services"
      });
      setGeminiApiKey("••••••••••••••••••••••••••••••");

      // Refresh API key pools
      userApi.refreshApiKeys().then(() => {
        toast({
          title: "API key pool updated",
          description: `Your Gemini API key pool has been updated with ${newKeys.split(',').length} keys`,
        });
      }).catch(error => {
        toast({
          title: "Error refreshing API keys",
          description: error.message || "Failed to refresh API keys",
          variant: "destructive",
        });
      });
    }
  };

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setUserFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserFormOpen(true);
  };

  const handleUserFormSubmit = (data: any) => {
    if (selectedUser) {
      // If password is empty in edit mode, remove it from the payload
      const userData = data.password ? data : { ...data, password: undefined };
      updateUserMutation.mutate({
        userId: selectedUser.id,
        userData
      });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
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
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => handleDeleteUser(user)}
                          >
                            Delete
                          </Button>
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
              Configure API keys for various services.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label htmlFor="openrouter-api-key">OpenRouter API Key</Label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <Input
                    type="password"
                    id="openrouter-api-key"
                    value={openRouterApiKey}
                    onChange={(e) => setOpenRouterApiKey(e.target.value)}
                    readOnly
                  />
                  <Button
                    variant="outline"
                    className="ml-3"
                    onClick={handleChangeOpenRouterApiKey}
                  >
                    Change
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Your OpenRouter API key is used for PDF processing and OCR.
                </p>
              </div>

              <div>
                <Label htmlFor="gemini-api-key">Gemini API Key Pool</Label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <Input
                    type="password"
                    id="gemini-api-key"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    readOnly
                  />
                  <Button
                    variant="outline"
                    className="ml-3"
                    onClick={handleChangeGeminiApiKey}
                  >
                    Change
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Multiple Gemini API keys can be added separated by commas to handle rate limits.
                </p>
              </div>

              {/* API Key Stats Component */}
              <ApiKeyStats className="mt-6" />

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

      {/* User Form Dialog */}
      <UserFormDialog
        open={userFormOpen}
        onOpenChange={setUserFormOpen}
        onSubmit={handleUserFormSubmit}
        user={selectedUser}
        title={selectedUser ? "Edit User" : "Add New User"}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete ${userToDelete?.email}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </Layout>
  );
};

export default SettingsPage;
