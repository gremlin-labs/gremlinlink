import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics-service';

const SESSION_COOKIE_NAME = 'gremlinlink_session';

/**
 * GET /api/admin/analytics
 * Returns comprehensive analytics dashboard data
 * Supports optional date range filtering via query parameters
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication using the same pattern as middleware
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie || !sessionCookie.value || sessionCookie.value.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Parse query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    // Fetch analytics data with performance monitoring
    const startTime = performance.now();
    const analyticsData = await AnalyticsService.getDashboardData(dateRange);
    const duration = performance.now() - startTime;

    // Add performance metadata
    const response = {
      ...analyticsData,
      metadata: {
        queryTime: Math.round(duration),
        dateRange: dateRange || null,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 },
    );
  }
}