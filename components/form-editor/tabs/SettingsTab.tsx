"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Copy, RefreshCw } from 'lucide-react'

interface SettingsTabProps {
  formId: string
  theme: string
  onThemeChange: (theme: string) => void
  onQuizModeChange?: (isQuiz: boolean) => void
}

const THEMES = [
  { id: 'slate', label: 'Slate', color: 'bg-slate-500' },
  { id: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { id: 'green', label: 'Green', color: 'bg-green-500' },
  { id: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { id: 'pink', label: 'Pink', color: 'bg-pink-500' },
]

export default function SettingsTab({ formId, theme, onThemeChange, onQuizModeChange }: SettingsTabProps) {
  const [isQuiz, setIsQuiz] = useState(false)
  const [showScore, setShowScore] = useState(false)
  const [apiEnabled, setApiEnabled] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [responsesEnabled, setResponsesEnabled] = useState(true)
  const [responseDeadline, setResponseDeadline] = useState<string>('')
  const [oneResponsePerEmail, setOneResponsePerEmail] = useState(false)
  const [oneResponsePerUser, setOneResponsePerUser] = useState(false)
  const [successMessage, setSuccessMessage] = useState('Your response has been recorded.')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const successMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/forms/${formId}/settings`)
      if (res.ok) {
        const data = await res.json()
        onThemeChange(data.theme || 'blue')
        setIsQuiz(data.isQuiz || false)
        setShowScore(data.showScore || false)
        setApiEnabled(data.apiEnabled || false)
        setApiKey(data.apiKey || null)
        setResponsesEnabled(data.responsesEnabled !== undefined ? data.responsesEnabled : true)
        setResponseDeadline(data.responseDeadline ? new Date(data.responseDeadline).toISOString().slice(0, 16) : '')
        setOneResponsePerEmail(data.oneResponsePerEmail || false)
        setOneResponsePerUser(data.oneResponsePerUser || false)
        setSuccessMessage(data.successMessage || 'Your response has been recorded.')
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }, [formId, onThemeChange])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Debounce success message updates
  useEffect(() => {
    if (successMessageTimeoutRef.current) {
      clearTimeout(successMessageTimeoutRef.current)
    }

    successMessageTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/forms/${formId}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ successMessage }),
        })
      } catch (err) {
        console.error('Failed to update success message:', err)
      }
    }, 1500) // Wait 1.5 seconds after last keystroke

    return () => {
      if (successMessageTimeoutRef.current) {
        clearTimeout(successMessageTimeoutRef.current)
      }
    }
  }, [successMessage, formId])

  async function updateTheme(newTheme: string) {
    onThemeChange(newTheme)
    setSaving(true)
    try {
      await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      })
    } catch (err) {
      console.error('Failed to update theme:', err)
    } finally {
      setSaving(false)
    }
  }

  async function toggleQuizMode() {
    const newIsQuiz = !isQuiz
    setIsQuiz(newIsQuiz)
    onQuizModeChange?.(newIsQuiz)
    setSaving(true)
    try {
      await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isQuiz: newIsQuiz }),
      })
    } catch (err) {
      console.error('Failed to update quiz mode:', err)
    } finally {
      setSaving(false)
    }
  }

  async function toggleShowScore() {
    const newShowScore = !showScore
    setShowScore(newShowScore)
    setSaving(true)
    try {
      await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showScore: newShowScore }),
      })
    } catch (err) {
      console.error('Failed to update show score:', err)
    } finally {
      setSaving(false)
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

  async function toggleResponsesEnabled() {
    const newResponsesEnabled = !responsesEnabled
    setResponsesEnabled(newResponsesEnabled)
    setSaving(true)
    try {
      await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsesEnabled: newResponsesEnabled }),
      })
    } catch (err) {
      console.error('Failed to update responses enabled:', err)
    } finally {
      setSaving(false)
    }
  }

  async function updateResponseDeadline(value: string) {
    setResponseDeadline(value)
    setSaving(true)
    try {
      const deadline = value ? new Date(value).toISOString() : null
      await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseDeadline: deadline }),
      })
    } catch (err) {
      console.error('Failed to update deadline:', err)
    } finally {
      setSaving(false)
    }
  }

  async function toggleOneResponsePerEmail() {
    const newValue = !oneResponsePerEmail
    setOneResponsePerEmail(newValue)
    setSaving(true)
    try {
      await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oneResponsePerEmail: newValue }),
      })
    } catch (err) {
      console.error('Failed to update oneResponsePerEmail:', err)
    } finally {
      setSaving(false)
    }
  }

  async function toggleOneResponsePerUser() {
    const newValue = !oneResponsePerUser
    setOneResponsePerUser(newValue)
    setSaving(true)
    try {
      await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oneResponsePerUser: newValue }),
      })
    } catch (err) {
      console.error('Failed to update oneResponsePerUser:', err)
    } finally {
      setSaving(false)
    }
  }

  async function updateSuccessMessage(value: string) {
    if (value.length > 500) return
    setSuccessMessage(value)
    // API call is handled by the useEffect with debouncing
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
          <h4 className="font-semibold mb-4">Theme</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Choose a color theme for your form
          </p>
          <div className="flex gap-3 flex-wrap">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => updateTheme(t.id)}
                disabled={saving}
                className={`
                  flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition
                  ${theme === t.id ? 'border-primary' : 'border-slate-200'}
                  hover:border-primary disabled:opacity-50
                `}
              >
                <div className={`w-8 h-8 rounded ${t.color}`} />
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </Card>
        
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Quiz Mode</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Enable quiz mode to assign point values to questions and calculate scores
          </p>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <span className="text-muted-foreground">Enable Quiz Mode</span>
              <input
                type="checkbox"
                checked={isQuiz}
                onChange={toggleQuizMode}
                disabled={saving}
                className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                  before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                  checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          </div>
          {isQuiz && (
            <div className="flex items-center gap-4 border-t pt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <span className="text-muted-foreground">Show score to respondents</span>
                <input
                  type="checkbox"
                  checked={showScore}
                  onChange={toggleShowScore}
                  disabled={saving}
                  className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                    before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                    checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            </div>
          )}
        </Card>
        
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Response Controls</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Control when and how respondents can submit forms
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <span className="text-muted-foreground">Accept responses</span>
                <input
                  type="checkbox"
                  checked={responsesEnabled}
                  onChange={toggleResponsesEnabled}
                  disabled={saving}
                  className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                    before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                    checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            </div>

            {responsesEnabled && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Response deadline (optional)</label>
                  <input
                    type="datetime-local"
                    value={responseDeadline}
                    onChange={(e) => updateResponseDeadline(e.target.value)}
                    disabled={saving}
                    className="w-full max-w-sm border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Forms will automatically stop accepting responses after this time</p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <span className="text-muted-foreground">Limit to one response per email</span>
                    <input
                      type="checkbox"
                      checked={oneResponsePerEmail}
                      onChange={toggleOneResponsePerEmail}
                      disabled={saving}
                      className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                        before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                        checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground -mt-2">Prevent the same email address from submitting multiple times</p>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <span className="text-muted-foreground">Limit to one response per user</span>
                    <input
                      type="checkbox"
                      checked={oneResponsePerUser}
                      onChange={toggleOneResponsePerUser}
                      disabled={saving}
                      className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                        before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                        checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground -mt-2">Prevent the same user/device from submitting multiple times, even with different emails</p>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold mb-4">Success Message</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Customize the message shown after respondents submit the form (max 500 characters)
          </p>
          
          <div>
            <textarea
              value={successMessage}
              onChange={(e) => updateSuccessMessage(e.target.value)}
              maxLength={500}
              placeholder="Your response has been recorded."
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-2">{successMessage.length} / 500 characters</p>
          </div>
        </Card>
        
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
                  POST https://betterform.dev/api/forms/{formId}/webhook
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

