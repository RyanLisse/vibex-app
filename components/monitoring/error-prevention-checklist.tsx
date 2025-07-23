/**
 * Error prevention checklist component for monitoring dashboard
 * Extracted to reduce complexity in main dashboard component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface ChecklistItem {
  item: string;
  status: "good" | "warning" | "error";
  progress: number;
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  { item: "Enhanced Error Boundaries", status: "good", progress: 100 },
  { item: "API Error Handling", status: "good", progress: 95 },
  { item: "TypeScript Strict Mode", status: "warning", progress: 80 },
  { item: "Critical Path Testing", status: "warning", progress: 70 },
  { item: "Performance Monitoring", status: "good", progress: 90 },
  { item: "Security Scanning", status: "good", progress: 85 },
];

interface ErrorPreventionChecklistProps {
  items?: ChecklistItem[];
}

export function ErrorPreventionChecklist({ 
  items = DEFAULT_CHECKLIST_ITEMS 
}: ErrorPreventionChecklistProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Prevention Checklist</CardTitle>
        <CardDescription>Implementation status of error prevention measures</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((check, index) => (
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
  );
}
