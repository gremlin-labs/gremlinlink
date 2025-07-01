'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  UserCheck,
  UserX,
  Shield,
  MoreHorizontal,
  Mail,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from './ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface User {
  id: string;
  email: string;
  name?: string | null;
  is_active: boolean;
  last_login?: Date | null;
  created_at: Date;
  updated_at: Date;
  session_count: number;
  last_session?: Date | null;
  magic_link_count: number;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  recentLogins: number;
}

interface CreateUserData {
  email: string;
  name?: string;
  is_active?: boolean;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, inactive: 0, recentLogins: 0 });
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    name: '',
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search query
    if (Array.isArray(users)) {
      const filtered = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?stats=true');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setStats(data.stats || { total: 0, active: 0, inactive: 0, recentLogins: 0 });
      } else if (response.status === 401) {
        toast.error('Authentication required. Please log in again.');
        // Redirect to login page
        window.location.href = '/admin/auth';
      } else {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch users' }));
        toast.error(error.error || 'Failed to fetch users');
      }
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('User created successfully');
        resetForm();
        setDialogOpen(false);
        fetchUsers();
      } else {
        const error = await response.json();
        // Handle Zod validation errors
        if (Array.isArray(error.error)) {
          const errorMessages = error.error.map((err: Record<string, unknown>) => err.message).join(', ');
          toast.error(`Validation error: ${errorMessages}`);
        } else {
          toast.error(error.error || 'Failed to create user');
        }
      }
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Error creating user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('User updated successfully');
        resetForm();
        setDialogOpen(false);
        fetchUsers();
      } else {
        const error = await response.json();
        // Handle Zod validation errors
        if (Array.isArray(error.error)) {
          const errorMessages = error.error.map((err: Record<string, unknown>) => err.message).join(', ');
          toast.error(`Validation error: ${errorMessages}`);
        } else {
          toast.error(error.error || 'Failed to update user');
        }
      }
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Error updating user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their sessions and magic links.')) return;

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete user');
      }
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Error deleting user');
    }
  };

  const handleToggleUserStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}/toggle-status`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('User status updated');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user status');
      }
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Error updating user status');
    }
  };

  const handleRevokeUserSessions = async (id: string) => {
    if (!confirm('Are you sure you want to revoke all sessions for this user? They will need to log in again.')) return;

    try {
      const response = await fetch(`/api/admin/users/${id}/revoke-sessions`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('User sessions revoked');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to revoke user sessions');
      }
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Error revoking user sessions');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name || '',
      is_active: user.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      is_active: true,
    });
    setEditingUser(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const getRelativeTime = (date: Date | null | undefined) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user information' : 'Add a new user to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name (Optional)</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                  />
                  <Label htmlFor="is_active">Active User</Label>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.recentLogins}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Magic Links</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{user.name || 'No name'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatDate(user.last_login)}</div>
                      <div className="text-muted-foreground">{getRelativeTime(user.last_login)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>{user.session_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.magic_link_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatDate(user.created_at)}</div>
                      <div className="text-muted-foreground">{getRelativeTime(user.created_at)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => startEdit(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleUserStatus(user.id)}>
                          {user.is_active ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleRevokeUserSessions(user.id)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Revoke Sessions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No users match your search criteria.' : 'Get started by creating your first user.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 