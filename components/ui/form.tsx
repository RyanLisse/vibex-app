import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export const FormField = React.forwardRef<
  HTMLDivElement,
  FormFieldProps
>(({ label, error, children, required, className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("space-y-1", className)} {...props}>
      {label && (
        <label className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          error && "text-destructive"
        )}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
});

FormField.displayName = "FormField";