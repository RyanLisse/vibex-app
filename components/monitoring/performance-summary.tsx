/**
 * Performance summary component for monitoring dashboard
 * Extracted to reduce complexity in main dashboard component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PerformanceSummaryProps {
  performanceSummary: {
    totalMetrics: number;
    averages: Record<string, number>;
    recent: Array<{
      name: string;
      value: number;
      unit: string;
      timestamp: string;
    }>;
  };
}

export function PerformanceSummary({ performanceSummary }: PerformanceSummaryProps) {
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
                <span>{Math.round(value)}ms</span>
              </div>
              <Progress 
                value={Math.min(value / 10, 100)} 
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
            {performanceSummary.recent.slice(0, 5).map((metric, index) => (
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
  );
}
