'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Calendar, 
  Shield, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

interface CreateUserData {
  email: string;
  name?: string;
  is_active: boolean;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<CreateUserData>({
    email: '',
    name: '',
    is_active: true,
  });
  const [editUser, setEditUser] = useState<CreateUserData>({
    email: '',
    name: '',
    is_active: true,
  });

  const queryClient = useQueryClient();

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateDialogOpen(false);
      setNewUser({ email: '', name: '', is_active: true });
      toast.success('User created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create user: ' + error.message);
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: CreateUserData }) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setEditUser({ email: '', name: '', is_active: true });
      toast.success('User updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update user: ' + error.message);
    },
  });

  // Toggle user status mutation
  const toggleUserMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDeactivateDialogOpen(false);
      setTargetUser(null);
      toast.success('User status updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update user status: ' + error.message);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDeleteDialogOpen(false);
      setTargetUser(null);
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete user: ' + error.message);
    },
  });

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper functions for safety checks
  const isCurrentUser = (user: User | null) => {
    if (!user || !currentUser) return false;
    return currentUser.user_id === user.id;
  };
  const isOnlyUser = () => users.length === 1;
  const isOnlyActiveUser = () => users.filter(u => u.is_active).length === 1;

  const handleCreateUser = () => {
    if (!newUser.email) return;
    createUserMutation.mutate(newUser);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUser({
      email: user.email,
      name: user.name || '',
      is_active: user.is_active, // Keep original value, but don't allow editing
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser || !editUser.email) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      userData: editUser,
    });
  };

  const handleDeactivateUser = (user: User) => {
    setTargetUser(user);
    setIsDeactivateDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setTargetUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeactivateUser = () => {
    if (!targetUser) return;
    toggleUserMutation.mutate({ id: targetUser.id, is_active: false });
  };

  const confirmDeleteUser = () => {
    if (!targetUser) return;
    deleteUserMutation.mutate(targetUser.id);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeactivateWarning = () => {
    if (!targetUser) return '';
    
    if (isCurrentUser(targetUser)) {
      return 'You cannot deactivate your own account. This would lock you out of the system.';
    }
    
    if (isOnlyActiveUser() && targetUser.is_active) {
      return 'This is the only active user in the system. Deactivating them would leave no active administrators.';
    }
    
    return `Are you sure you want to deactivate ${targetUser.name || targetUser.email}? They will no longer be able to access the admin panel.`;
  };

  const getDeleteWarning = () => {
    if (!targetUser) return '';
    
    if (isCurrentUser(targetUser)) {
      if (isOnlyUser()) {
        return 'You cannot delete your own account as the only user. This would permanently lock everyone out of the system with no way to recover access.';
      }
              return 'You cannot delete your own account. This would immediately log you out and you may lose access to the system.';
    }
    
    if (isOnlyUser()) {
      return 'This is the only user in the system. Deleting them would leave no administrators and make the system inaccessible.';
    }
    
    return `Are you sure you want to permanently delete ${targetUser.name || targetUser.email}? This action cannot be undone.`;
  };

  const canDeactivate = (user: User | null) => {
    if (!user) return false;
    return !isCurrentUser(user) && !(isOnlyActiveUser() && user.is_active);
  };

  const canDelete = (user: User | null) => {
    if (!user) return false;
    return !isCurrentUser(user) && !isOnlyUser();
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">
              Manage user accounts and permissions
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system. They will receive a magic link to set up their account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@example.com"
                    style={{ backgroundColor: 'var(--color-input-contrast)' }}
                  />
                </div>
                <div>
                  <Label htmlFor="name">Full Name (Optional)</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="John Doe"
                    style={{ backgroundColor: 'var(--color-input-contrast)' }}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={newUser.is_active}
                    onCheckedChange={(checked) => 
                      setNewUser({ ...newUser, is_active: checked as boolean })
                    }
                  />
                  <Label htmlFor="active">Active User</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateUser}
                  disabled={!newUser.email || createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  placeholder="user@example.com"
                  style={{ backgroundColor: 'var(--color-input-contrast)' }}
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Full Name (Optional)</Label>
                <Input
                  id="edit-name"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  placeholder="John Doe"
                  style={{ backgroundColor: 'var(--color-input-contrast)' }}
                />
              </div>

            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateUser}
                disabled={!editUser.email || updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate User Confirmation Dialog */}
        <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Deactivate User
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                {getDeactivateWarning()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeactivateUser}
                disabled={!canDeactivate(targetUser)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {toggleUserMutation.isPending ? 'Deactivating...' : 'Deactivate User'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete User Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Delete User
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                {getDeleteWarning()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                disabled={!canDelete(targetUser)}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card style={{ backgroundColor: 'var(--color-card-elevated)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: 'var(--color-card-elevated)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: 'var(--color-card-elevated)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => !u.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card style={{ backgroundColor: 'var(--color-card-elevated)' }}>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                style={{ backgroundColor: 'var(--color-input-contrast)' }}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading users...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No users match your search criteria.' : 'Get started by adding your first user.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add First User
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    style={{ backgroundColor: 'var(--color-card-elevated)' }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{user.name || user.email}</h3>
                          <Badge variant={user.is_active ? 'default' : 'secondary'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Joined {formatDate(user.created_at)}</span>
                          </div>
                          {user.last_login && (
                            <div className="flex items-center space-x-1">
                              <Shield className="w-3 h-3" />
                              <span>Last login {formatDate(user.last_login)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        
                        {user.is_active ? (
                          <DropdownMenuItem
                            onClick={() => canDeactivate(user) ? handleDeactivateUser(user) : undefined}
                            disabled={!canDeactivate(user)}
                            className={!canDeactivate(user) ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Deactivate
                            {isCurrentUser(user) && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => toggleUserMutation.mutate({ id: user.id, is_active: true })}
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem
                          onClick={() => canDelete(user) ? handleDeleteUser(user) : undefined}
                          disabled={!canDelete(user)}
                          className={cn(
                            'text-destructive',
                            !canDelete(user) && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User
                          {isCurrentUser(user) && (
                            <span className='ml-2 text-xs text-muted-foreground'>(You)</span>
                          )}
                          {isOnlyUser() && !isCurrentUser(user) && (
                            <span className='ml-2 text-xs text-muted-foreground'>(Only User)</span>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}