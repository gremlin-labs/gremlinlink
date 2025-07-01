'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { QueryProvider } from '@/lib/providers/query-provider';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * UNIFIED ADMIN LAYOUT
 *
 * This replaces the fragmented 5-tab interface with a clean,
 * unified navigation system. Users can access all functionality
 * through a simplified sidebar navigation.
 */

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Overview and analytics',
  },
  {
    name: 'Content',
    href: '/admin/content',
    icon: FileText,
    description: 'Manage all content types',
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Traffic and performance',
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management',
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'App configuration',
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/admin/auth';
    } catch {
      // Handle logout error silently
    }
  };

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar when clicking outside (mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('mobile-sidebar');
      const menuButton = document.getElementById('mobile-menu-button');
      
      if (
        sidebarOpen &&
        sidebar &&
        !sidebar.contains(event.target as Node) &&
        menuButton &&
        !menuButton.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sidebarOpen]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <QueryProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </QueryProvider>
    );
  }

  // If no user, render without sidebar (auth page will be shown)
  if (!user) {
    return (
      <QueryProvider>
        <div className="min-h-screen bg-background">
          <main className="min-h-screen">
            {children}
          </main>
        </div>
      </QueryProvider>
    );
  }

  // Authenticated user - show full layout with sidebar
  return (
    <QueryProvider>
      <div className="min-h-screen bg-background">
        {/* Mobile menu button */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button
                id="mobile-menu-button"
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">gremlinlink</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex h-screen">
          {/* Sidebar */}
          <div
            id="mobile-sidebar"
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
            style={{ backgroundColor: 'var(--color-sidebar)', borderColor: 'var(--color-sidebar-border)' }}
          >
            <div className="flex flex-col h-full">
              {/* Header - Hidden on mobile (shown in top bar) */}
              <div className="hidden lg:flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-sidebar-border)' }}>
                <div>
                  <h1 className="text-xl font-bold text-foreground">gremlinlink</h1>
                  <p className="text-sm text-muted-foreground">Admin Panel</p>
                </div>
                <ThemeToggle />
              </div>

              {/* Mobile header */}
              <div className="lg:hidden flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-sidebar-border)' }}>
                <div>
                  <h1 className="text-lg font-bold text-foreground">gremlinlink</h1>
                  <p className="text-sm text-muted-foreground">Admin Panel</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <div>
                        <div>{item.name}</div>
                        <div className="text-xs opacity-75 hidden sm:block">{item.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* User Info & Logout */}
              <div className="p-4 border-t" style={{ borderColor: 'var(--color-sidebar-border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="ml-2 hidden lg:flex"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 pt-16 lg:pt-0">
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </QueryProvider>
  );
}