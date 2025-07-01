'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  BarChart3,
  Eye,
  Link as LinkIcon,
  Star,
  Home,
  LogOut,
  User,
  Upload,
  Image as ImageIcon,
  Users,
  Layout,
  FileText,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { ThemeToggle } from '@/components/ThemeToggle';
import UsersManagement from '@/components/UsersManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Image {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  alt_text?: string;
  caption?: string;
  file_size: number;
  mime_type: string;
  created_at: Date;
  updated_at: Date;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: 'draft' | 'published';
  featured_image_url?: string;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  description?: string;
  is_landing: boolean;
  theme: string;
  created_at: Date;
  updated_at: Date;
}

export default function AdminDevDashboard() {
  const [activeTab, setActiveTab] = useState<'links' | 'landing' | 'pages' | 'images' | 'posts' | 'analytics' | 'users'>('links');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading] = useState(false);

  // New tab state
  const [images, setImages] = useState<Image[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [filteredImages, setFilteredImages] = useState<Image[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [filteredPages, setFilteredPages] = useState<Page[]>([]);

  // Mock user for dev
  const user = { email: 'admin@yourcompany.com' };

  useEffect(() => {
    if (activeTab === 'images') fetchImages();
    if (activeTab === 'posts') fetchPosts();
    if (activeTab === 'pages') fetchPages();
  }, [activeTab]);

  const fetchImages = async () => {
    try {
      const response = await fetch('/api/admin/images');
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
        setFilteredImages(data.images || []);
      } else {
        toast.error('Failed to fetch images');
      }
    } catch {
      // Handle error silently
      toast.error('Error fetching images');
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/admin/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
        setFilteredPosts(data.posts || []);
      } else {
        toast.error('Failed to fetch posts');
      }
    } catch {
      // Handle error silently
      toast.error('Error fetching posts');
    }
  };

  const fetchPages = async () => {
    try {
      const response = await fetch('/api/admin/pages');
      if (response.ok) {
        const data = await response.json();
        setPages(data.data || []);
        setFilteredPages(data.data || []);
      } else {
        toast.error('Failed to fetch pages');
      }
    } catch {
      // Handle error silently
      toast.error('Error fetching pages');
    }
  };

  // Images Interface Component
  const ImagesInterface = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border bg-card hover:bg-accent/5 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <ImageIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Images</p>
                <p className="text-2xl font-bold text-foreground">{images.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card hover:bg-accent/5 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Upload className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold text-foreground">
                  {(images.reduce((sum, img) => sum + img.file_size, 0) / (1024 * 1024)).toFixed(1)}MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card hover:bg-accent/5 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">File Types</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(images.map(img => img.mime_type)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" />
          Upload Images
        </Button>
      </div>

      {/* Images Grid */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Images ({filteredImages.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {filteredImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredImages.map((image) => (
                <div key={image.id} className="group relative">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted relative">
                    <Image 
                      src={image.url} 
                      alt={image.alt_text || image.original_name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 truncate">{image.original_name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No images match your search.' : 'No images uploaded yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Posts Interface Component
  const PostsInterface = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border bg-card hover:bg-accent/5 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold text-foreground">{posts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card hover:bg-accent/5 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Eye className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-foreground">
                  {posts.filter(post => post.status === 'published').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card hover:bg-accent/5 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <Edit className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-foreground">
                  {posts.filter(post => post.status === 'draft').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Posts List */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Posts ({filteredPosts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {filteredPosts.length > 0 ? (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground">{post.title}</h3>
                      <span className={cn(
                        'px-2 py-1 text-xs rounded-full',
                        post.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      )}>
                        {post.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">/{post.slug}</p>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {post.status === 'published' && post.published_at 
                        ? `Published ${new Date(post.published_at).toLocaleDateString()}`
                        : `Created ${new Date(post.created_at).toLocaleDateString()}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No posts match your search.' : 'No posts created yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Pages Interface Component
  const PagesInterface = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border bg-card hover:bg-accent/5 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Layout className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Pages</p>
                <p className="text-2xl font-bold text-foreground">{pages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card hover:bg-accent/5 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Home className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Landing Pages</p>
                <p className="text-2xl font-bold text-foreground">
                  {pages.filter(page => page.is_landing).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card hover:bg-accent/5 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-foreground">
                  {pages.filter(page => 
                    new Date(page.created_at).getMonth() === new Date().getMonth()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" />
          Create Page
        </Button>
      </div>

      {/* Pages List */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Pages ({filteredPages.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {filteredPages.length > 0 ? (
            <div className="space-y-4">
              {filteredPages.map((page) => (
                <div key={page.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground">{page.title}</h3>
                      {page.is_landing && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          <Star className="h-3 w-3 inline mr-1" />
                          Landing
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">/{page.slug}</p>
                    {page.description && (
                      <p className="text-sm text-muted-foreground">{page.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {new Date(page.created_at).toLocaleDateString()}
                      {page.updated_at !== page.created_at && (
                        <> • Updated {new Date(page.updated_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Layout className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No pages match your search.' : 'No pages created yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Single Clean Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              🔗
            </div>
            <div>
              <h1 className="text-lg font-bold font-heading text-foreground">GremlinLink Admin</h1>
              <p className="text-xs text-muted-foreground">Manage your links</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            <ThemeToggle />
            <Button variant="outline" size="sm" className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-screen-2xl px-4 py-8">
        {/* Primary Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('links')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'links'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                <LinkIcon className="h-4 w-4 inline mr-2" />
                Links
              </button>
              <button
                onClick={() => setActiveTab('landing')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'landing'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                <Layout className="h-4 w-4 inline mr-2" />
                Landing Page
              </button>
              <button
                onClick={() => setActiveTab('pages')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'pages'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                <Layout className="h-4 w-4 inline mr-2" />
                Pages
              </button>
              <button
                onClick={() => setActiveTab('images')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'images'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                <ImageIcon className="h-4 w-4 inline mr-2" />
                Images
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'posts'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                <Edit className="h-4 w-4 inline mr-2" />
                Posts
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'users'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Users
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'analytics' ? (
          <AnalyticsDashboard />
        ) : activeTab === 'users' ? (
          <UsersManagement />
        ) : activeTab === 'images' ? (
          <ImagesInterface />
        ) : activeTab === 'posts' ? (
          <PostsInterface />
        ) : activeTab === 'pages' ? (
          <PagesInterface />
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Select a tab to view content</p>
          </div>
        )}
      </main>
    </div>
  );
}