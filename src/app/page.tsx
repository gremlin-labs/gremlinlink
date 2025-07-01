'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, Copy, Eye, Image as ImageIcon, Home as HomeIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconRenderer } from '@/components/IconRenderer';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import type { ContentBlock } from '@/lib/db/schema';
import Image from 'next/image';

interface DefaultLink {
  id: string;
  slug: string;
  target_url: string;
  title: string;
  description?: string;
  clicks_count: number;
  is_active: boolean;
  display_order?: number;
  icon?: string;
  image_url?: string;
}

export default function Home() {
  const [landingBlock, setLandingBlock] = useState<ContentBlock | null>(null);
  const [publicBlocks, setPublicBlocks] = useState<ContentBlock[]>([]);
  const [defaultLinks, setDefaultLinks] = useState<DefaultLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLandingBlock, setHasLandingBlock] = useState(false);

  useEffect(() => {
    fetchLandingData();
  }, []);

  const fetchLandingData = async () => {
    try {
      // Use the public landing status endpoint
      const response = await fetch('/api/landing-status');
      if (response.ok) {
        const data = await response.json();
        
        if (data.hasLandingBlock && data.landingBlock) {
          setLandingBlock(data.landingBlock);
          setHasLandingBlock(true);
        } else {
          // No landing block, use the public blocks from the same response
          setPublicBlocks(data.publicBlocks || []);
          setHasLandingBlock(false);
        }
      } else {
        // Fallback to default links if landing status API fails
        const fallbackResponse = await fetch('/api/links/default');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setDefaultLinks(fallbackData.links || []);
        }
        setHasLandingBlock(false);
      }
    } catch {
      // Silent error handling - don't log to console
      // Fallback to default links
      try {
        const response = await fetch('/api/links/default');
        if (response.ok) {
          const data = await response.json();
          setDefaultLinks(data.links || []);
        }
      } catch {
        // Silent error handling for fallback
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleLinkClick = async (link: DefaultLink) => {
    // Track click and redirect
    try {
      await fetch(`/${link.slug}`, { method: 'HEAD' });
    } catch {
      // Ignore tracking errors
    }
    window.open(link.target_url, '_blank');
  };

  const handleBlockClick = (block: ContentBlock) => {
    window.open(`/${block.slug}`, '_blank');
  };

  const getBlockTitle = (block: ContentBlock): string => {
    const data = block.data as Record<string, unknown>;
    const metadata = block.metadata as Record<string, unknown>;
    
    switch (block.renderer) {
      case 'redirect':
        return (data.cardTitle as string) || (metadata.title as string) || extractDomain(data.url as string) || 'Redirect';
      case 'article':
        return (data.title as string) || (metadata.title as string) || 'Article';
      case 'image':
        return (data.alt as string) || (metadata.title as string) || 'Image';
      case 'gallery':
        return (metadata.title as string) || `Gallery (${(data.images as unknown[])?.length || 0} images)`;
      case 'card':
        return (data.title as string) || (metadata.title as string) || 'Card';
      default:
        return (metadata.title as string) || block.renderer;
    }
  };

  const getBlockDescription = (block: ContentBlock): string => {
    const data = block.data as Record<string, unknown>;
    const metadata = block.metadata as Record<string, unknown>;
    
    switch (block.renderer) {
      case 'redirect':
        return (data.cardDescription as string) || (metadata.description as string) || `→ ${data.url}`;
      case 'article':
        return (data.excerpt as string) || (metadata.description as string) || 'Article content';
      case 'image':
        return (data.caption as string) || (metadata.description as string) || 'Image';
      case 'gallery':
        return (metadata.description as string) || `Gallery with ${(data.images as unknown[])?.length || 0} images`;
      case 'card':
        return (data.description as string) || (metadata.description as string) || 'Card content';
      default:
        return (metadata.description as string) || 'Content block';
    }
  };

  const extractDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const getBlockIcon = (block: ContentBlock) => {
    switch (block.renderer) {
      case 'redirect':
        return <ExternalLink className="h-6 w-6" />;
      case 'article':
        return <div className="text-lg font-bold">A</div>;
      case 'image':
        return <ImageIcon className="h-6 w-6" />;
      case 'gallery':
        return <div className="text-lg font-bold">G</div>;
      case 'card':
        return <div className="text-lg font-bold">C</div>;
      case 'page':
        return <div className="text-lg font-bold">P</div>;
      default:
        return <div className="text-lg font-bold">{block.renderer[0].toUpperCase()}</div>;
    }
  };

  const getBlockIconColor = (block: ContentBlock): string => {
    switch (block.renderer) {
      case 'redirect':
        return 'bg-gray-900 text-white'; // X/Twitter style
      case 'article':
        return 'bg-blue-500 text-white';
      case 'image':
        return 'bg-gray-600 text-white';
      case 'gallery':
        return 'bg-green-500 text-white';
      case 'card':
        return 'bg-orange-500 text-white';
      case 'page':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  const getLinkIconColor = (link: DefaultLink): string => {
    // Try to determine color based on URL domain or title
    const url = link.target_url.toLowerCase();
    const title = link.title.toLowerCase();
    
    if (url.includes('twitter.com') || url.includes('x.com') || title.includes('twitter') || title.includes('x.com')) {
      return 'bg-gray-900 text-white';
    } else if (url.includes('github.com') || title.includes('github')) {
      return 'bg-gray-800 text-white';
    } else if (url.includes('linkedin.com') || title.includes('linkedin')) {
      return 'bg-blue-600 text-white';
    } else if (url.includes('instagram.com') || title.includes('instagram')) {
      return 'bg-pink-500 text-white';
    } else if (url.includes('youtube.com') || title.includes('youtube')) {
      return 'bg-red-500 text-white';
    } else if (url.includes('facebook.com') || title.includes('facebook')) {
      return 'bg-blue-500 text-white';
    } else if (url.includes('tiktok.com') || title.includes('tiktok')) {
      return 'bg-gray-900 text-white';
    } else if (url.includes('discord.com') || title.includes('discord')) {
      return 'bg-indigo-500 text-white';
    } else if (url.includes('twitch.tv') || title.includes('twitch')) {
      return 'bg-purple-500 text-white';
    } else if (url.includes('spotify.com') || title.includes('spotify')) {
      return 'bg-green-500 text-white';
    } else {
      // Default colors based on first letter of title
      const firstLetter = link.title.charAt(0).toLowerCase();
      const colors = [
        'bg-blue-500 text-white',
        'bg-green-500 text-white', 
        'bg-purple-500 text-white',
        'bg-orange-500 text-white',
        'bg-pink-500 text-white',
        'bg-indigo-500 text-white',
        'bg-red-500 text-white',
        'bg-yellow-500 text-white',
        'bg-teal-500 text-white',
        'bg-cyan-500 text-white',
      ];
      return colors[firstLetter.charCodeAt(0) % colors.length];
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header - Always visible */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 w-full">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              G
            </div>
            <div>
              <h1 className="text-lg font-bold font-heading text-foreground">gremlin.link</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      {hasLandingBlock && landingBlock ? (
        // Landing block content
        <div className="min-h-[calc(100vh-4rem)]">
          <BlockRenderer block={landingBlock} mode="view" />
        </div>
      ) : (
        // Default content with hero section
        <>
          {/* Hero Section */}
      <section className="px-4 py-16 md:py-24 w-full">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6">
            <div className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
              <span className="mr-2 h-2 w-2 rounded-full bg-primary"></span>
              {publicBlocks.length > 0 ? 'Content Index' : 'Personal Link Hub'}
            </div>
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl font-heading">
            {publicBlocks.length > 0 ? (
              <>
                Welcome to{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  gremlin.link
                </span>
              </>
            ) : (
              <>
                Welcome to my{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  link hub
                </span>
              </>
            )}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
            {publicBlocks.length > 0 
              ? 'Explore all available content and links. Click any item to visit or view the content.'
              : 'Quick access to my most important links and social profiles. Click any card to visit the destination.'
            }
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-4 pb-16 w-full">
        {publicBlocks.length > 0 ? (
          <div className="container mx-auto px-4">
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
              {publicBlocks.map((block) => (
                <Card 
                  key={block.id} 
                  className="group relative overflow-hidden border-0 bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 cursor-pointer rounded-2xl w-full min-w-0"
                  onClick={() => handleBlockClick(block)}
                >
                  <CardContent className="p-6">
                    {/* Icon */}
                    <div className="flex items-center justify-between mb-6">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getBlockIconColor(block)}`}>
                        {getBlockIcon(block)}
                      </div>
                      <Badge variant="outline" className="text-xs bg-muted/50 border-muted">
                        {block.renderer}
                      </Badge>
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground text-lg leading-tight">
                        {getBlockTitle(block)}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground font-mono bg-muted/30 px-2 py-1 rounded-md inline-block">
                        /{block.slug}
                      </p>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {getBlockDescription(block)}
                      </p>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span>View content</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(block.slug);
                        }}
                        className="h-7 px-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/20 rounded-2xl transition-colors pointer-events-none" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : defaultLinks.length > 0 ? (
          <div className="container mx-auto px-4">
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
              {defaultLinks
                .filter(link => link.is_active)
                .map((link) => (
                  <Card 
                    key={link.id} 
                    className="group relative overflow-hidden border-0 bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 cursor-pointer rounded-2xl w-full min-w-0"
                    onClick={() => handleLinkClick(link)}
                  >
                    <CardContent className="p-8">
                      {/* Icon */}
                      <div className="flex items-center justify-between mb-6">
                        {link.image_url && link.image_url.trim() !== '' ? (
                          <div className="h-12 w-12 rounded-2xl overflow-hidden bg-muted">
                            <Image 
                              src={link.image_url} 
                              alt={link.title}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : link.icon ? (
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getLinkIconColor(link)}`}>
                            <IconRenderer 
                              iconName={link.icon} 
                              className="h-6 w-6" 
                              fallback={<span className="text-xl">{link.icon}</span>}
                            />
                          </div>
                        ) : (
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getLinkIconColor(link)}`}>
                            <ExternalLink className="h-6 w-6" />
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs bg-muted/50 border-muted">
                          redirect
                        </Badge>
                      </div>
                      
                      {/* Content */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-lg leading-tight">
                          {link.title}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground font-mono bg-muted/30 px-2 py-1 rounded-md inline-block">
                          /{link.slug}
                        </p>
                        
                        {link.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                            {link.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          <span>{link.clicks_count} clicks</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(link.slug);
                          }}
                          className="h-7 px-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/20 rounded-2xl transition-colors pointer-events-none" />
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-md text-center">
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <HomeIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Welcome to GremlinLink</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This is the default landing page. The site owner can set any content block as the landing page, 
                or you&apos;ll see an index of all public content here.
              </p>
              <div className="text-xs text-muted-foreground">
                <p>• No landing block is currently set</p>
                <p>• No public content blocks available</p>
                <p>• No default links configured</p>
              </div>
            </div>
          </div>
        )}
      </section>
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="px-2 py-2 w-full">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Powered by{' '}
              <span className="font-semibold text-primary font-heading">gremlin.link</span>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}