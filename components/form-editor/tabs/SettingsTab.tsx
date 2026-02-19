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
  const [publicId, setPublicId] = useState<string>('')
  const [formFields, setFormFields] = useState<Array<{ id: string; label: string; type: string }>>([])
  const [isQuiz, setIsQuiz] = useState(false)
  const [showScore, setShowScore] = useState(false)
  const [apiEnabled, setApiEnabled] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState<string>('')
  const [responsesEnabled, setResponsesEnabled] = useState(true)
  const [responseDeadline, setResponseDeadline] = useState<string>('')
  const [oneResponsePerEmail, setOneResponsePerEmail] = useState(false)
  const [oneResponsePerUser, setOneResponsePerUser] = useState(false)
  const [successMessage, setSuccessMessage] = useState('Your response has been recorded.')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const successMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const webhookUrlTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Generate example field values for API documentation
  const generateFieldExample = (field: { id: string; label: string; type: string }): string => {
    switch (field.type) {
      case 'email': return 'user@example.com'
      case 'number': return '42'
      case 'phone': return '+1234567890'
      case 'date': return '2026-02-19'
      case 'time': return '14:30'
      case 'rating': return '5'
      case 'linear_scale': return '7'
      case 'multiple_choice': return 'Option A'
      case 'dropdown': return 'Option B'
      case 'checkboxes': return '["Option 1", "Option 2"]'
      default: return `Example ${field.label}`
    }
  }

  const getApiExampleCode = () => {
    let responsesExample = ''
    if (formFields.length > 0) {
      const exampleFields = formFields.slice(0, 3).map(f => 
        `      "${f.id}": "${generateFieldExample(f)}"`
      ).join(',\n')
      const moreFieldsNote = formFields.length > 3 ? ',\n      // ... more fields' : ''
      responsesExample = '\n' + exampleFields + moreFieldsNote + '\n    '
    } else {
      responsesExample = '\n      // Add your field IDs and values here\n    '
    }

    return `fetch('https://betterform.dev/api/submit/${publicId || formId}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKey}'
  },
  body: JSON.stringify({
    responses: {${responsesExample}}
  })
})`
  }

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/forms/${formId}/settings`)
      if (res.ok) {
        const data = await res.json()
        setPublicId(data.publicId || formId)
        
        // Extract fields from schema
        if (data.schema?.fields) {
          const fields = data.schema.fields.map((f: { id: string; label: string; type: string }) => ({
            id: f.id,
            label: f.label || 'Untitled',
            type: f.type
          }))
          setFormFields(fields)
        }
        
        onThemeChange(data.theme || 'blue')
        setIsQuiz(data.isQuiz || false)
        setShowScore(data.showScore || false)
        setApiEnabled(data.apiEnabled || false)
        setApiKey(data.apiKey || null)
        setWebhookUrl(data.webhookUrl || '')
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

  // Debounce webhook URL updates
  useEffect(() => {
    if (webhookUrlTimeoutRef.current) {
      clearTimeout(webhookUrlTimeoutRef.current)
    }

    webhookUrlTimeoutRef.current = setTimeout(async () => {
      if (!apiEnabled) return // Only save if API is enabled
      try {
        await fetch(`/api/forms/${formId}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl }),
        })
      } catch (err) {
        console.error('Failed to update webhook URL:', err)
      }
    }, 1500) // Wait 1.5 seconds after last keystroke

    return () => {
      if (webhookUrlTimeoutRef.current) {
        clearTimeout(webhookUrlTimeoutRef.current)
      }
    }
  }, [webhookUrl, formId, apiEnabled])

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
          <h4 className="font-semibold mb-4">API Integration</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Enable API access to submit responses, receive webhooks, or fetch form data
          </p>

          <div className="flex items-center gap-4 mb-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <span className="text-muted-foreground">Enable API</span>
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
            <div className="space-y-6 border-t pt-4">
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
                <p className="text-xs text-muted-foreground mt-1">
                  Keep this key secure. Anyone with this key can submit responses or access your form data.
                </p>
              </div>

              {/* API 1: Form Submission */}
              <div className="bg-slate-50 p-4 rounded-md space-y-3">
                <div>
                  <p className="font-medium text-sm mb-1">1. External Form Submission API</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Submit responses from your own website forms directly to BetterForm
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Endpoint</label>
                  <code className="text-xs bg-white px-2 py-1 rounded block mt-1 break-all">
                    POST https://betterform.dev/api/submit/{publicId || formId}
                  </code>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Example Request</label>
                  <pre className="text-xs bg-white p-3 rounded mt-1 overflow-x-auto">
{getApiExampleCode()}
                  </pre>
                </div>
              </div>

              {/* API 2: Webhook */}
              <div className="bg-slate-50 p-4 rounded-md space-y-3">
                <div>
                  <p className="font-medium text-sm mb-1">2. Webhook Notifications</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Receive real-time notifications when someone submits a response
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Webhook URL (your server)</label>
                  <Input
                    placeholder="https://your-site.com/webhook"
                    className="text-xs mt-1"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    BetterForm will POST to this URL when a new response is submitted
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Webhook Payload</label>
                  <pre className="text-xs bg-white p-3 rounded mt-1 overflow-x-auto">
{`{
  "formId": "${formId}",
  "responseId": "resp_...",
  "responses": { ... },
  "submittedAt": "2026-02-19T...",
  "signature": "sha256_hash..."
}`}
                  </pre>
                </div>
              </div>

              {/* API 3: Data Fetch */}
              <div className="bg-slate-50 p-4 rounded-md space-y-3">
                <div>
                  <p className="font-medium text-sm mb-1">3. Fetch Form Responses API</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Retrieve all form responses in JSON format (rate limited to once per 5 seconds)
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Endpoint</label>
                  <code className="text-xs bg-white px-2 py-1 rounded block mt-1 break-all">
                    GET https://betterform.dev/api/forms/data/{apiKey}
                  </code>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Example Request</label>
                  <pre className="text-xs bg-white p-3 rounded mt-1 overflow-x-auto">
{`fetch('https://betterform.dev/api/forms/data/${apiKey}', {
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
})`}
                  </pre>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Response Format</label>
                  <pre className="text-xs bg-white p-3 rounded mt-1 overflow-x-auto">
{`{
  "formId": "${formId}",
  "formName": "...",
  "totalResponses": 42,
  "responses": [
    {
      "id": "resp_...",
      "createdAt": "2026-02-19T...",
      "data": { ... }
    }
  ]
}`}
                  </pre>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-900">
                <p className="font-medium mb-1">API Documentation</p>
                <p>
                  For complete API documentation, visit{' '}
                  <a href="/docs/api" className="underline font-medium">
                    betterform.dev/docs/api
                  </a>
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

