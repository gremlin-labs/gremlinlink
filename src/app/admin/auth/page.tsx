'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle } from 'lucide-react';

export default function AdminAuthPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setEmailSent(true);
      } else {
        setError(data.error || 'Failed to send magic link');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              We&apos;ve sent a magic link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Click the link in your email to sign in. The link will expire in 15 minutes.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
              className="w-full"
            >
              Send another link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Admin Sign In</CardTitle>
          <p className="text-muted-foreground">
            Enter your email to receive a magic link
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Admin authentication form">
            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md" role="alert">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@yourcompany.com"
                required
                autoComplete="email"
                className="w-full"
                style={{ backgroundColor: 'var(--color-input-contrast)' }}
              />
            </div>
            <Button type="submit" disabled={loading || !email} className="w-full">
              {loading ? 'Sending...' : 'Send Magic Link'}
            </Button>
          </form>
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Only authorized email domains can access this admin panel.
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 