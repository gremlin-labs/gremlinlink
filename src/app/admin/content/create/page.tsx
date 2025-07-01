'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

// Step Components
import { UrlCreation } from '@/components/content-creator/UrlCreation';
import { ContentTypeSelection } from '@/components/content-creator/ContentTypeSelection';
import { ContentConfiguration } from '@/components/content-creator/ContentConfiguration';

// Types
interface ContentCreatorState {
  step: 'url' | 'type' | 'configure';
  slug: string;
  contentType: string | null;
  formData: Record<string, unknown>;
  isDirty: boolean;
}

export default function CreateContentPage() {
  const router = useRouter();
  const [state, setState] = useState<ContentCreatorState>({
    step: 'url',
    slug: '',
    contentType: null,
    formData: {},
    isDirty: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const updateState = (updates: Partial<ContentCreatorState>) => {
    setState(prev => ({ ...prev, ...updates, isDirty: true }));
  };

  const handleUrlContinue = (slug: string) => {
    updateState({ slug, step: 'type' });
  };

  const handleTypeSelect = (contentType: string) => {
    updateState({ 
      contentType, 
      step: 'configure',
      formData: getDefaultFormData(contentType),
    });
  };

  const handleBack = () => {
    if (state.step === 'type') {
      updateState({ step: 'url' });
    } else if (state.step === 'configure') {
      updateState({ step: 'type' });
    }
  };

  const handleSave = async (publish = false) => {
    if (!state.slug || !state.contentType) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: state.slug,
          type: state.contentType,
          data: state.formData,
          publish,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(publish ? 'Content published successfully!' : 'Content saved as draft!');
        router.push(`/admin/content/${result.block.id}/edit`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to save content');
      }
    } catch {
      toast.error('Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const getStepNumber = () => {
    switch (state.step) {
      case 'url': return 1;
      case 'type': return 2;
      case 'configure': return 3;
      default: return 1;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create Content</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Set up your new content in just a few steps
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6 sm:mb-8">
          {/* Progress Bar */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      getStepNumber() >= step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step}
                  </div>
                  {index < 2 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors ${
                        getStepNumber() > step ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Labels */}
          <div className="flex justify-between mt-2 text-xs lg:text-sm text-muted-foreground px-2">
            <span className={`${state.step === 'url' ? 'text-foreground font-medium' : ''} text-center`}>
              Choose URL
            </span>
            <span className={`${state.step === 'type' ? 'text-foreground font-medium' : ''} text-center`}>
              Content Type
            </span>
            <span className={`${state.step === 'configure' ? 'text-foreground font-medium' : ''} text-center`}>
              Configure
            </span>
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-3 sm:p-4 lg:p-6 border-0 shadow-sm">
          <AnimatePresence mode="wait">
            {state.step === 'url' && (
              <motion.div
                key="url"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <UrlCreation onContinue={handleUrlContinue} />
              </motion.div>
            )}

            {state.step === 'type' && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ContentTypeSelection onSelect={handleTypeSelect} />
              </motion.div>
            )}

            {state.step === 'configure' && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ContentConfiguration
                  slug={state.slug}
                  contentType={state.contentType!}
                  formData={state.formData}
                  onChange={(data: Record<string, unknown>) => updateState({ formData: data })}
                  onSave={handleSave}
                  isSaving={isSaving}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Navigation */}
        {(state.step === 'type' || state.step === 'configure') && (
          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4 sm:mt-6">
            <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {state.step === 'configure' && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  Save Draft
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? 'Publishing...' : 'Publish'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get default form data based on content type
function getDefaultFormData(contentType: string): Record<string, unknown> {
  switch (contentType) {
    case 'redirect':
      return {
        data: {
          url: '',
          statusCode: 302,
          cardTitle: '',
          cardDescription: '',
          cardImage: null,
          icon: '',
        },
        metadata: {
          title: '',
          description: '',
          image: null,
        },
      };
    case 'article':
      return {
        title: '',
        content: [],
        excerpt: '',
        coverImage: null,
        metadata: {
          author: '',
          publishDate: new Date(),
          tags: [],
          seoTitle: '',
          seoDescription: '',
          ogImage: null,
        },
        settings: {
          showTableOfContents: false,
          enableComments: false,
          customCSS: '',
        },
      };
    case 'image':
      return {
        data: {
          image: null,
          alt: '',
          caption: '',
          clickAction: 'lightbox',
          linkUrl: '',
        },
        metadata: {
          title: '',
          description: '',
        },
      };
    case 'card':
      return {
        title: '',
        description: '',
        url: '',
        image: null,
        icon: null,
        style: {
          theme: 'default',
          backgroundColor: '',
          textColor: '',
          accentColor: '',
        },
        metadata: {
          buttonText: 'Visit',
          newWindow: true,
        },
      };
    case 'gallery':
      return {
        images: [],
        layout: 'grid',
        settings: {
          columns: 3,
          gap: 16,
          lightbox: true,
          captions: true,
          infinite: false,
          autoplay: false,
          autoplaySpeed: 3000,
        },
        metadata: {
          title: '',
          description: '',
        },
      };
    case 'page':
      return {
        blocks: [],
        settings: {
          theme: 'default',
          layout: 'centered',
          maxWidth: '1200px',
          backgroundColor: '',
          customCSS: '',
        },
      };
    default:
      return {};
  }
} 