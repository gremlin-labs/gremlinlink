import { db } from '@/lib/db';
import { clicks, contentBlocks } from '@/lib/db/schema';
import { eq, desc, count, sql, and, gte, lte } from 'drizzle-orm';

export interface AnalyticsData {
  totalClicks: number;
  totalLinks: number;
  activeLinks: number;
  recentClicks: ClickData[];
  clickTrends: TrendData[];
  topLinks: TopLinkData[];
  clicksByCountry: CountryData[];
}

export interface ClickData {
  id: string;
  timestamp: Date;
  linkSlug: string;
  linkTitle: string;
  referrer?: string;
  country?: string;
}

export interface TrendData {
  date: string;
  clicks: number;
}

export interface TopLinkData {
  slug: string;
  title: string;
  clicks: number;
  targetUrl: string;
}

export interface CountryData {
  country: string;
  clicks: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Analytics service for optimized data retrieval and aggregation
 * Updated for unified content_blocks architecture
 */
export class AnalyticsService {
  /**
   * Get comprehensive dashboard data with parallel execution
   */
  static async getDashboardData(dateRange?: DateRange): Promise<AnalyticsData> {
    try {
      // Execute all queries in parallel for optimal performance
      const [
        totalClicks,
        totalLinks,
        activeLinks,
        recentClicks,
        clickTrends,
        topLinks,
        clicksByCountry,
      ] = await Promise.all([
        this.getTotalClicks(dateRange),
        this.getTotalLinks(),
        this.getActiveLinks(),
        this.getRecentClicks(20, dateRange),
        this.getClickTrends(dateRange),
        this.getTopLinks(10, dateRange),
        this.getClicksByCountry(dateRange),
      ]);

      return {
        totalClicks,
        totalLinks,
        activeLinks,
        recentClicks,
        clickTrends,
        topLinks,
        clicksByCountry,
      };
    } catch {
      throw new Error('Failed to load analytics dashboard');
    }
  }

