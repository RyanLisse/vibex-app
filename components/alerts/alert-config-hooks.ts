/**
 * Custom hooks for alert configuration management
 * Extracted from AlertConfigManager to reduce complexity
 */

import { useEffect, useState } from "react";
import { type AlertChannel, type AlertConfig } from "@/lib/alerts";

export interface UseAlertConfigReturn {
  config: AlertConfig | null;
  loading: boolean;
  saving: boolean;
  testing: string | null;
  error: string | null;
  success: string | null;
  editingChannel: AlertChannel | null;
  isAddingChannel: boolean;
  setEditingChannel: (channel: AlertChannel | null) => void;
  setIsAddingChannel: (adding: boolean) => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  testChannel: (channelName: string) => Promise<void>;
  addChannel: (channel: AlertChannel) => void;
  updateChannel: (channel: AlertChannel) => void;
  deleteChannel: (channelName: string) => void;
  toggleChannel: (channelName: string) => void;
  updateConfig: (updates: Partial<AlertConfig>) => void;
}

export function useAlertConfig(): UseAlertConfigReturn {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingChannel, setEditingChannel] = useState<AlertChannel | null>(null);
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/alerts/config");

      if (!response.ok) {
        throw new Error("Failed to load alert configuration");
      }

      const data = await response.json();
      setConfig(data.config);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetch("/api/alerts/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error("Failed to save alert configuration");
      }

      setSuccess("Configuration saved successfully");
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration"
      );
    } finally {
      setSaving(false);
    }
  };

  const testChannel = async (channelName: string) => {
    try {
      setTesting(channelName);
      const response = await fetch(`/api/alerts/channels/${channelName}/test`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Test alert sent successfully to ${channelName}`);
      } else {
        setError(`Test failed for ${channelName}: ${result.error}`);
      }

      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(null);
    }
  };

  const addChannel = (channel: AlertChannel) => {
    if (!config) return;

    setConfig({
      ...config,
      channels: [...config.channels, channel],
    });
    setIsAddingChannel(false);
  };

  const updateChannel = (updatedChannel: AlertChannel) => {
    if (!config) return;

    setConfig({
      ...config,
      channels: config.channels.map((ch) =>
        ch.name === updatedChannel.name ? updatedChannel : ch
      ),
    });
    setEditingChannel(null);
  };

  const deleteChannel = (channelName: string) => {
    if (!config) return;

    setConfig({
      ...config,
      channels: config.channels.filter((ch) => ch.name !== channelName),
    });
  };

  const toggleChannel = (channelName: string) => {
    if (!config) return;

    setConfig({
      ...config,
      channels: config.channels.map((ch) =>
        ch.name === channelName ? { ...ch, enabled: !ch.enabled } : ch
      ),
    });
  };

  const updateConfig = (updates: Partial<AlertConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  return {
    config,
    loading,
    saving,
    testing,
    error,
    success,
    editingChannel,
    isAddingChannel,
    setEditingChannel,
    setIsAddingChannel,
    loadConfig,
    saveConfig,
    testChannel,
    addChannel,
    updateChannel,
    deleteChannel,
    toggleChannel,
    updateConfig,
  };
}

/**
 * Hook for managing alert notifications (success/error messages)
 */
export function useAlertNotifications() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showError = (message: string, duration = 5000) => {
    setError(message);
    if (duration > 0) {
      setTimeout(() => setError(null), duration);
    }
  };

  const showSuccess = (message: string, duration = 3000) => {
    setSuccess(message);
    if (duration > 0) {
      setTimeout(() => setSuccess(null), duration);
    }
  };

  const clearNotifications = () => {
    setError(null);
    setSuccess(null);
  };

  return {
    error,
    success,
    showError,
    showSuccess,
    clearNotifications,
  };
}
