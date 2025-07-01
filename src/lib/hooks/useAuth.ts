import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  user_id: string;
  email: string;
  name: string | null;
  is_active: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/auth/me');
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        // Not authenticated, redirect to auth page
        router.push('/admin/auth');
      }
    } catch {
      // Auth check failed
      router.push('/admin/auth');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/auth');
    } catch {
      // Still redirect even if logout fails
      router.push('/admin/auth');
    }
  };

  return {
    user,
    loading,
    logout,
    checkAuth,
  };
} 