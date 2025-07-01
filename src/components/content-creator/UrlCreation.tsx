'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, X, Lightbulb, RefreshCw } from 'lucide-react';

interface UrlCreationProps {
  onContinue: (slug: string) => void;
}

export function UrlCreation({ onContinue }: UrlCreationProps) {
  const [slug, setSlug] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Slugify function
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  // Fetch URL suggestions
  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/admin/url-suggestions?count=5');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      } else {
        // Fallback to static suggestions
        setSuggestions([
          'amazing-project',
          'brilliant-idea',
          'creative-venture',
          'dynamic-solution',
          'elegant-design',
        ]);
      }
    } catch {
      // Fallback to static suggestions on error
      setSuggestions([
        'amazing-project',
        'brilliant-idea',
        'creative-venture',
        'dynamic-solution',
        'elegant-design',
      ]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Load initial suggestions
  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Check slug availability with debouncing
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const response = await fetch(`/api/admin/content/check-slug?slug=${encodeURIComponent(slug)}`);
        const result = await response.json();
        setIsAvailable(result.available);
      } catch {
        // Handle error silently and reset availability state
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleInputChange = (value: string) => {
    const slugified = slugify(value);
    setSlug(slugified);
  };

  const handleContinue = () => {
    if (slug && isAvailable) {
      onContinue(slug);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && slug && isAvailable) {
      handleContinue();
    }
  };

  const getAvailabilityIcon = () => {
    if (isChecking) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    if (isAvailable === true) return <Check className="w-4 h-4 text-green-500" />;
    if (isAvailable === false) return <X className="w-4 h-4 text-red-500" />;
    return null;
  };

  const getAvailabilityMessage = () => {
    if (isChecking) return 'Checking availability...';
    if (isAvailable === true) return 'Available!';
    if (isAvailable === false) return 'This URL is already taken. Try another!';
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Create Something New</h2>
        <p className="text-muted-foreground">
          Everything starts with a URL. What would you like to call it?
        </p>
      </div>

      <div className="space-y-4">
        {/* URL Preview */}
        <div className="p-4 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
          <div className="text-center">
            <span className="text-muted-foreground">gremlin.link/</span>
            <span className="font-mono font-medium">
              {slug || '_'}
            </span>
          </div>
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug</Label>
          <div className="relative">
            <Input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="my-awesome-thing"
              className="pr-10"
              style={{ backgroundColor: 'var(--color-input-contrast)' }}
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getAvailabilityIcon()}
            </div>
          </div>
          
          {/* Availability Message */}
          {getAvailabilityMessage() && (
            <p className={`text-sm ${
              isAvailable === true ? 'text-green-600' : 
              isAvailable === false ? 'text-red-600' : 
              'text-muted-foreground'
            }`}>
              {getAvailabilityMessage()}
            </p>
          )}
        </div>

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!slug || !isAvailable || isChecking}
          className="w-full"
          size="lg"
        >
          Continue →
        </Button>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lightbulb className="w-4 h-4" />
            <span>Need inspiration?</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSuggestions}
            disabled={isLoadingSuggestions}
            className="h-8 px-2"
          >
            {isLoadingSuggestions ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => setSlug(suggestion)}
              className="text-xs h-7"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>💡 <strong>Tips:</strong> Keep it short, memorable, and relevant</p>
        <p>Use letters, numbers, and hyphens only</p>
      </div>
    </div>
  );
} 