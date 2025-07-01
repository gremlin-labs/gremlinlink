'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  FileText, 
  Images, 
  Layout,
  ArrowUpRight,
  Zap,
  FileImage,
} from 'lucide-react';

interface ContentType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  comingSoon?: boolean;
  popular?: boolean;
}

interface ContentTypeSelectionProps {
  onSelect: (contentType: string) => void;
}

const contentTypes: ContentType[] = [
  {
    id: 'redirect',
    name: 'Redirect',
    icon: <ExternalLink className="w-6 h-6" />,
    description: 'Classic URL shortener. Instantly redirect visitors to another website.',
    features: ['Analytics tracking', 'Custom metadata', 'UTM preservation'],
    popular: true,
  },
  {
    id: 'article',
    name: 'Article',
    icon: <FileText className="w-6 h-6" />,
    description: 'Write rich content with images, formatting, and embedded media.',
    features: ['Rich text editor', 'SEO optimization', 'Table of contents'],
    popular: true,
  },
  {
    id: 'image',
    name: 'Image',
    icon: <FileImage className="w-6 h-6" />,
    description: 'Display a single image with optional caption and link.',
    features: ['Auto-optimization', 'Lightbox view', 'Custom sizing'],
  },

  {
    id: 'gallery',
    name: 'Gallery',
    icon: <Images className="w-6 h-6" />,
    description: 'Showcase multiple images in a customizable layout.',
    features: ['Multiple layouts', 'Lightbox gallery', 'Drag & drop sorting'],
  },
  {
    id: 'page',
    name: 'Page',
    icon: <Layout className="w-6 h-6" />,
    description: 'Compose a full page by combining multiple content blocks.',
    features: ['Block-based editor', 'Custom layouts', 'Advanced styling'],
  },
];

export function ContentTypeSelection({ onSelect }: ContentTypeSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">What type of content?</h2>
        <p className="text-muted-foreground">
          Choose how your URL will behave
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contentTypes.map((type) => (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
              type.comingSoon 
                ? 'opacity-60 cursor-not-allowed bg-card' 
                : 'hover:border-primary/50 bg-[var(--color-card-elevated)]'
            }`}
            onClick={() => !type.comingSoon && onSelect(type.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    type.comingSoon 
                      ? 'bg-muted text-muted-foreground' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {type.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {type.name}
                      {type.popular && (
                        <Badge variant="secondary" className="text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                      {type.comingSoon && (
                        <Badge variant="outline" className="text-xs">
                          Coming Soon
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                </div>
                {!type.comingSoon && (
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <CardDescription className="text-sm leading-relaxed">
                {type.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Features
                </p>
                <div className="flex flex-wrap gap-1">
                  {type.features.map((feature, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs px-2 py-0.5"
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">5</div>
          <div className="text-xs text-muted-foreground">Content Types</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">∞</div>
          <div className="text-xs text-muted-foreground">Possibilities</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">0</div>
          <div className="text-xs text-muted-foreground">Code Required</div>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-center text-xs text-muted-foreground">
        <p>Not sure which to choose? Start with a <strong>Redirect</strong> for simple link shortening,</p>
        <p>or try an <strong>Article</strong> for rich content creation.</p>
      </div>
    </div>
  );
} 