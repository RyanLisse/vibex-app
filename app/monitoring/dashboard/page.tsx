"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { performanceMonitor } from "@/lib/monitoring/performance-monitor";

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  status: "good" | "warning" | "error";
  description: string;
}

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);

  useEffect(() => {
    // Fetch performance summary
    const summary = performanceMonitor.getSummary();
    setPerformanceSummary(summary);

    // Mock metrics - replace with real data from your monitoring system
    const mockMetrics: MetricCard[] = [
      {
        title: "Error Rate",
        value: "0.1%",
        change: -50,
        status: "good",
        description: "24h error rate (target: <0.5%)",
      },
      {
        title: "Response Time",
        value: "120ms",
        change: -15,
        status: "good",
        description: "Average API response time",
      },
      {
        title: "Test Coverage",
        value: "94%",
        change: 5,
        status: "good",
        description: "Overall test coverage",
      },
      {
        title: "Bundle Size",
        value: "245KB",
        change: 2,
        status: "warning",
        description: "Gzipped bundle size",
      },
      {
        title: "Core Web Vitals",
        value: "Good",
        status: "good",
        description: "LCP, FID, CLS scores",
      },
      {
        title: "Uptime",
        value: "99.98%",
        status: "good",
        description: "30-day uptime",
      },
    ];

    setMetrics(mockMetrics);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Error Prevention Dashboard</h1>
          <p className="text-gray-600">Monitor your application's health and performance</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              {getStatusIcon(metric.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change !== undefined && (
                <div className="flex items-center text-xs text-muted-foreground">
                  {metric.change > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
                  )}
                  {Math.abs(metric.change)}% from last week
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Summary */}
      {performanceSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Real-time performance tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Total Metrics Collected</span>
                  <span>{performanceSummary.totalMetrics}</span>
                </div>
              </div>
              
              {Object.entries(performanceSummary.averages).slice(0, 5).map(([name, value]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{name.replace(/_/g, " ")}</span>
                    <span>{Math.round(value as number)}ms</span>
                  </div>
                  <Progress 
                    value={Math.min((value as number) / 10, 100)} 
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest performance events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performanceSummary.recent.slice(0, 5).map((metric: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getStatusColor("good")}>
                        {metric.name}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div>{Math.round(metric.value)}{metric.unit}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Prevention Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Error Prevention Checklist</CardTitle>
          <CardDescription>Implementation status of error prevention measures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { item: "Enhanced Error Boundaries", status: "good", progress: 100 },
              { item: "API Error Handling", status: "good", progress: 95 },
              { item: "TypeScript Strict Mode", status: "warning", progress: 80 },
              { item: "Critical Path Testing", status: "warning", progress: 70 },
              { item: "Performance Monitoring", status: "good", progress: 90 },
              { item: "Security Scanning", status: "good", progress: 85 },
            ].map((check, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(check.status)}
                  <span className="text-sm">{check.item}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={check.progress} className="w-20 h-2" />
                  <span className="text-xs text-muted-foreground w-8">
                    {check.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
