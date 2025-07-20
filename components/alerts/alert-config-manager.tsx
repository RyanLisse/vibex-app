'use client'

import {
  AlertTriangle,
  CheckCircle,
  Edit,
  Plus,
  Settings,
  TestTube,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  type AlertChannel,
  AlertChannelType,
  type AlertConfig,
  type AlertPriority,
  CriticalErrorType,
} from '@/lib/alerts/types'

interface AlertConfigManagerProps {
  className?: string
}

export function AlertConfigManager({ className }: AlertConfigManagerProps) {
  const [config, setConfig] = useState<AlertConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingChannel, setEditingChannel] = useState<AlertChannel | null>(null)
  const [isAddingChannel, setIsAddingChannel] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/alerts/config')

      if (!response.ok) {
        throw new Error('Failed to load alert configuration')
      }

      const data = await response.json()
      setConfig(data.config)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!config) return

    try {
      setSaving(true)
      const response = await fetch('/api/alerts/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })

      if (!response.ok) {
        throw new Error('Failed to save alert configuration')
      }

      setSuccess('Configuration saved successfully')
      setError(null)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const testChannel = async (channelName: string) => {
    try {
      setTesting(channelName)
      const response = await fetch(`/api/alerts/channels/${channelName}/test`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(`Test alert sent successfully to ${channelName}`)
      } else {
        setError(`Test failed for ${channelName}: ${result.error}`)
      }

      setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTesting(null)
    }
  }

  const addChannel = (channel: AlertChannel) => {
    if (!config) return

    setConfig({
      ...config,
      channels: [...config.channels, channel],
    })
    setIsAddingChannel(false)
  }

  const updateChannel = (updatedChannel: AlertChannel) => {
    if (!config) return

    setConfig({
      ...config,
      channels: config.channels.map((ch) =>
        ch.name === updatedChannel.name ? updatedChannel : ch
      ),
    })
    setEditingChannel(null)
  }

  const deleteChannel = (channelName: string) => {
    if (!config) return

    setConfig({
      ...config,
      channels: config.channels.filter((ch) => ch.name !== channelName),
    })
  }

  const toggleChannel = (channelName: string) => {
    if (!config) return

    setConfig({
      ...config,
      channels: config.channels.map((ch) =>
        ch.name === channelName ? { ...ch, enabled: !ch.enabled } : ch
      ),
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
      </div>
    )
  }

  if (!config) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-red-800">
          Failed to load alert configuration
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={className}>
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-2xl">
            <Settings className="h-6 w-6" />
            Alert Configuration
          </h2>
          <p className="text-gray-600">Manage alert channels and system settings</p>
        </div>
        <Button disabled={saving} onClick={saveConfig}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <Tabs className="space-y-6" defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="channels">Alert Channels</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="general">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Global alert system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Enable Alert System</Label>
                  <p className="text-gray-500 text-sm">Master switch for all alerting</p>
                </div>
                <Switch
                  checked={config.enabled}
                  id="enabled"
                  onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="maxAlertsPerHour">Max Alerts Per Hour</Label>
                  <Input
                    id="maxAlertsPerHour"
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rateLimiting: {
                          ...config.rateLimiting,
                          maxAlertsPerHour: Number.parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    type="number"
                    value={config.rateLimiting.maxAlertsPerHour}
                  />
                </div>

                <div>
                  <Label htmlFor="cooldownMinutes">Cooldown Minutes</Label>
                  <Input
                    id="cooldownMinutes"
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rateLimiting: {
                          ...config.rateLimiting,
                          cooldownMinutes: Number.parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    type="number"
                    value={config.rateLimiting.cooldownMinutes}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deduplication</CardTitle>
              <CardDescription>Prevent duplicate alerts for similar errors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="deduplicationEnabled">Enable Deduplication</Label>
                  <p className="text-gray-500 text-sm">Group similar alerts together</p>
                </div>
                <Switch
                  checked={config.deduplication.enabled}
                  id="deduplicationEnabled"
                  onCheckedChange={(enabled) =>
                    setConfig({
                      ...config,
                      deduplication: { ...config.deduplication, enabled },
                    })
                  }
                />
              </div>

              {config.deduplication.enabled && (
                <div>
                  <Label htmlFor="deduplicationWindow">Deduplication Window (minutes)</Label>
                  <Input
                    id="deduplicationWindow"
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        deduplication: {
                          ...config.deduplication,
                          windowMinutes: Number.parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    type="number"
                    value={config.deduplication.windowMinutes}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-6" value="channels">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">Alert Channels</h3>
            <Dialog onOpenChange={setIsAddingChannel} open={isAddingChannel}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Channel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <ChannelForm onCancel={() => setIsAddingChannel(false)} onSave={addChannel} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {config.channels.map((channel) => (
              <Card className={channel.enabled ? '' : 'opacity-60'} key={channel.name}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {channel.name}
                        <Badge variant={channel.enabled ? 'default' : 'secondary'}>
                          {channel.type}
                        </Badge>
                        <Badge variant={channel.enabled ? 'default' : 'outline'}>
                          {channel.priority}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {channel.errorTypes.length} error types configured
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={() => toggleChannel(channel.name)}
                      />
                      <Button
                        disabled={testing === channel.name || !channel.enabled}
                        onClick={() => testChannel(channel.name)}
                        size="sm"
                        variant="outline"
                      >
                        {testing === channel.name ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-gray-900 border-b-2" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <ChannelForm
                            channel={channel}
                            onCancel={() => setEditingChannel(null)}
                            onSave={updateChannel}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        className="text-red-600 hover:text-red-700"
                        onClick={() => deleteChannel(channel.name)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {channel.errorTypes.map((errorType) => (
                      <Badge className="text-xs" key={errorType} variant="outline">
                        {errorType.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent className="space-y-6" value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Escalation Settings</CardTitle>
              <CardDescription>Automatic escalation for unresolved alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="escalationEnabled">Enable Escalation</Label>
                  <p className="text-gray-500 text-sm">Escalate unresolved alerts automatically</p>
                </div>
                <Switch
                  checked={config.escalation.enabled}
                  id="escalationEnabled"
                  onCheckedChange={(enabled) =>
                    setConfig({
                      ...config,
                      escalation: { ...config.escalation, enabled },
                    })
                  }
                />
              </div>

              {config.escalation.enabled && (
                <div>
                  <Label htmlFor="escalateAfterMinutes">Escalate After (minutes)</Label>
                  <Input
                    id="escalateAfterMinutes"
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        escalation: {
                          ...config.escalation,
                          escalateAfterMinutes: Number.parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    type="number"
                    value={config.escalation.escalateAfterMinutes}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ChannelFormProps {
  channel?: AlertChannel
  onSave: (channel: AlertChannel) => void
  onCancel: () => void
}

function ChannelForm({ channel, onSave, onCancel }: ChannelFormProps) {
  const [formData, setFormData] = useState<Partial<AlertChannel>>(
    channel || {
      type: AlertChannelType.WEBHOOK,
      name: '',
      enabled: true,
      config: {},
      errorTypes: [],
      priority: 'medium',
    }
  )

  const handleSave = () => {
    if (!(formData.name && formData.type)) return

    onSave(formData as AlertChannel)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{channel ? 'Edit Alert Channel' : 'Add Alert Channel'}</DialogTitle>
        <DialogDescription>
          Configure how and when alerts are sent through this channel.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="channelName">Channel Name</Label>
            <Input
              id="channelName"
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., production-alerts"
              value={formData.name || ''}
            />
          </div>

          <div>
            <Label htmlFor="channelType">Channel Type</Label>
            <Select
              onValueChange={(type) => setFormData({ ...formData, type: type as AlertChannelType })}
              value={formData.type}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AlertChannelType.WEBHOOK}>Webhook</SelectItem>
                <SelectItem value={AlertChannelType.EMAIL}>Email</SelectItem>
                <SelectItem value={AlertChannelType.SLACK}>Slack</SelectItem>
                <SelectItem value={AlertChannelType.LOG}>Log</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select
            onValueChange={(priority) =>
              setFormData({ ...formData, priority: priority as AlertPriority })
            }
            value={formData.priority}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Error Types</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Object.values(CriticalErrorType).map((errorType) => (
              <label className="flex items-center space-x-2" key={errorType}>
                <input
                  checked={formData.errorTypes?.includes(errorType)}
                  onChange={(e) => {
                    const errorTypes = formData.errorTypes || []
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        errorTypes: [...errorTypes, errorType],
                      })
                    } else {
                      setFormData({
                        ...formData,
                        errorTypes: errorTypes.filter((t) => t !== errorType),
                      })
                    }
                  }}
                  type="checkbox"
                />
                <span className="text-sm">{errorType.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="config">Configuration (JSON)</Label>
          <Textarea
            id="config"
            onChange={(e) => {
              try {
                const config = JSON.parse(e.target.value)
                setFormData({ ...formData, config })
              } catch {
                // Invalid JSON, ignore for now
              }
            }}
            placeholder="Channel-specific configuration"
            rows={6}
            value={JSON.stringify(formData.config || {}, null, 2)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button disabled={!(formData.name && formData.type)} onClick={handleSave}>
          {channel ? 'Update' : 'Add'} Channel
        </Button>
      </DialogFooter>
    </>
  )
}
