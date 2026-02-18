"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Copy, RefreshCw } from 'lucide-react'

interface SettingsTabProps {
  formId: string
}

export default function SettingsTab({ formId }: SettingsTabProps) {
  const [apiEnabled, setApiEnabled] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [formId])

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await fetch(`/api/forms/${formId}/settings`)
      if (res.ok) {
        const data = await res.json()
        setApiEnabled(data.apiEnabled || false)
        setApiKey(data.apiKey || null)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleAPI() {
    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiEnabled: !apiEnabled }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setApiEnabled(data.apiEnabled)
        setApiKey(data.apiKey)
      }
    } catch (err) {
      console.error('Failed to toggle API:', err)
    } finally {
      setSaving(false)
    }
  }

  async function regenerateKey() {
    if (!confirm('Are you sure? This will invalidate your current API key.')) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateKey: true }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setApiKey(data.apiKey)
      }
    } catch (err) {
      console.error('Failed to regenerate key:', err)
    } finally {
      setSaving(false)
    }
  }

  function copyKey() {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl w-full mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Form Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure form behavior, notifications, and access controls
          </p>
        </div>
        
        <Card className="p-6">
          <h4 className="font-semibold mb-4">JSON API Integration</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Enable API access to receive form responses via webhook or direct API calls
          </p>

          <div className="flex items-center gap-4 mb-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <span className="text-muted-foreground">API Integration</span>
              <input
                type="checkbox"
                checked={apiEnabled}
                onChange={toggleAPI}
                disabled={saving}
                className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                  before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                  checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          </div>

          {apiEnabled && apiKey && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">API Key</label>
                <div className="flex gap-2">
                  <Input
                    value={apiKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyKey}
                    title="Copy API key"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={regenerateKey}
                    disabled={saving}
                    title="Regenerate API key"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded text-sm">
                <p className="font-medium mb-2">API Endpoint</p>
                <code className="text-xs bg-white px-2 py-1 rounded block mb-3">
                  POST /api/forms/{formId}/webhook
                </code>
                <p className="text-muted-foreground text-xs">
                  Include the API key in the Authorization header: <code className="bg-white px-1">Bearer {'{'}your-api-key{'}'}</code>
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

