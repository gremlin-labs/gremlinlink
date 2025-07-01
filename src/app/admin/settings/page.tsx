'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon,

  Shield,
  Mail,
  Globe,

  Save,
} from 'lucide-react';

interface SettingsData {
  general: {
    siteName: string;
    siteUrl: string;
    siteDescription: string;
  };
  security: {
    requireAuth: boolean;
    enableRateLimit: boolean;
    enableAnalytics: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
  };
  domain: {
    customDomain: string;
    forceHttps: boolean;
  };
}

export default function SettingsPage() {
  const { loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<SettingsData>({
    general: {
      siteName: 'GremlinLink',
      siteUrl: 'https://gremlin.link',
      siteDescription: 'A powerful URL shortener and content management system',
    },
    security: {
      requireAuth: true,
      enableRateLimit: true,
      enableAnalytics: true,
    },
    email: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUsername: 'your-email@example.com',
      smtpPassword: '',
    },
    domain: {
      customDomain: 'your-domain.com',
      forceHttps: true,
    },
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch {
      // Handle error silently
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch {
      // Handle error silently
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (section: keyof SettingsData, field: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  if (authLoading || isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Configure your application settings and preferences
            </p>
          </div>
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="site-name">Site Name</Label>
                <Input
                  id="site-name"
                  value={settings.general.siteName}
                  onChange={(e) => updateSettings('general', 'siteName', e.target.value)}
                  placeholder="GremlinLink"
                  className="bg-[var(--color-input-contrast)]"
                />
              </div>
              <div>
                <Label htmlFor="site-url">Site URL</Label>
                <Input
                  id="site-url"
                  value={settings.general.siteUrl}
                  onChange={(e) => updateSettings('general', 'siteUrl', e.target.value)}
                  placeholder="https://gremlin.link"
                  className="bg-[var(--color-input-contrast)]"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="site-description">Site Description</Label>
              <Textarea
                id="site-description"
                value={settings.general.siteDescription}
                onChange={(e) => updateSettings('general', 'siteDescription', e.target.value)}
                placeholder="A powerful URL shortener and content management system"
                className="bg-[var(--color-input-contrast)]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-[var(--color-card-elevated)]">
              <div>
                <Label>Require Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Require users to sign in to create content
                </p>
              </div>
              <Checkbox 
                checked={settings.security.requireAuth}
                onCheckedChange={(checked) => updateSettings('security', 'requireAuth', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-[var(--color-card-elevated)]">
              <div>
                <Label>Enable Rate Limiting</Label>
                <p className="text-sm text-muted-foreground">
                  Limit the number of requests per user
                </p>
              </div>
              <Checkbox 
                checked={settings.security.enableRateLimit}
                onCheckedChange={(checked) => updateSettings('security', 'enableRateLimit', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-[var(--color-card-elevated)]">
              <div>
                <Label>Enable Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Track clicks and user behavior
                </p>
              </div>
              <Checkbox 
                checked={settings.security.enableAnalytics}
                onCheckedChange={(checked) => updateSettings('security', 'enableAnalytics', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  value={settings.email.smtpHost}
                  onChange={(e) => updateSettings('email', 'smtpHost', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="bg-[var(--color-input-contrast)]"
                />
              </div>
              <div>
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={settings.email.smtpPort}
                  onChange={(e) => updateSettings('email', 'smtpPort', parseInt(e.target.value))}
                  placeholder="587"
                  className="bg-[var(--color-input-contrast)]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-user">SMTP Username</Label>
                <Input
                  id="smtp-user"
                  type="email"
                  value={settings.email.smtpUsername}
                  onChange={(e) => updateSettings('email', 'smtpUsername', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="bg-[var(--color-input-contrast)]"
                />
              </div>
              <div>
                <Label htmlFor="smtp-pass">SMTP Password</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  value={settings.email.smtpPassword}
                  onChange={(e) => updateSettings('email', 'smtpPassword', e.target.value)}
                  placeholder="••••••••"
                  className="bg-[var(--color-input-contrast)]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Domain Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="custom-domain">Custom Domain</Label>
              <Input
                id="custom-domain"
                value={settings.domain.customDomain}
                onChange={(e) => updateSettings('domain', 'customDomain', e.target.value)}
                placeholder="your-domain.com"
                className="bg-[var(--color-input-contrast)]"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Configure a custom domain for your short links
              </p>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-[var(--color-card-elevated)]">
              <div>
                <Label>Force HTTPS</Label>
                <p className="text-sm text-muted-foreground">
                  Redirect all HTTP traffic to HTTPS
                </p>
              </div>
              <Checkbox 
                checked={settings.domain.forceHttps}
                onCheckedChange={(checked) => updateSettings('domain', 'forceHttps', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button at Bottom */}
        <div className="flex justify-end">
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}