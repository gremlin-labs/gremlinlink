'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface DefaultLink {
  id: string;
  title: string;
  url: string;
  description?: string;
}

/**
 * LandingDetector Component
 * 
 * This component detects the presence of the 'gremlin_landing' cookie
 * and displays a beautiful overlay showcasing default links.
 * 
 * It's designed to be embedded in the root layout to work across all pages.
 */
export default function LandingDetector() {
  const [isVisible, setIsVisible] = useState(false);
  const [triggerSlug, setTriggerSlug] = useState<string | null>(null);
  const [defaultLinks, setDefaultLinks] = useState<DefaultLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for landing cookie on component mount and periodically
    const checkForLandingCookie = () => {
      const cookies = document.cookie.split(';');
      const landingCookie = cookies.find(cookie => 
        cookie.trim().startsWith('gremlin_landing=')
      );

      if (landingCookie && !isVisible) {
        const slug = landingCookie.split('=')[1];
        setTriggerSlug(slug);
        setIsVisible(true);

        // Clear the landing cookie immediately to prevent re-triggering
        document.cookie = 'gremlin_landing=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

        // Fetch default links
        fetchDefaultLinks();

        // Auto-close after 3 seconds for optimal UX
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, 3000);

        return () => clearTimeout(timer);
      }
    };

    // Check immediately
    checkForLandingCookie();

    // Check periodically in case the cookie is set after initial load
    const interval = setInterval(checkForLandingCookie, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  const fetchDefaultLinks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/links/default');
      if (response.ok) {
        const links = await response.json();
        setDefaultLinks(links);
      } else {
        throw new Error('Failed to fetch links');
      }
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      // Fallback to demo links for graceful degradation
      setDefaultLinks([
        {
          id: 'demo-1',
          title: 'GitHub',
          url: 'https://github.com',
          description: 'Code repositories and projects',
        },
        {
          id: 'demo-2',
          title: 'LinkedIn',
          url: 'https://linkedin.com',
          description: 'Professional network',
        },
        {
          id: 'demo-3',
          title: 'Portfolio',
          url: 'https://example.com',
          description: 'Personal website and portfolio',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleLinkClick = (url: string) => {
    // Open in new tab without affecting the current redirect
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md transform animate-in fade-in-0 zoom-in-95 duration-300">
        <Card className="shadow-2xl">
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                🔗 GremlinLink
              </h2>
              {triggerSlug && (
                <p className="text-sm text-primary font-medium">
                  You clicked: /{triggerSlug}
                </p>
              )}
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          {/* Content */}
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground">
                While you&apos;re here, check out these links:
              </p>
            </div>

            {/* Default Links Collection */}
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {defaultLinks.map((link) => (
                  <Button
                    key={link.id}
                    onClick={() => handleLinkClick(link.url)}
                    variant="outline"
                    className="flex w-full items-center justify-between p-3 h-auto text-left group"
                  >
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
            )}

            {/* Footer */}
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                This window will close automatically
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}