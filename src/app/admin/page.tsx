'use client';

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBlocks } from '@/lib/hooks/use-blocks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  BarChart3,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * UNIFIED ADMIN DASHBOARD
 *
 * This is the main dashboard that provides an overview of the content
 * management system and directs users to the unified content manager.
 * 
 * Replaces the old fragmented 6-tab interface with a clean dashboard
 * that shows key metrics and quick actions.
 */

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  
  // Get content overview data
  const {
    data: blocksData,
    isLoading,
  } = useBlocks({
    limit: 5, // Just get recent items for dashboard
  });

  const blocks = blocksData?.blocks || [];
  const stats = blocksData?.stats || {
    total: 0,
    published: 0,
    drafts: 0,
    by_renderer: {},
  };

  // Quick action cards
  const quickActions = [
    {
      title: 'Create Redirect',
      description: 'Quick URL shortener',
      icon: ExternalLink,
      href: '/admin/content?create=redirect',
      color: 'bg-blue-500',
    },
    {
      title: 'Write Article',
      description: 'Create rich content',
      icon: FileText,
      href: '/admin/content?create=article',
      color: 'bg-green-500',
    },
    {
      title: 'Upload Image',
      description: 'Add media content',
      icon: Plus,
      href: '/admin/content?create=image',
      color: 'bg-purple-500',
    },
    {
      title: 'View Analytics',
      description: 'Traffic insights',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'bg-orange-500',
    },
  ];

  if (authLoading || isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-4 lg:py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-4 lg:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        
        <Link href="/admin/content">
          <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Create Content
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Content</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-green-600">{stats.published}</p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-orange-600">{stats.drafts}</p>
              </div>
              <EyeOff className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Redirects</p>
                <p className="text-2xl font-bold text-blue-600">{stats.by_renderer.redirect || 0}</p>
              </div>
              <ExternalLink className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                {quickActions.map((action) => (
                  <Link key={action.title} href={action.href}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer bg-[var(--color-card-elevated)]">
                      <CardContent className="p-3 lg:p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-lg text-white flex-shrink-0', action.color)}>
                            <action.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm lg:text-base truncate">{action.title}</h3>
                            <p className="text-xs lg:text-sm text-muted-foreground truncate">{action.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Content */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Content</CardTitle>
              <Link href="/admin/content">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6">
              {blocks.length > 0 ? (
                <div className="space-y-4">
                  {blocks.slice(0, 5).map((block) => (
                    <div key={block.id} className="flex items-center justify-between p-3 border rounded-lg bg-[var(--color-card-elevated)]">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">
                            {(block.data as { title?: string })?.title || (block.metadata as { title?: string })?.title || block.slug}
                          </h4>
                          <span className={cn(
                            'px-2 py-1 text-xs rounded-full font-medium',
                            block.renderer === 'redirect' ? 'bg-blue-100 text-blue-800' :
                            block.renderer === 'article' ? 'bg-green-100 text-green-800' :
                            block.renderer === 'image' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          )}>
                            {block.renderer}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">/{block.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'px-2 py-1 text-xs rounded-full',
                          block.is_published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        )}>
                          {block.is_published ? 'Published' : 'Draft'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/${block.slug}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No content yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get started by creating your first piece of content
                  </p>
                  <Link href="/admin/content">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Content
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Content Manager Link */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-medium mb-2">Content Manager</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage all your content from one unified interface
                </p>
                <Link href="/admin/content">
                  <Button className="w-full">
                    Open Content Manager
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Healthy</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Available</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Types</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Redirects</span>
                  <span className="text-sm font-medium">{stats.by_renderer.redirect || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Articles</span>
                  <span className="text-sm font-medium">{stats.by_renderer.article || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Images</span>
                  <span className="text-sm font-medium">{stats.by_renderer.image || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cards</span>
                  <span className="text-sm font-medium">{stats.by_renderer.card || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}