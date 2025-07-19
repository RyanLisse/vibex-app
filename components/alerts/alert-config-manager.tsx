'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AlertConfig, AlertChannel, AlertChannelType, CriticalErrorType, AlertPriority } from '@/lib/alerts/types'
import { Settings, Plus, Edit, Trash2, TestTube, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

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
        body: JSON.stringify({ config })
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
        method: 'POST'
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
      channels: [...config.channels, channel]
    })
    setIsAddingChannel(false)
  }

  const updateChannel = (updatedChannel: AlertChannel) => {
    if (!config) return

    setConfig({
      ...config,
      channels: config.channels.map(ch => 
        ch.name === updatedChannel.name ? updatedChannel : ch
      )
    })
    setEditingChannel(null)
  }

  const deleteChannel = (channelName: string) => {
    if (!config) return

    setConfig({
      ...config,
      channels: config.channels.filter(ch => ch.name !== channelName)
    })
  }

  const toggleChannel = (channelName: string) => {
    if (!config) return

    setConfig({
      ...config,
      channels: config.channels.map(ch =>
        ch.name === channelName ? { ...ch, enabled: !ch.enabled } : ch
      )
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Alert Configuration
          </h2>
          <p className="text-gray-600">Manage alert channels and system settings</p>
        </div>
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="channels">Alert Channels</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Global alert system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Enable Alert System</Label>
                  <p className="text-sm text-gray-500">Master switch for all alerting</p>
                </div>
                <Switch
                  id="enabled"
                  checked={config.enabled}
                  onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="maxAlertsPerHour">Max Alerts Per Hour</Label>
                  <Input
                    id="maxAlertsPerHour"
                    type="number"
                    value={config.rateLimiting.maxAlertsPerHour}
                    onChange={(e) => setConfig({
                      ...config,
                      rateLimiting: {
                        ...config.rateLimiting,
                        maxAlertsPerHour: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="cooldownMinutes">Cooldown Minutes</Label>
                  <Input
                    id="cooldownMinutes"
                    type="number"
                    value={config.rateLimiting.cooldownMinutes}
                    onChange={(e) => setConfig({
                      ...config,
                      rateLimiting: {
                        ...config.rateLimiting,
                        cooldownMinutes: parseInt(e.target.value) || 0
                      }
                    })}
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
                  <p className="text-sm text-gray-500">Group similar alerts together</p>
                </div>
                <Switch
                  id="deduplicationEnabled"
                  checked={config.deduplication.enabled}
                  onCheckedChange={(enabled) => setConfig({
                    ...config,
                    deduplication: { ...config.deduplication, enabled }
                  })}
                />
              </div>

              {config.deduplication.enabled && (
                <div>
                  <Label htmlFor="deduplicationWindow">Deduplication Window (minutes)</Label>
                  <Input
                    id="deduplicationWindow"
                    type="number"
                    value={config.deduplication.windowMinutes}
                    onChange={(e) => setConfig({
                      ...config,
                      deduplication: {
                        ...config.deduplication,
                        windowMinutes: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Alert Channels</h3>
            <Dialog open={isAddingChannel} onOpenChange={setIsAddingChannel}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Channel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <ChannelForm
                  onSave={addChannel}
                  onCancel={() => setIsAddingChannel(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {config.channels.map((channel) => (
              <Card key={channel.name} className={!channel.enabled ? 'opacity-60' : ''}>
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
                        variant="outline"
                        size="sm"
                        onClick={() => testChannel(channel.name)}
                        disabled={testing === channel.name || !channel.enabled}
                      >
                        {testing === channel.name ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <ChannelForm
                            channel={channel}
                            onSave={updateChannel}
                            onCancel={() => setEditingChannel(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteChannel(channel.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {channel.errorTypes.map((errorType) => (
                      <Badge key={errorType} variant="outline" className="text-xs">
                        {errorType.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Escalation Settings</CardTitle>
              <CardDescription>Automatic escalation for unresolved alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="escalationEnabled">Enable Escalation</Label>
                  <p className="text-sm text-gray-500">Escalate unresolved alerts automatically</p>
                </div>
                <Switch
                  id="escalationEnabled"
                  checked={config.escalation.enabled}
                  onCheckedChange={(enabled) => setConfig({
                    ...config,
                    escalation: { ...config.escalation, enabled }
                  })}
                />
              </div>

              {config.escalation.enabled && (
                <div>
                  <Label htmlFor="escalateAfterMinutes">Escalate After (minutes)</Label>
                  <Input
                    id="escalateAfterMinutes"
                    type="number"
                    value={config.escalation.escalateAfterMinutes}
                    onChange={(e) => setConfig({
                      ...config,
                      escalation: {
                        ...config.escalation,
                        escalateAfterMinutes: parseInt(e.target.value) || 0
                      }
                    })}
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
      priority: 'medium'
    }
  )

  const handleSave = () => {
    if (!formData.name || !formData.type) return
    
    onSave(formData as AlertChannel)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {channel ? 'Edit Alert Channel' : 'Add Alert Channel'}
        </DialogTitle>
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
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., production-alerts"
            />
          </div>

          <div>
            <Label htmlFor="channelType">Channel Type</Label>
            <Select
              value={formData.type}
              onValueChange={(type) => setFormData({ ...formData, type: type as AlertChannelType })}
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
            value={formData.priority}
            onValueChange={(priority) => setFormData({ ...formData, priority: priority as AlertPriority })}
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
          <div className="grid grid-cols-2 gap-2 mt-2">
            {Object.values(CriticalErrorType).map((errorType) => (
              <label key={errorType} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.errorTypes?.includes(errorType) || false}
                  onChange={(e) => {
                    const errorTypes = formData.errorTypes || []
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        errorTypes: [...errorTypes, errorType]
                      })
                    } else {
                      setFormData({
                        ...formData,
                        errorTypes: errorTypes.filter(t => t !== errorType)
                      })
                    }
                  }}
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
            value={JSON.stringify(formData.config || {}, null, 2)}
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
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!formData.name || !formData.type}>
          {channel ? 'Update' : 'Add'} Channel
        </Button>
      </DialogFooter>
    </>
  )
}