-- Up
-- Migration: Create Alert System Tables
-- Description: Creates the database schema for the critical error alert system
-- Date: 2024-01-01

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  severity VARCHAR(20) NOT NULL,
  type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(255) NOT NULL,
  metadata JSONB,
  stack_trace TEXT,
  correlation_id VARCHAR(255),
  environment VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  occurrence_count INTEGER DEFAULT 1,
  last_occurrence TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  first_occurrence TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create alert_channels table
CREATE TABLE IF NOT EXISTS alert_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  config JSONB NOT NULL,
  error_types JSONB, -- Array of CriticalErrorType
  priority VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT alert_channels_name_unique UNIQUE (name)
);

-- Create alert_notifications table
CREATE TABLE IF NOT EXISTS alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES alerts(id) NOT NULL,
  channel_id UUID REFERENCES alert_channels(id),
  channel_type VARCHAR(50) NOT NULL,
  channel_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create alert_metrics table
CREATE TABLE IF NOT EXISTS alert_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  total_alerts INTEGER DEFAULT 0,
  alerts_by_type JSONB, -- Record<CriticalErrorType, number>
  alerts_by_channel JSONB, -- Record<AlertChannelType, number>
  average_resolution_time INTEGER, -- in milliseconds
  unresolved_alerts INTEGER DEFAULT 0,
  mean_time_to_alert INTEGER, -- in milliseconds
  mean_time_to_resolution INTEGER, -- in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS alerts_severity_idx ON alerts(severity);
CREATE INDEX IF NOT EXISTS alerts_type_idx ON alerts(type);
CREATE INDEX IF NOT EXISTS alerts_source_idx ON alerts(source);
CREATE INDEX IF NOT EXISTS alerts_environment_idx ON alerts(environment);
CREATE INDEX IF NOT EXISTS alerts_resolved_idx ON alerts(resolved);
CREATE INDEX IF NOT EXISTS alerts_timestamp_idx ON alerts(timestamp);
CREATE INDEX IF NOT EXISTS alerts_correlation_id_idx ON alerts(correlation_id);
CREATE INDEX IF NOT EXISTS alerts_user_id_idx ON alerts(user_id);

CREATE INDEX IF NOT EXISTS alert_channels_name_idx ON alert_channels(name);
CREATE INDEX IF NOT EXISTS alert_channels_type_idx ON alert_channels(type);
CREATE INDEX IF NOT EXISTS alert_channels_enabled_idx ON alert_channels(enabled);

CREATE INDEX IF NOT EXISTS alert_notifications_alert_id_idx ON alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS alert_notifications_status_idx ON alert_notifications(status);
CREATE INDEX IF NOT EXISTS alert_notifications_channel_type_idx ON alert_notifications(channel_type);
CREATE INDEX IF NOT EXISTS alert_notifications_sent_at_idx ON alert_notifications(sent_at);

CREATE INDEX IF NOT EXISTS alert_metrics_date_idx ON alert_metrics(date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_channels_updated_at BEFORE UPDATE ON alert_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_notifications_updated_at BEFORE UPDATE ON alert_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default log channel
INSERT INTO alert_channels (name, type, enabled, config, error_types, priority)
VALUES (
  'default-log',
  'log',
  true,
  '{"level": "error", "format": "structured", "includeStackTrace": true, "includeMetadata": true}',
  '["database_connection_failure", "redis_connection_failure", "auth_service_failure", "workflow_execution_failure", "memory_threshold_exceeded", "error_rate_threshold_exceeded", "third_party_service_failure", "system_health_failure", "api_gateway_failure", "file_system_failure"]',
  'medium'
) ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_metrics TO authenticated;

-- Down
DROP TABLE IF EXISTS alert_metrics;
DROP TABLE IF EXISTS alert_notifications;
DROP TABLE IF EXISTS alert_channels;
DROP TABLE IF EXISTS alerts;
