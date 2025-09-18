"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminNavigation from "../../../components/AdminNavigation";

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: string;
}

interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  role: {
    id: string;
    name: string;
    description: string;
  };
  permission: {
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
  };
}

interface CreateRoleForm {
  name: string;
  description: string;
  permissionIds: string[];
}

export default function RolesManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateRoleForm>({
    name: "",
    description: "",
    permissionIds: [],
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      // Check if user has admin permissions
      if (!session?.user?.role || session.user.role !== "PLATFORM_ADMIN") {
        router.push("/dashboard");
        return;
      }

      fetchData();
    }
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [rolesRes, permissionsRes, rolePermissionsRes] = await Promise.all([
        fetch("/api/admin/roles"),
        fetch("/api/admin/permissions"),
        fetch("/api/admin/role-permissions"),
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData);
      }

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json();
        setPermissions(permissionsData);
      }

      if (rolePermissionsRes.ok) {
        const rolePermissionsData = await rolePermissionsRes.json();
        setRolePermissions(rolePermissionsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        setSuccess("Role created successfully!");
        setShowCreateModal(false);
        setCreateForm({ name: "", description: "", permissionIds: [] });
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create role");
      }
    } catch (error) {
      setError("An error occurred while creating the role");
    }
  };

  const handleAssignPermissions = async (roleId: string, permissionIds: string[]) => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/role-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleId, permissionIds }),
      });

      if (response.ok) {
        setSuccess("Permissions assigned successfully!");
        setShowPermissionModal(false);
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to assign permissions");
      }
    } catch (error) {
      setError("An error occurred while assigning permissions");
    }
  };

  const getRolePermissions = (roleId: string) => {
    return rolePermissions
      .filter((rp) => rp.roleId === roleId)
      .map((rp) => rp.permission);
  };

  const groupPermissionsByResource = (permissions: Permission[]) => {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (!selectedRole) return;

    const currentPermissions = getRolePermissions(selectedRole.id).map((p) => p.id);
    const newPermissions = checked
      ? [...currentPermissions, permissionId]
      : currentPermissions.filter((id) => id !== permissionId);

    handleAssignPermissions(selectedRole.id, newPermissions);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation
        title="Role & Permission Management"
        subtitle="Manage roles and assign permissions to control user access"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Roles Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Roles</h2>
                {session?.user?.role === "PLATFORM_ADMIN" && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Create Role
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {roles.map((role) => {
                  const rolePerms = getRolePermissions(role.id);
                  return (
                    <div
                      key={role.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedRole?.id === role.id
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedRole(role)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {role.name}
                            {role.isSystem && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                System
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {role.description || "No description"}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {rolePerms.length} permission{rolePerms.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Permissions
                  {selectedRole && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      for {selectedRole.name}
                    </span>
                  )}
                </h2>
              </div>

              {selectedRole ? (
                <div className="space-y-6">
                  {Object.entries(groupPermissionsByResource(permissions)).map(
                    ([resource, resourcePermissions]) => {
                      const rolePermissionIds = getRolePermissions(selectedRole.id).map(
                        (p) => p.id
                      );

                      return (
                        <div key={resource} className="border rounded-lg p-4">
                          <h3 className="font-medium text-gray-900 mb-3 capitalize">
                            {resource}
                          </h3>
                          <div className="space-y-2">
                            {resourcePermissions.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex items-center space-x-3"
                              >
                                <input
                                  type="checkbox"
                                  checked={rolePermissionIds.includes(permission.id)}
                                  onChange={(e) =>
                                    handlePermissionToggle(permission.id, e.target.checked)
                                  }
                                  disabled={selectedRole.isSystem}
                                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {permission.action}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {permission.description || permission.name}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  )}
                  {selectedRole.isSystem && (
                    <div className="text-sm text-gray-500 italic">
                      System roles cannot be modified.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Select a role to view and manage its permissions
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Role Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Role
                </h3>
                <form onSubmit={handleCreateRole}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role Name
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, description: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateForm({ name: "", description: "", permissionIds: [] });
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md"
                    >
                      Create Role
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}