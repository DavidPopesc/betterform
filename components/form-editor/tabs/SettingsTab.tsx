"use client"

import { Fragment, useState, useEffect, useCallback, useRef } from 'react'
import LocalizedDateTime from '@/components/LocalizedDateTime'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CheckCheck, Copy, Download, Eye, RefreshCw, Trash2 } from 'lucide-react'

interface SettingsTabProps {
  formId: string
  theme: string
  onThemeChange: (theme: string) => void
  onQuizModeChange?: (isQuiz: boolean) => void
}

type LimitedPublicView = {
  id: string
  name: string
  filterFieldId: string
  filterValue: string
  visibleFieldIds: string[]
  createdAt: string
  updatedAt?: string
}

type LimitedPublicViewVisitStat = {
  viewId: string
  totalViews: number
  lastViewedAt: string | null
  recentVisits: Array<{
    id: string
    viewId: string
    viewName: string
    createdAt: string
    userAgent: string | null
  }>
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
  const [formFields, setFormFields] = useState<Array<{ id: string; label: string; type: string; options?: Array<{ id: string; label: string }>; requireVerifiedEmail?: boolean }>>([])
  const [views, setViews] = useState<LimitedPublicView[]>([])
  const [viewStats, setViewStats] = useState<Record<string, LimitedPublicViewVisitStat>>({})
  const [viewName, setViewName] = useState('')
  const [editingViewId, setEditingViewId] = useState<string | null>(null)
  const [copiedViewId, setCopiedViewId] = useState<string | null>(null)
  const [filterFieldId, setFilterFieldId] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [visibleFieldIds, setVisibleFieldIds] = useState<string[]>([])
  const [isQuiz, setIsQuiz] = useState(false)
  const [showScore, setShowScore] = useState(false)
  const [allowAnotherResponse, setAllowAnotherResponse] = useState(false)
  const [apiEnabled, setApiEnabled] = useState(false)
  const [submissionApiKey, setSubmissionApiKey] = useState<string | null>(null)
  const [dataApiKey, setDataApiKey] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState<string>('')
  const [responsesEnabled, setResponsesEnabled] = useState(true)
  const [responseDeadline, setResponseDeadline] = useState<string>('')
  const [oneResponsePerEmail, setOneResponsePerEmail] = useState(false)
  const [oneResponsePerUser, setOneResponsePerUser] = useState(false)
  const [requireLocationOnSubmit, setRequireLocationOnSubmit] = useState(false)
  const [geoLockEnabled, setGeoLockEnabled] = useState(false)
  const [geoLockLatitude, setGeoLockLatitude] = useState('')
  const [geoLockLongitude, setGeoLockLongitude] = useState('')
  const [geoLockRadiusMeters, setGeoLockRadiusMeters] = useState('100')
  const [notifyOnLimitedViewVisit, setNotifyOnLimitedViewVisit] = useState(false)
  const [notifyOnFormSubmission, setNotifyOnFormSubmission] = useState(true)
  const [paymentRequired, setPaymentRequired] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('') // dollars, as typed
  const [paymentCurrency, setPaymentCurrency] = useState('usd')
  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeOnboarded, setStripeOnboarded] = useState(false)
  const [paymentSettingsMessage, setPaymentSettingsMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('Your response has been recorded.')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locationSettingsMessage, setLocationSettingsMessage] = useState<string | null>(null)
  const successMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const webhookUrlTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const locationSettingsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const paymentSettingsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const didLoadLocationSettingsRef = useRef(false)
  const didLoadPaymentSettingsRef = useRef(false)
  const hasVerifiedEmailField = formFields.some((field) => field.type === 'email' && field.requireVerifiedEmail)
  const deadlineDate = responseDeadline ? responseDeadline.slice(0, 10) : ''
  const deadlineTime = responseDeadline ? responseDeadline.slice(11, 16) : ''
  const sharedViewUrl = (viewId: string) => `/responses/view/${viewId}`
  const getSharedViewQrImageUrl = (viewId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `/api/qr?data=${encodeURIComponent(`${origin}${sharedViewUrl(viewId)}`)}`
  }
  const getSafeFileName = (value: string) => value.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'Shared response view'

  const copySharedViewLink = async (viewId: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}${sharedViewUrl(viewId)}`)
    setCopiedViewId(viewId)
    window.setTimeout(() => {
      setCopiedViewId((current) => (current === viewId ? null : current))
    }, 2000)
  }

  // Generate example field values for API documentation
  const generateFieldExample = (field: { id: string; label: string; type: string }): string => {
    switch (field.type) {
      case 'email': return 'user@example.com'
      case 'number': return '42'
      case 'phone': return '+1234567890'
      case 'date': return '2026-02-19'
      case 'time': return '14:30'
      case 'rating': return '5'
      case 'linear_scale': return '5'
      case 'scale': return '5'
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
    'Authorization': 'Bearer ${submissionApiKey}'
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
          const fields = data.schema.fields.map((f: { id: string; label: string; type: string; requireVerifiedEmail?: boolean }) => ({
            id: f.id,
            label: f.label || 'Untitled',
            type: f.type,
            options: (f as { options?: Array<{ id: string; label: string }> }).options || [],
            requireVerifiedEmail: f.requireVerifiedEmail || false,
          }))
          setFormFields(fields)
        }
        
        onThemeChange(data.theme || 'blue')
        setIsQuiz(data.isQuiz || false)
        setShowScore(data.showScore || false)
        setAllowAnotherResponse(data.allowAnotherResponse || false)
        setApiEnabled(data.apiEnabled || false)
        setSubmissionApiKey(data.submissionApiKey || null)
        setDataApiKey(data.dataApiKey || null)
        setWebhookUrl(data.webhookUrl || '')
        setResponsesEnabled(data.responsesEnabled !== undefined ? data.responsesEnabled : true)
        setResponseDeadline(data.responseDeadline ? new Date(data.responseDeadline).toISOString().slice(0, 16) : '')
        setOneResponsePerEmail(data.oneResponsePerEmail || false)
        setOneResponsePerUser(data.oneResponsePerUser || false)
        setRequireLocationOnSubmit(data.requireLocationOnSubmit || false)
        setGeoLockEnabled(data.geoLockEnabled || false)
        setGeoLockLatitude(data.geoLockLatitude !== null && data.geoLockLatitude !== undefined ? String(data.geoLockLatitude) : '')
        setGeoLockLongitude(data.geoLockLongitude !== null && data.geoLockLongitude !== undefined ? String(data.geoLockLongitude) : '')
        setGeoLockRadiusMeters(data.geoLockRadiusMeters !== null && data.geoLockRadiusMeters !== undefined ? String(data.geoLockRadiusMeters) : '100')
        setNotifyOnLimitedViewVisit(data.notifyOnLimitedViewVisit || false)
        setNotifyOnFormSubmission(data.notifyOnFormSubmission !== undefined ? Boolean(data.notifyOnFormSubmission) : true)
        setSuccessMessage(data.successMessage || 'Your response has been recorded.')
        setPaymentRequired(data.paymentRequired || false)
        setPaymentAmount(
          data.paymentAmountCents !== null && data.paymentAmountCents !== undefined
            ? (data.paymentAmountCents / 100).toFixed(2)
            : ''
        )
        setPaymentCurrency(data.paymentCurrency || 'usd')
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }, [formId, onThemeChange])

  const loadStripeStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/account/stripe/status')
      if (!res.ok) return
      const data = await res.json()
      setStripeConnected(Boolean(data.connected))
      setStripeOnboarded(Boolean(data.onboarded))
    } catch (err) {
      console.error('Failed to load Stripe status:', err)
    }
  }, [])

  const loadSharing = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${formId}/sharing`)
      if (!res.ok) return
      const data = await res.json()
      setViews(data.limitedPublicViews || [])
      setViewStats(
        Object.fromEntries(
          ((data.limitedPublicViewStats || []) as LimitedPublicViewVisitStat[]).map((stat) => [stat.viewId, stat])
        )
      )
      if (data.publicId) setPublicId(data.publicId)
    } catch (err) {
      console.error('Failed to load limited views:', err)
    }
  }, [formId])

  useEffect(() => {
    loadSettings()
    loadSharing()
    loadStripeStatus()
  }, [loadSettings, loadSharing, loadStripeStatus])

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

  useEffect(() => {
    if (loading) return

    if (!didLoadLocationSettingsRef.current) {
      didLoadLocationSettingsRef.current = true
      return
    }

    if (locationSettingsTimeoutRef.current) {
      clearTimeout(locationSettingsTimeoutRef.current)
    }

    setLocationSettingsMessage('Saving location settings...')

    locationSettingsTimeoutRef.current = setTimeout(async () => {
      setSaving(true)

      try {
        const res = await fetch(`/api/forms/${formId}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationSettings: {
              requireLocationOnSubmit,
              geoLockEnabled,
              geoLockLatitude,
              geoLockLongitude,
              geoLockRadiusMeters,
            },
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          if (data.error === 'missing_geo_lock_settings') {
            setLocationSettingsMessage('Geo-locking needs latitude, longitude, and a radius before it can be enabled.')
          } else {
            setLocationSettingsMessage('Could not save location settings. Check the values and try again.')
          }
          return
        }

        const data = await res.json()
        setRequireLocationOnSubmit(Boolean(data.requireLocationOnSubmit))
        setGeoLockEnabled(Boolean(data.geoLockEnabled))
        setGeoLockLatitude(data.geoLockLatitude !== null && data.geoLockLatitude !== undefined ? String(data.geoLockLatitude) : '')
        setGeoLockLongitude(data.geoLockLongitude !== null && data.geoLockLongitude !== undefined ? String(data.geoLockLongitude) : '')
        setGeoLockRadiusMeters(data.geoLockRadiusMeters !== null && data.geoLockRadiusMeters !== undefined ? String(data.geoLockRadiusMeters) : '100')
        setLocationSettingsMessage('Location settings saved.')
      } catch (err) {
        console.error('Failed to save location settings:', err)
        setLocationSettingsMessage('Could not save location settings. Please try again.')
      } finally {
        setSaving(false)
      }
    }, 800)

    return () => {
      if (locationSettingsTimeoutRef.current) {
        clearTimeout(locationSettingsTimeoutRef.current)
      }
    }
  }, [
    formId,
    loading,
    requireLocationOnSubmit,
    geoLockEnabled,
    geoLockLatitude,
    geoLockLongitude,
    geoLockRadiusMeters,
  ])

  useEffect(() => {
    if (loading) return

    if (!didLoadPaymentSettingsRef.current) {
      didLoadPaymentSettingsRef.current = true
      return
    }

    if (paymentSettingsTimeoutRef.current) {
      clearTimeout(paymentSettingsTimeoutRef.current)
    }

    setPaymentSettingsMessage('Saving payment settings...')

    paymentSettingsTimeoutRef.current = setTimeout(async () => {
      setSaving(true)

      try {
        const paymentAmountCents = paymentAmount.trim() === ''
          ? null
          : Math.round(Number.parseFloat(paymentAmount) * 100)

        const res = await fetch(`/api/forms/${formId}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentSettings: {
              paymentRequired,
              paymentAmountCents,
              paymentCurrency,
            },
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          if (data.error === 'stripe_not_connected') {
            setPaymentSettingsMessage('Connect a Stripe account in Account settings before requiring payment.')
            setPaymentRequired(false)
          } else if (data.error === 'missing_verified_email_field') {
            setPaymentSettingsMessage('Add a required, verified email field to this form before requiring payment.')
            setPaymentRequired(false)
          } else if (data.error === 'invalid_payment_amount') {
            // Amount is probably still mid-edit — leave the toggle on so the user can just fix the amount.
            setPaymentSettingsMessage('Enter a payment amount greater than $0.')
          } else {
            setPaymentSettingsMessage('Could not save payment settings. Check the values and try again.')
          }
          return
        }

        const data = await res.json()
        setPaymentRequired(Boolean(data.paymentRequired))
        setPaymentAmount(
          data.paymentAmountCents !== null && data.paymentAmountCents !== undefined
            ? (data.paymentAmountCents / 100).toFixed(2)
            : ''
        )
        setPaymentCurrency(data.paymentCurrency || 'usd')
        setPaymentSettingsMessage('Payment settings saved.')
      } catch (err) {
        console.error('Failed to save payment settings:', err)
        setPaymentSettingsMessage('Could not save payment settings. Please try again.')
      } finally {
        setSaving(false)
      }
    }, 800)

    return () => {
      if (paymentSettingsTimeoutRef.current) {
        clearTimeout(paymentSettingsTimeoutRef.current)
      }
    }
  }, [formId, loading, paymentRequired, paymentAmount, paymentCurrency])

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

  async function toggleAllowAnotherResponse() {
    const newValue = !allowAnotherResponse
    setAllowAnotherResponse(newValue)
    setSaving(true)
    try {
      await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowAnotherResponse: newValue }),
      })
    } catch (err) {
      console.error('Failed to update allowAnotherResponse:', err)
    } finally {
      setSaving(false)
    }
  }

  async function toggleFormSubmissionEmailNotification() {
    const nextValue = !notifyOnFormSubmission
    setNotifyOnFormSubmission(nextValue)
    setSaving(true)
    try {
      await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyOnFormSubmission: nextValue }),
      })
    } catch (err) {
      console.error('Failed to update form submission email notification:', err)
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
        setSubmissionApiKey(data.submissionApiKey)
        setDataApiKey(data.dataApiKey)
      }
    } catch (err) {
      console.error('Failed to toggle API:', err)
    } finally {
      setSaving(false)
    }
  }

  async function regenerateSubmissionKey() {
    if (!confirm('Are you sure? This will invalidate your current submission API key.')) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateSubmissionKey: true }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setSubmissionApiKey(data.submissionApiKey)
      }
    } catch (err) {
      console.error('Failed to regenerate submission key:', err)
    } finally {
      setSaving(false)
    }
  }

  async function regenerateDataKey() {
    if (!confirm('Are you sure? This will invalidate your current data API key.')) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateDataKey: true }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setDataApiKey(data.dataApiKey)
      }
    } catch (err) {
      console.error('Failed to regenerate data key:', err)
    } finally {
      setSaving(false)
    }
  }

  function copySubmissionKey() {
    if (submissionApiKey) {
      navigator.clipboard.writeText(submissionApiKey)
    }
  }

  function copyDataKey() {
    if (dataApiKey) {
      navigator.clipboard.writeText(dataApiKey)
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

  async function updateResponseDeadlinePart(part: 'date' | 'time', value: string) {
    const nextDate = part === 'date' ? value : deadlineDate
    const nextTime = part === 'time' ? value : deadlineTime

    if (!nextDate && !nextTime) {
      await updateResponseDeadline('')
      return
    }

    if (!nextDate) {
      setResponseDeadline('')
      return
    }

    await updateResponseDeadline(`${nextDate}T${nextTime || '09:00'}`)
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

  function resetSharedViewForm() {
    setEditingViewId(null)
    setViewName('')
    setFilterFieldId('')
    setFilterValue('')
    setVisibleFieldIds([])
  }

  async function createLimitedView() {
    if (!filterFieldId || !filterValue.trim() || visibleFieldIds.length === 0) return
    try {
      const res = await fetch(`/api/forms/${formId}/sharing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingViewId ? 'update_limited_public_view' : 'create_limited_public_view',
          viewId: editingViewId,
          name: viewName || 'Limited public view',
          filterFieldId,
          filterValue,
          visibleFieldIds,
        }),
      })
      if (!res.ok) throw new Error('failed')
      resetSharedViewForm()
      await loadSharing()
    } catch (err) {
      console.error('Failed to create limited public view:', err)
    }
  }

  function editLimitedView(view: LimitedPublicView) {
    setEditingViewId(view.id)
    setViewName(view.name)
    setFilterFieldId(view.filterFieldId)
    setFilterValue(view.filterValue)
    setVisibleFieldIds(view.visibleFieldIds)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteLimitedView(viewId: string) {
    const confirmed = window.confirm('Delete this limited public view link?')
    if (!confirmed) return
    try {
      const res = await fetch(`/api/forms/${formId}/sharing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_limited_public_view', viewId }),
      })
      if (!res.ok) throw new Error('failed')
      if (editingViewId === viewId) {
        resetSharedViewForm()
      }
      await loadSharing()
    } catch (err) {
      console.error('Failed to delete limited public view:', err)
    }
  }

  async function downloadSharedViewQr(viewId: string, viewName: string) {
    try {
      const response = await fetch(getSharedViewQrImageUrl(viewId))
      if (!response.ok) throw new Error('QR generation failed')

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${getSafeFileName(viewName)}-Better Form.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Failed to download shared view QR code:', err)
    }
  }

  async function toggleLimitedViewEmailNotification() {
    const nextValue = !notifyOnLimitedViewVisit
    setNotifyOnLimitedViewVisit(nextValue)
    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyOnLimitedViewVisit: nextValue }),
      })

      if (!res.ok) {
        setNotifyOnLimitedViewVisit(!nextValue)
      }
    } catch (err) {
      console.error('Failed to update shared view notification setting:', err)
      setNotifyOnLimitedViewVisit(!nextValue)
    } finally {
      setSaving(false)
    }
  }

  async function useCurrentLocationForGeoLock() {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationSettingsMessage('This browser does not support location access.')
      return
    }

    setLocationSettingsMessage('Getting your current location...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLockLatitude(String(position.coords.latitude))
        setGeoLockLongitude(String(position.coords.longitude))
        setLocationSettingsMessage('Current location loaded. Save to apply it to the form.')
      },
      () => {
        setLocationSettingsMessage('Could not get your current location.')
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  if (loading) {
    return (
      <div className="max-w-3xl w-full mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  const shareableFields = formFields.filter((field) => field.type !== 'text' && field.type !== 'section')
  const filterField = shareableFields.find((field) => field.id === filterFieldId)

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
                  <div className="grid max-w-lg gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Date</label>
                      <Input
                        type="date"
                        value={deadlineDate}
                        onChange={(e) => updateResponseDeadlinePart('date', e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Time</label>
                      <Input
                        type="time"
                        value={deadlineTime}
                        onChange={(e) => updateResponseDeadlinePart('time', e.target.value)}
                        disabled={saving || !deadlineDate}
                      />
                    </div>
                  </div>
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

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <span className="text-muted-foreground">Require location to submit</span>
                      <input
                        type="checkbox"
                        checked={requireLocationOnSubmit}
                        onChange={() => setRequireLocationOnSubmit((current) => !current)}
                        disabled={saving}
                        className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                          before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                          checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                    <p className="text-xs text-muted-foreground -mt-2">Store a location stamp with each submission and require respondents to allow location access.</p>

                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <span className="text-muted-foreground">Geo-lock submissions</span>
                      <input
                        type="checkbox"
                        checked={geoLockEnabled}
                        onChange={() => setGeoLockEnabled((current) => !current)}
                        disabled={saving}
                        className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                          before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                          checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                    <p className="text-xs text-muted-foreground -mt-2">Only allow submissions within a set distance of a specific latitude and longitude.</p>

                    <div className="grid gap-3 md:grid-cols-3">
                      <Input
                        type="number"
                        step="0.000001"
                        value={geoLockLatitude}
                        onChange={(e) => setGeoLockLatitude(e.target.value)}
                        placeholder="Latitude"
                        disabled={saving}
                      />
                      <Input
                        type="number"
                        step="0.000001"
                        value={geoLockLongitude}
                        onChange={(e) => setGeoLockLongitude(e.target.value)}
                        placeholder="Longitude"
                        disabled={saving}
                      />
                      <Input
                        type="number"
                        min="1"
                        value={geoLockRadiusMeters}
                        onChange={(e) => setGeoLockRadiusMeters(e.target.value)}
                        placeholder="Radius (meters)"
                        disabled={saving}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={useCurrentLocationForGeoLock} disabled={saving}>
                        Use my current location
                      </Button>
                    </div>

                    {locationSettingsMessage ? (
                      <p className="text-xs text-muted-foreground">{locationSettingsMessage}</p>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold mb-4">Payments</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Require respondents to pay before their response is accepted.
          </p>

          {!stripeConnected ? (
            <p className="text-sm text-muted-foreground">
              Connect a Stripe account in{' '}
              <a href="/account" className="underline underline-offset-2" target="_blank" rel="noreferrer">
                Account settings
              </a>{' '}
              to accept payments on this form.
            </p>
          ) : !stripeOnboarded ? (
            <p className="text-sm text-amber-600">
              Your Stripe account is connected but onboarding isn&apos;t finished yet — finish setup in
              your Stripe dashboard before requiring payment.
            </p>
          ) : (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <span className="text-muted-foreground">Require payment to submit</span>
                <input
                  type="checkbox"
                  checked={paymentRequired}
                  onChange={() => setPaymentRequired((current) => !current)}
                  disabled={saving || !hasVerifiedEmailField}
                  className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                    before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                    checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>

              {!hasVerifiedEmailField ? (
                <p className="text-xs text-amber-600 -mt-2">
                  Add a required, verified email field to this form (in the Questions tab) before you can
                  require payment.
                </p>
              ) : null}

              {paymentRequired && (
                <div className="grid gap-3 md:grid-cols-[140px_100px] items-end">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Amount</label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="10.00"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Currency</label>
                    <select
                      value={paymentCurrency}
                      onChange={(e) => setPaymentCurrency(e.target.value)}
                      disabled={saving}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm h-9"
                    >
                      <option value="usd">USD</option>
                      <option value="eur">EUR</option>
                      <option value="gbp">GBP</option>
                      <option value="cad">CAD</option>
                      <option value="aud">AUD</option>
                    </select>
                  </div>
                </div>
              )}

              {paymentSettingsMessage ? (
                <p className="text-xs text-muted-foreground">{paymentSettingsMessage}</p>
              ) : null}
            </div>
          )}
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

          <div className="mt-4 border-t pt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <span className="text-muted-foreground">Show &quot;Submit another response&quot; after submit</span>
              <input
                type="checkbox"
                checked={allowAnotherResponse}
                onChange={toggleAllowAnotherResponse}
                disabled={saving}
                className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                  before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                  checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-1">Lets respondents go back to a fresh form from the thank-you screen.</p>
          </div>

          <div className="mt-4 border-t pt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <span className="text-muted-foreground">Email me when this form gets a new response</span>
              <input
                type="checkbox"
                checked={notifyOnFormSubmission}
                onChange={toggleFormSubmissionEmailNotification}
                disabled={saving}
                className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                  before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                  checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-1">On by default for new forms.</p>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold mb-4">Shared Response View</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a private link with a UUID path that only shows chosen columns for matching rows.
          </p>

          <div className="mb-4 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <span className="text-muted-foreground">Email me when a shared view is opened</span>
              <input
                type="checkbox"
                checked={notifyOnLimitedViewVisit}
                onChange={toggleLimitedViewEmailNotification}
                disabled={saving}
                className="w-10 h-5 appearance-none bg-slate-200 rounded-full relative cursor-pointer transition checked:bg-primary
                  before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-transform
                  checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="View name" />
            <select
              value={filterFieldId}
              onChange={(e) => {
                setFilterFieldId(e.target.value)
                setFilterValue('')
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Choose row-match field</option>
              {shareableFields.map((field) => (
                <option key={field.id} value={field.id}>{field.label}</option>
              ))}
            </select>
          </div>

          {filterField && (
            <div className="mt-3">
              {filterField.options && filterField.options.length > 0 ? (
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose matching value</option>
                  {filterField.options.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <Input value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder="Matching value" />
              )}
            </div>
          )}

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">Visible columns</p>
            <div className="grid gap-2 md:grid-cols-2">
              {shareableFields.map((field) => (
                <label key={field.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={visibleFieldIds.includes(field.id)}
                    onChange={(e) => {
                      setVisibleFieldIds((current) =>
                        e.target.checked ? [...current, field.id] : current.filter((id) => id !== field.id)
                      )
                    }}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={createLimitedView} disabled={!filterFieldId || !filterValue.trim() || visibleFieldIds.length === 0}>
                {editingViewId ? 'Save shared response view' : 'Create shared response view'}
              </Button>
              {editingViewId ? (
                <Button type="button" variant="outline" onClick={resetSharedViewForm}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </div>

          {views.length > 0 && (
            <div className="mt-6 space-y-3 border-t pt-4">
              {views.map((view) => (
                <Fragment key={view.id}>
                  <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">{view.name}</div>
                      <div className="text-sm text-muted-foreground">{new Date(view.createdAt).toLocaleString()}</div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Row access field: {shareableFields.find((field) => field.id === view.filterFieldId)?.label || view.filterFieldId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Visible columns: {view.visibleFieldIds.map((fieldId) => shareableFields.find((field) => field.id === fieldId)?.label || fieldId).join(', ')}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Viewed {viewStats[view.id]?.totalViews || 0} time{(viewStats[view.id]?.totalViews || 0) === 1 ? '' : 's'}
                        {viewStats[view.id]?.lastViewedAt ? (
                          <>
                            {' '}• Last viewed <LocalizedDateTime value={viewStats[view.id].lastViewedAt as string} />
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant={copiedViewId === view.id ? "default" : "outline"} onClick={() => copySharedViewLink(view.id)}>
                        {copiedViewId === view.id ? (
                          <>
                            <CheckCheck className="w-4 h-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy link
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => window.open(sharedViewUrl(view.id), '_blank')}>
                        <Eye className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                      <Button variant="outline" onClick={() => editLimitedView(view)}>
                        Edit
                      </Button>
                      <Button variant="outline" onClick={() => deleteLimitedView(view.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getSharedViewQrImageUrl(view.id)} alt={`${view.name} QR code`} className="w-28 h-28" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Shared response QR code</div>
                      <p className="text-sm text-muted-foreground">
                        Scan to open this exact private response view.
                      </p>
                      {viewStats[view.id]?.recentVisits?.length ? (
                        <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
                          <div className="mb-2 font-medium text-slate-800">Recent views</div>
                          <div className="space-y-1">
                            {viewStats[view.id].recentVisits.slice(0, 5).map((visit) => (
                              <div key={visit.id}>
                                <LocalizedDateTime value={visit.createdAt} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <Button variant="outline" onClick={() => downloadSharedViewQr(view.id, view.name)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download QR Code
                      </Button>
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
          )}
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

          {apiEnabled && submissionApiKey && dataApiKey && (
            <div className="space-y-6 border-t pt-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Submission API Key</label>
                  <div className="flex gap-2">
                    <Input
                      value={submissionApiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copySubmissionKey}
                      title="Copy submission API key"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={regenerateSubmissionKey}
                      disabled={saving}
                      title="Regenerate submission API key"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for external form submissions and webhook signatures
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Data Export API Key</label>
                  <div className="flex gap-2">
                    <Input
                      value={dataApiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copyDataKey}
                      title="Copy data API key"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={regenerateDataKey}
                      disabled={saving}
                      title="Regenerate data API key"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for fetching form responses via API
                  </p>
                </div>
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
                    Better Form will POST to this URL when a new response is submitted
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
                    GET https://betterform.dev/api/forms/data/{dataApiKey}
                  </code>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Example Request</label>
                  <pre className="text-xs bg-white p-3 rounded mt-1 overflow-x-auto">
{`fetch('https://betterform.dev/api/forms/data/${dataApiKey}', {
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
