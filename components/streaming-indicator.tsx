import React from "react";
import { cn } from "@/lib/utils";

interface StreamingIndicatorProps {
  variant?: "dots" | "cursor" | "wave";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const StreamingIndicator = React.forwardRef<
  HTMLDivElement,
  StreamingIndicatorProps
>(({ variant = "dots", className, size = "md", ...props }, ref) => {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base", 
    lg: "text-lg"
  };

  if (variant === "cursor") {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <span className="animate-pulse">|</span>
      </div>
    );
  }

  if (variant === "wave") {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center space-x-1",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1 h-4 bg-current rounded-full animate-pulse"
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: "0.6s"
            }}
          />
        ))}
      </div>
    );
  }

  // Default dots variant
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span className="animate-pulse">"""</span>
    </div>
  );
});

StreamingIndicator.displayName = "StreamingIndicator";