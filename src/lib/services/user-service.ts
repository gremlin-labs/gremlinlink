import { db } from '@/lib/db';
import { users, userSessions, magicLinks } from '@/lib/db/schema';
import { eq, desc, count, and, gte } from 'drizzle-orm';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  is_active: boolean;
  last_login?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithStats extends User {
  session_count: number;
  last_session?: Date | null;
  magic_link_count: number;
}

export interface CreateUserData {
  email: string;
  name?: string;
  is_active?: boolean;
}

export interface UpdateUserData extends Partial<CreateUserData> {
  id: string;
}

export class UserService {
  static async getAllUsers(): Promise<UserWithStats[]> {
    try {
      // Get all users with their session and magic link counts
      const usersData = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          is_active: users.is_active,
          last_login: users.last_login,
          created_at: users.created_at,
          updated_at: users.updated_at,
        })
        .from(users)
        .orderBy(desc(users.created_at));

      // Get session counts and last session for each user
      const usersWithStats = await Promise.all(
        usersData.map(async (user) => {
          // Count active sessions
          const sessionCountResult = await db
            .select({ count: count() })
            .from(userSessions)
            .where(
              and(
                eq(userSessions.user_id, user.id),
                gte(userSessions.expires_at, new Date())
              )
            );

          // Get last session
          const lastSessionResult = await db
            .select({ created_at: userSessions.created_at })
            .from(userSessions)
            .where(eq(userSessions.user_id, user.id))
            .orderBy(desc(userSessions.created_at))
            .limit(1);

          // Count magic links (last 30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const magicLinkCountResult = await db
            .select({ count: count() })
            .from(magicLinks)
            .where(
              and(
                eq(magicLinks.user_id, user.id),
                gte(magicLinks.created_at, thirtyDaysAgo)
              )
            );

          return {
            ...user,
            created_at: new Date(user.created_at),
            updated_at: new Date(user.updated_at),
            last_login: user.last_login ? new Date(user.last_login) : null,
            session_count: sessionCountResult[0]?.count || 0,
            last_session: lastSessionResult[0]?.created_at ? new Date(lastSessionResult[0].created_at) : null,
            magic_link_count: magicLinkCountResult[0]?.count || 0,
          };
        })
      );

      return usersWithStats;
    } catch {
      // Silent error handling - don't log to console
      throw new Error('Failed to fetch users');
    }
  }

  static async getUserById(id: string): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (result.length === 0) return null;

      const user = result[0];
      return {
        ...user,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        last_login: user.last_login ? new Date(user.last_login) : null,
      };
    } catch {
      // Silent error handling - don't log to console
      throw new Error('Failed to fetch user');
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (result.length === 0) return null;

      const user = result[0];
      return {
        ...user,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        last_login: user.last_login ? new Date(user.last_login) : null,
      };
    } catch {
      // Silent error handling - don't log to console
      throw new Error('Failed to fetch user');
    }
  }

  static async createUser(data: CreateUserData): Promise<User> {
    try {
      const normalizedEmail = data.email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await this.getUserByEmail(normalizedEmail);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const result = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          name: data.name || normalizedEmail.split('@')[0],
          is_active: data.is_active ?? true,
        })
        .returning();

      const user = result[0];
      return {
        ...user,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        last_login: user.last_login ? new Date(user.last_login) : null,
      };
    } catch (error) {
      // Silent error handling - don't log to console
      if (error instanceof Error && error.message === 'User with this email already exists') {
        throw error;
      }
      throw new Error('Failed to create user');
    }
  }

  static async updateUser(data: UpdateUserData): Promise<User> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date(),
      };

      // Only include fields that are provided
      if (data.email !== undefined) {
        updateData.email = data.email.toLowerCase().trim();
        
        // Check if email is already taken by another user
        if (data.email) {
          const existingUser = await this.getUserByEmail(data.email);
          if (existingUser && existingUser.id !== data.id) {
            throw new Error('Email is already taken by another user');
          }
        }
      }
      if (data.name !== undefined) updateData.name = data.name;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, data.id))
        .returning();

      if (result.length === 0) {
        throw new Error('User not found');
      }

      const user = result[0];
      return {
        ...user,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        last_login: user.last_login ? new Date(user.last_login) : null,
      };
    } catch (error) {
      // Silent error handling - don't log to console
      if (error instanceof Error && (
        error.message === 'User not found' || 
        error.message === 'Email is already taken by another user'
      )) {
        throw error;
      }
      throw new Error('Failed to update user');
    }
  }

  static async deleteUser(id: string): Promise<void> {
    try {
      // First, delete related records
      await db.delete(userSessions).where(eq(userSessions.user_id, id));
      await db.delete(magicLinks).where(eq(magicLinks.user_id, id));

      // Then delete the user
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error('User not found');
      }
    } catch (error) {
      // Silent error handling - don't log to console
      if (error instanceof Error && error.message === 'User not found') {
        throw error;
      }
      throw new Error('Failed to delete user');
    }
  }

  static async toggleUserStatus(id: string): Promise<User> {
    try {
      // Get current user
      const currentUser = await this.getUserById(id);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Toggle the status
      const result = await db
        .update(users)
        .set({ 
          is_active: !currentUser.is_active,
          updated_at: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      const user = result[0];
      return {
        ...user,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        last_login: user.last_login ? new Date(user.last_login) : null,
      };
    } catch (error) {
      // Silent error handling - don't log to console
      if (error instanceof Error && error.message === 'User not found') {
        throw error;
      }
      throw new Error('Failed to toggle user status');
    }
  }

  static async revokeUserSessions(id: string): Promise<void> {
    try {
      // Delete all active sessions for the user
      await db
        .delete(userSessions)
        .where(eq(userSessions.user_id, id));
    } catch {
      // Silent error handling - don't log to console
      throw new Error('Failed to revoke user sessions');
    }
  }

  static async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    recentLogins: number;
  }> {
    try {
      // Get total users
      const totalResult = await db.select({ count: count() }).from(users);
      const total = totalResult[0]?.count || 0;

      // Get active users
      const activeResult = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.is_active, true));
      const active = activeResult[0]?.count || 0;

      // Get inactive users
      const inactive = total - active;

      // Get users who logged in within the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentLoginsResult = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.is_active, true),
            gte(users.last_login, sevenDaysAgo)
          )
        );
      const recentLogins = recentLoginsResult[0]?.count || 0;

      return {
        total,
        active,
        inactive,
        recentLogins,
      };
    } catch {
      // Silent error handling - don't log to console
      throw new Error('Failed to fetch user stats');
    }
  }
} 