  /**
   * Get total clicks count
   */
  static async getTotalClicks(dateRange?: DateRange): Promise<number> {
    try {
      const whereClause = dateRange 
        ? and(
            gte(clicks.timestamp, dateRange.start),
            lte(clicks.timestamp, dateRange.end),
          )
        : undefined;

      const result = await db
        .select({ count: count() })
        .from(clicks)
        .where(whereClause);

      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get total content blocks count (links/redirects)
   */
  static async getTotalLinks(): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(contentBlocks)
        .where(eq(contentBlocks.renderer, 'redirect'));

      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get active content blocks count (published redirects)
   */
  static async getActiveLinks(): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(contentBlocks)
        .where(
          and(
            eq(contentBlocks.renderer, 'redirect'),
            eq(contentBlocks.is_published, true),
          )
        );

      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get recent clicks with content block information
   */
  static async getRecentClicks(limit: number = 20, dateRange?: DateRange): Promise<ClickData[]> {
    try {
      const whereClause = dateRange 
        ? and(
            gte(clicks.timestamp, dateRange.start),
            lte(clicks.timestamp, dateRange.end),
          )
        : undefined;

      const result = await db
        .select({
          id: clicks.id,
          timestamp: clicks.timestamp,
          linkSlug: contentBlocks.slug,
          linkTitle: sql<string>`COALESCE(${contentBlocks.data}->>'title', ${contentBlocks.slug})`,
          referrer: clicks.referrer,
          country: clicks.country,
        })
        .from(clicks)
        .innerJoin(contentBlocks, eq(clicks.block_id, contentBlocks.id))
        .where(whereClause)
        .orderBy(desc(clicks.timestamp))
        .limit(limit);

      return result.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        linkSlug: row.linkSlug,
        linkTitle: row.linkTitle || row.linkSlug,
        referrer: row.referrer || undefined,
        country: row.country || undefined,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get click trends over time
   */
  static async getClickTrends(dateRange?: DateRange): Promise<TrendData[]> {
    try {
      // Default to last 30 days if no range provided
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await db
        .select({
          date: sql<string>`DATE(${clicks.timestamp})`,
          clicks: count(),
        })
        .from(clicks)
        .where(
          and(
            gte(clicks.timestamp, startDate),
            lte(clicks.timestamp, endDate),
          )
        )
        .groupBy(sql`DATE(${clicks.timestamp})`)
        .orderBy(sql`DATE(${clicks.timestamp})`);

      return result;
    } catch {
      return [];
    }
  }

  /**
   * Get top performing content blocks (redirects)
   */
  static async getTopLinks(limit: number = 10, dateRange?: DateRange): Promise<TopLinkData[]> {
    try {
      const whereClause = dateRange 
        ? and(
            gte(clicks.timestamp, dateRange.start),
            lte(clicks.timestamp, dateRange.end),
          )
        : undefined;

      const result = await db
        .select({
          slug: contentBlocks.slug,
          title: sql<string>`COALESCE(${contentBlocks.data}->>'title', ${contentBlocks.slug})`,
          targetUrl: sql<string>`${contentBlocks.data}->>'target_url'`,
          clicks: count(),
        })
        .from(clicks)
        .innerJoin(contentBlocks, eq(clicks.block_id, contentBlocks.id))
        .where(whereClause)
        .groupBy(contentBlocks.id, contentBlocks.slug, contentBlocks.data)
        .orderBy(desc(count()))
        .limit(limit);

      return result.map(row => ({
        slug: row.slug,
        title: row.title || row.slug,
        targetUrl: row.targetUrl || '',
        clicks: row.clicks,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get clicks by country
   */
  static async getClicksByCountry(dateRange?: DateRange): Promise<CountryData[]> {
    try {
      const whereClause = dateRange 
        ? and(
            gte(clicks.timestamp, dateRange.start),
            lte(clicks.timestamp, dateRange.end),
          )
        : undefined;

      const result = await db
        .select({
          country: clicks.country,
          clicks: count(),
        })
        .from(clicks)
        .where(
          whereClause 
            ? and(whereClause, sql`${clicks.country} IS NOT NULL`)
            : sql`${clicks.country} IS NOT NULL`
        )
        .groupBy(clicks.country)
        .orderBy(desc(count()))
        .limit(20);

      return result.map(row => ({
        country: row.country || 'Unknown',
        clicks: row.clicks,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Export analytics data to CSV format
   * Updated for content_blocks architecture
   */
  static async exportToCSV(dateRange?: DateRange): Promise<string> {
    try {
      const whereClause = dateRange 
        ? and(
            gte(clicks.timestamp, dateRange.start),
            lte(clicks.timestamp, dateRange.end),
          )
        : undefined;

      const result = await db
        .select({
          timestamp: clicks.timestamp,
          linkSlug: contentBlocks.slug,
          linkTitle: sql<string>`COALESCE(${contentBlocks.data}->>'title', ${contentBlocks.slug})`,
          targetUrl: sql<string>`${contentBlocks.data}->>'target_url'`,
          referrer: clicks.referrer,
          userAgent: clicks.user_agent,
          ipAddress: clicks.ip_address,
          country: clicks.country,
        })
        .from(clicks)
        .innerJoin(contentBlocks, eq(clicks.block_id, contentBlocks.id))
        .where(whereClause)
        .orderBy(desc(clicks.timestamp));

      // Create CSV content
      const headers = [
        'Timestamp',
        'Link Slug',
        'Link Title',
        'Target URL',
        'Referrer',
        'User Agent',
        'IP Address',
        'Country',
      ];

      const csvRows = [
        headers.join(','),
        ...result.map(row => [
          row.timestamp.toISOString(),
          `"${row.linkSlug}"`,
          `"${row.linkTitle || row.linkSlug}"`,
          `"${row.targetUrl || ''}"`,
          `"${row.referrer || ''}"`,
          `"${row.userAgent || ''}"`,
          `"${row.ipAddress || ''}"`,
          `"${row.country || ''}"`,
        ].join(',')),
      ];

      return csvRows.join('\n');
    } catch {
      throw new Error('Failed to export analytics data');
    }
  }

  /**
   * Record a click event for a content block
   */
  static async recordClick(
    blockId: string,
    metadata: {
      referrer?: string;
      userAgent?: string;
      ipAddress?: string;
      country?: string;
      [key: string]: string | undefined;
    } = {}
  ): Promise<void> {
    try {
      await db.insert(clicks).values({
        block_id: blockId,
        referrer: metadata.referrer,
        user_agent: metadata.userAgent,
        ip_address: metadata.ipAddress,
        country: metadata.country,
        metadata: metadata,
      });
    } catch {
      // Don't throw - analytics shouldn't break the main flow
    }
  }
}