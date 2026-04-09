import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  UserPlus, 
  Shield, 
  User,
  FolderOpen,
  Brain,
  Bot,
  Sparkles,
  ListTodo,
  Calendar
} from 'lucide-react';
import { EditUserSheet } from './EditUserSheet';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useUsers, useCreateUser, useDeleteUser } from '@/hooks/useUsers';
import type { AppRole, UserWithRole, PermissionLevel } from '@/types/user';

// Component to display user permissions summary
function UserPermissionsSummary({ userId, role }: { userId: string; role: AppRole }) {
  const { data: permissions } = useUserPermissions(userId);
  
  if (role === 'admin') {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        Full access to all tools and settings
      </p>
    );
  }
  
  if (!permissions) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        No permissions configured
      </p>
    );
  }
  
  const toolIcons: Record<string, React.ElementType> = {
    files_manager: FolderOpen,
    mastermind: Brain,
    ai_agents: Bot,
    wishdom: Sparkles,
    
    taskforce: ListTodo,
  };
  
  const toolLabels: Record<string, string> = {
    files_manager: 'Files',
    mastermind: 'MasterMind',
    ai_agents: 'AI Agents',
    wishdom: 'Wishdom',
    
    taskforce: 'Tasks',
  };
  
  const activeTools = Object.entries(toolIcons).filter(([key]) => {
    const level = permissions[key as keyof typeof permissions] as PermissionLevel;
    return level && level !== 'none';
  });
  
  if (activeTools.length === 0) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        No tool access configured
      </p>
    );
  }
  
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {activeTools.slice(0, 4).map(([key]) => {
        const Icon = toolIcons[key];
        const level = permissions[key as keyof typeof permissions] as PermissionLevel;
        return (
          <div 
            key={key}
            className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full"
          >
            <Icon className="h-3 w-3" />
            <span>{toolLabels[key]}</span>
            <span className="text-muted-foreground">({level})</span>
          </div>
        );
      })}
      {activeTools.length > 4 && (
        <span className="text-xs text-muted-foreground">
          +{activeTools.length - 4} more
        </span>
      )}
    </div>
  );
}

export function UsersManagement() {
  const { user: currentUser } = useAuth();
  
  // React Query hooks
  const { data: users = [], isLoading, refetch } = useUsers();
  const createUserMutation = useCreateUser();
  const deleteUserMutation = useDeleteUser();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('agent');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await createUserMutation.mutateAsync({
      email: newEmail,
      password: newPassword,
      fullName: newFullName,
      role: newRole,
    }).then(() => true).catch(() => false);

    if (success) {
      setIsCreateOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('agent');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    await deleteUserMutation.mutateAsync(deleteUserId)
      .then(() => setDeleteUserId(null))
      .catch(() => {});
  };

  const openEditSheet = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formLoading = createUserMutation.isPending || deleteUserMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Users Management</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team members and their access permissions
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <UserPlus className="mr-0 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add User</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new team member to Fortun Wishnet
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        Agent
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-500" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {newRole === 'admin' 
                    ? 'Admins have full access to all tools and settings'
                    : 'Agents can be assigned specific permissions after creation'
                  }
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Cards Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => (
          <Card 
            key={user.id}
            className="p-4 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Avatar className="h-12 w-12 border-2 border-border flex-shrink-0">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold truncate">
                      {user.full_name || 'No name'}
                    </h4>
                    <Badge
                      variant="secondary"
                      className={`flex-shrink-0 ${
                        user.role === 'admin'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      }`}
                    >
                      {user.role === 'admin' ? (
                        <Shield className="h-3 w-3 mr-1" />
                      ) : (
                        <User className="h-3 w-3 mr-1" />
                      )}
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>Joined {formatDate(user.created_at)}</span>
                  </div>
                  <UserPermissionsSummary userId={user.id} role={user.role} />
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditSheet(user)}
                className="flex-1"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteUserId(user.id)}
                disabled={user.id === currentUser?.id}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <User className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No users yet</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Create your first team member to get started
          </p>
        </div>
      )}

      {/* Edit User Sheet */}
      <EditUserSheet
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        user={selectedUser ? {
          id: selectedUser.id,
          email: selectedUser.email || '',
          full_name: selectedUser.full_name,
          avatar_url: selectedUser.avatar_url,
          role: selectedUser.role,
          created_at: selectedUser.created_at || ''
        } : null}
        onSave={refetch}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
              All their data, files, and permissions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
