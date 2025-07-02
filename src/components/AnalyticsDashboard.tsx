'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  Users, 
  MousePointer, 
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsData {
  totalClicks: number;
  totalLinks: number;
  activeLinks: number;
  uniqueVisitors: number;
  recentClicks: ClickData[];
  clickTrends: TrendData[];
  topLinks: TopLinkData[];
  clicksByCountry: CountryData[];
  metadata: {
    queryTime: number;
    dateRange: { start: string; end: string } | null;
    generatedAt: string;
  };
}

interface ClickData {
  id: string;
  timestamp: Date;
  linkSlug: string;
  linkTitle: string;
  referrer?: string;
  country?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface TrendData {
  date: string;
  clicks: number;
}

interface TopLinkData {
  slug: string;
  title: string;
  clicks: number;
  targetUrl: string;
}

interface CountryData {
  country: string;
  clicks: number;
}

// GremlinLabs brand colors for charts
const COLORS = ['#1FCC00', '#00A3FF', '#8000FF', '#FF5722', '#FFD600', '#17A300'];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date } | undefined>(undefined);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = '/api/admin/analytics';
      
      if (dateRange?.from) {
        const params = new URLSearchParams({
          start: dateRange.from.toISOString().split('T')[0],
          end: dateRange.to ? dateRange.to.toISOString().split('T')[0] : dateRange.from.toISOString().split('T')[0],
        });
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        toast.error('Failed to fetch analytics data');
      }
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Error loading analytics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      let url = '/api/admin/analytics/export';
      
      if (dateRange?.from) {
        const params = new URLSearchParams({
          start: dateRange.from.toISOString().split('T')[0],
          end: dateRange.to ? dateRange.to.toISOString().split('T')[0] : dateRange.from.toISOString().split('T')[0],
        });
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `gremlinlink-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success('Analytics exported successfully');
      } else {
        toast.error('Failed to export analytics');
      }
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Error exporting data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDateRangeChange = (range: { from: Date; to?: Date } | undefined) => {
    setDateRange(range);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter and Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Range Filter */}
          <div className="w-full sm:w-auto">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              placeholder="Select date range"
              className="w-full sm:w-80"
            />
          </div>
          
          <Button 
            variant="outline" 
            onClick={fetchAnalytics}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <Button 
          onClick={handleExport}
          disabled={isExporting}
          variant="outline"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.totalClicks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.totalLinks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.activeLinks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{data.uniqueVisitors || 0}</div>
            <p className="text-xs text-muted-foreground">
              Unique IP addresses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Click Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Click Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.clickTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#1FCC00" 
                  strokeWidth={2}
                  dot={{ fill: '#1FCC00', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Links Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Links</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topLinks?.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="slug" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="clicks" fill="#1FCC00" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Clicks by Country */}
        <Card>
          <CardHeader>
            <CardTitle>Clicks by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.clicksByCountry?.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="clicks"
                >
                  {data.clicksByCountry?.slice(0, 6).map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.recentClicks?.slice(0, 10).map((click) => (
                <div key={click.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{click.linkTitle || click.linkSlug}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(click.timestamp).toLocaleString()}
                      {click.country && ` • ${click.country}`}
                      {click.ipAddress && ` • ${click.ipAddress}`}
                    </p>
                    {click.referrer && (
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {new URL(click.referrer).hostname}
                      </p>
                    )}
                  </div>
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              {(!data.recentClicks || data.recentClicks.length === 0) && (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metadata */}
      {data.metadata && (
        <Card>
          <CardHeader>
            <CardTitle>Query Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Query Time:</span>
                <span className="ml-2 font-mono">{data.metadata.queryTime}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Generated:</span>
                <span className="ml-2 font-mono">
                  {new Date(data.metadata.generatedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Date Range:</span>
                <span className="ml-2 font-mono">
                  {data.metadata.dateRange 
                    ? `${data.metadata.dateRange.start} to ${data.metadata.dateRange.end}`
                    : 'All time'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}