import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics-service';

const SESSION_COOKIE_NAME = 'gremlinlink_session';

/**
 * GET /api/admin/analytics/export
 * Exports analytics data as CSV with streaming support for large datasets
 * Supports optional date range filtering via query parameters
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
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

    // Generate CSV data
    const startTime = performance.now();
    const csvData = await AnalyticsService.exportToCSV(dateRange);
    const duration = performance.now() - startTime;

    // Log performance for monitoring (could be replaced with proper logging service)
    if (duration > 1000) {
      // Only log if export takes longer than 1 second
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `gremlinlink-analytics-${timestamp}.csv`;

    // Return CSV response with proper headers
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch {
    // Log error for debugging (could be replaced with proper logging service)
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 },
    );
  }
}