/**
 * Page Template Component - Eliminates Page Structure Duplication
 * 
 * Consolidates the repeated page structure pattern found across multiple pages:
 * - Container with consistent padding and styling
 * - Header section with title and description
 * - Content area with white background and shadow
 * - Optional action buttons and metadata
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface PageTemplateProps {
  // Header content
  title: string;
  description?: string;
  
  // Main content
  children: React.ReactNode;
  
  // Layout options
  containerClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  
  // Optional elements
  headerActions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  metadata?: React.ReactNode;
  
  // Content variations
  showContentCard?: boolean;
  emptyState?: {
    message: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
  };
}

/**
 * Reusable page template that eliminates the 18-21 line duplication
 * across demo, ai-audio, and other similar pages
 */
export function PageTemplate({
  title,
  description,
  children,
  containerClassName,
  headerClassName,
  contentClassName,
  headerActions,
  breadcrumbs,
  metadata,
  showContentCard = true,
  emptyState
}: PageTemplateProps) {
  const hasEmptyState = emptyState && !children;

  return (
    <div className={cn(
      "container mx-auto px-4 py-8",
      containerClassName
    )}>
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <div className="mb-4">
          {breadcrumbs}
        </div>
      )}

      {/* Page Header */}
      <div className={cn(
        "mb-8",
        headerClassName
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {title}
            </h1>
            {description && (
              <p className="text-gray-600">
                {description}
              </p>
            )}
            {metadata && (
              <div className="mt-2 text-sm text-gray-500">
                {metadata}
              </div>
            )}
          </div>
          {headerActions && (
            <div className="ml-4 flex-shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {hasEmptyState ? (
        <EmptyStateCard emptyState={emptyState} />
      ) : showContentCard ? (
        <ContentCard className={contentClassName}>
          {children}
        </ContentCard>
      ) : (
        <div className={contentClassName}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Content card wrapper - extracts the repeated white background pattern
 */
interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
}

function ContentCard({ children, className }: ContentCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-lg shadow-sm border p-6",
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Empty state card - standardized empty state presentation
 */
interface EmptyStateCardProps {
  emptyState: NonNullable<PageTemplateProps['emptyState']>;
}

function EmptyStateCard({ emptyState }: EmptyStateCardProps) {
  return (
    <ContentCard>
      <div className="text-center py-12">
        {emptyState.icon && (
          <div className="mb-4 flex justify-center text-gray-400">
            {emptyState.icon}
          </div>
        )}
        <p className="text-gray-500 mb-4">
          {emptyState.message}
        </p>
        {emptyState.action && (
          <div>
            {emptyState.action}
          </div>
        )}
      </div>
    </ContentCard>
  );
}

/**
 * Specialized page templates for common patterns
 */

// Demo/Feature page template
export function DemoPageTemplate({
  title = "Demo",
  description = "Explore various features and capabilities",
  children,
  ...props
}: Omit<PageTemplateProps, 'title'> & { title?: string }) {
  const defaultEmptyState = {
    message: "Demo features coming soon...",
    icon: (
      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-4.5A1.125 1.125 0 0010.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H5.25m0 9h1.5A1.125 1.125 0 007.875 12M5.25 9h1.5a1.125 1.125 0 011.125 1.125v1.5m0 0H8.25m2.25 0H12M9 16.5v.75a1.125 1.125 0 001.125 1.125h1.5A1.125 1.125 0 0012.75 18v-2.625" />
      </svg>
    )
  };

  return (
    <PageTemplate 
      title={title}
      description={description}
      emptyState={!children ? defaultEmptyState : undefined}
      {...props}
    >
      {children}
    </PageTemplate>
  );
}

// AI/Feature page template
export function AIFeaturePageTemplate({
  title,
  description,
  children,
  ...props
}: PageTemplateProps) {
  const defaultEmptyState = {
    message: "AI features are being configured...",
    icon: (
      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    )
  };

  return (
    <PageTemplate 
      title={title}
      description={description}
      emptyState={!children ? defaultEmptyState : undefined}
      {...props}
    >
      {children}
    </PageTemplate>
  );
}

// Dashboard page template
export function DashboardPageTemplate({
  title,
  description,
  children,
  ...props
}: PageTemplateProps) {
  return (
    <PageTemplate 
      title={title}
      description={description}
      showContentCard={false}
      {...props}
    >
      {children}
    </PageTemplate>
  );
}

// Settings page template
export function SettingsPageTemplate({
  title,
  description = "Configure your application settings",
  children,
  ...props
}: Omit<PageTemplateProps, 'description'> & { description?: string }) {
  return (
    <PageTemplate 
      title={title}
      description={description}
      {...props}
    >
      {children}
    </PageTemplate>
  );
}

// Export the main template and specialized versions
export {
  ContentCard,
  EmptyStateCard
};

// Type exports for consumers
export type {
  PageTemplateProps,
  ContentCardProps,
  EmptyStateCardProps
};