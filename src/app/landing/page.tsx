'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { IconRenderer } from '@/components/IconRenderer';
import Image from 'next/image';

interface DefaultLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  image_url?: string;
  icon?: string;
}

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [triggerSlug, setTriggerSlug] = useState<string | null>(null);
  const [defaultLinks, setDefaultLinks] = useState<DefaultLink[]>([]);

  useEffect(() => {
    // Check for landing cookie to determine if we should show the landing page
    const cookies = document.cookie.split(';');
    const landingCookie = cookies.find(cookie => 
      cookie.trim().startsWith('gremlin_landing=')
    );

    if (landingCookie) {
      const slug = landingCookie.split('=')[1];
      setTriggerSlug(slug);
      setIsVisible(true);

      // Clear the landing cookie immediately
      document.cookie = 'gremlin_landing=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

      // Fetch default links
      fetchDefaultLinks();

      // Auto-close after 3 seconds (slightly longer for better UX)
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const fetchDefaultLinks = async () => {
    try {
      const response = await fetch('/api/links/default');
      if (response.ok) {
        const links = await response.json();
        setDefaultLinks(links);
      }
    } catch {
      // Silent error handling - don't log to console
      // Fallback to hardcoded links for demo
      setDefaultLinks([
        {
          id: '1',
          title: 'GitHub',
          url: 'https://github.com',
          description: 'Code repositories and projects',
        },
        {
          id: '2',
          title: 'LinkedIn',
          url: 'https://linkedin.com',
          description: 'Professional network',
        },
        {
          id: '3',
          title: 'Portfolio',
          url: 'https://example.com',
          description: 'Personal website and portfolio',
        },
      ]);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md transform animate-in fade-in-0 zoom-in-95 duration-200">
        <Card className="shadow-xl">
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Welcome to GremlinLink
              </h2>
              {triggerSlug && (
                <p className="text-sm text-muted-foreground">
                  You clicked: /{triggerSlug}
                </p>
              )}
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          {/* Default Links Collection */}
          <CardContent className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              Explore More Links
            </h3>
            <div className="space-y-2">
              {defaultLinks.map((link) => (
                <Button
                  key={link.id}
                  onClick={() => handleLinkClick(link.url)}
                  variant="outline"
                  className="flex w-full items-center gap-3 p-3 h-auto text-left group"
                >
                  {/* Image or Icon */}
                  {link.image_url ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                      <Image 
                        src={link.image_url} 
                        alt={link.title}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {link.icon ? (
                        <IconRenderer 
                          iconName={link.icon} 
                          className="h-5 w-5" 
                          fallback={<span className="text-lg">{link.icon}</span>}
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {link.title}
                    </div>
                    {link.description && (
                      <div className="text-sm text-muted-foreground">
                        {link.description}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                This window will close automatically in a few seconds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}