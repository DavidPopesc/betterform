'use client'

import Image from 'next/image'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sanitizeBlobFilename } from '@/lib/blob'
import type { SubmissionLocation } from '@/lib/location'
import { Annoyed, Check, Frown, Laugh, Lock, Mail, MapPin, Meh, Smile, Star, X } from 'lucide-react'

interface Field {
  id: string
  type: string
  label: string
  description?: string
  required?: boolean
  requireVerifiedEmail?: boolean
  options?: Array<{ id: string; label: string }>
  allowedFileTypes?: string[]
  maxFiles?: number
  points?: number
  correctAnswer?: string | string[]
  scaleStyle?: 'numbers' | 'stars' | 'faces'
  scaleMax?: number
}

interface PublicFormProps {
  publicId: string
  formName: string
  fields: Field[]
  theme?: string
  isQuiz?: boolean
  showScore?: boolean
  isClosed?: boolean
  closedReason?: string
  successMessage?: string
  prefillValues?: Record<string, unknown>
  hiddenFieldIds?: string[]
  allowAnotherResponse?: boolean
  locationSettings?: {
    requireLocationOnSubmit: boolean
    geoLockEnabled: boolean
    geoLockLatitude: number | null
    geoLockLongitude: number | null
    geoLockRadiusMeters: number | null
  }
}

const THEME_COLORS: Record<string, { bg: string }> = {
  slate: { bg: 'bg-slate-50' },
  blue: { bg: 'bg-blue-50' },
  green: { bg: 'bg-green-50' },
  purple: { bg: 'bg-purple-50' },
  pink: { bg: 'bg-pink-50' },
}

const FACE_ICONS = { Annoyed, Frown, Meh, Smile, Laugh }

type FaceOption = {
  icon: keyof typeof FACE_ICONS
  label: string
  value: number
}

type UploadedAttachment = {
  filename: string
  mimeType: string | null
  size: number
  url: string
}

function getFaceSet(max: number): FaceOption[] {
  if (max === 2) {
    return [
      { icon: 'Smile', label: 'Smile', value: 2 },
      { icon: 'Frown', label: 'Frown', value: 1 },
    ]
  }

  if (max === 3) {
    return [
      { icon: 'Smile', label: 'Smile', value: 3 },
      { icon: 'Meh', label: 'Meh', value: 2 },
      { icon: 'Frown', label: 'Frown', value: 1 },
    ]
  }

  if (max === 4) {
    return [
      { icon: 'Laugh', label: 'Laugh', value: 4 },
      { icon: 'Smile', label: 'Smile', value: 3 },
      { icon: 'Annoyed', label: 'Annoyed', value: 2 },
      { icon: 'Frown', label: 'Frown', value: 1 },
    ]
  }

  return [
    { icon: 'Laugh', label: 'Laugh', value: 5 },
    { icon: 'Smile', label: 'Smile', value: 4 },
    { icon: 'Meh', label: 'Meh', value: 3 },
    { icon: 'Annoyed', label: 'Annoyed', value: 2 },
    { icon: 'Frown', label: 'Frown', value: 1 },
  ]
}

export default function PublicForm({
  publicId,
  formName,
  fields,
  theme = 'slate',
  isQuiz = false,
  showScore = false,
  isClosed = false,
  closedReason = 'This form is not accepting responses.',
  successMessage = 'Your response has been recorded.',
  prefillValues = {},
  hiddenFieldIds = [],
  allowAnotherResponse = false,
  locationSettings = {
    requireLocationOnSubmit: false,
    geoLockEnabled: false,
    geoLockLatitude: null,
    geoLockLongitude: null,
    geoLockRadiusMeters: null,
  },
}: PublicFormProps) {
  const themeColors = THEME_COLORS[theme] || THEME_COLORS.slate
  const [responses, setResponses] = useState<Record<string, string | string[] | number>>({})
  const [fileResponses, setFileResponses] = useState<Record<string, File[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<{ earned: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [verifiedEmails, setVerifiedEmails] = useState<string[]>([])
  const [verificationSending, setVerificationSending] = useState(false)
  const [verificationSent, setVerificationSent] = useState<Record<string, boolean>>({})
  const [newEmailInput, setNewEmailInput] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(0)
  const suppressSubmitRef = useRef(false)
  const suppressSubmitTimeoutRef = useRef<number | null>(null)

  const hiddenFieldIdSet = new Set(hiddenFieldIds)
  const hasVerifiedEmailField = fields.some((field) => field.type === 'email' && field.requireVerifiedEmail)
  const locationRequiredForSubmission = locationSettings.requireLocationOnSubmit || locationSettings.geoLockEnabled
  const storageKey = `form-responses-${publicId}`
  const prefilledSerialized = useMemo(() => JSON.stringify(prefillValues), [prefillValues])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      const prefilled = JSON.parse(prefilledSerialized) as Record<string, string | string[] | number>

      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string | string[] | number>
        setResponses({ ...parsed, ...prefilled })
        return
      }

      if (Object.keys(prefilled).length > 0) {
        setResponses(prefilled)
      }
    } catch (err) {
      console.error('Failed to load saved responses:', err)
    }
  }, [prefilledSerialized, storageKey])

  useEffect(() => {
    if (Object.keys(responses).length === 0) return

    try {
      localStorage.setItem(storageKey, JSON.stringify(responses))
    } catch (err) {
      console.error('Failed to save responses:', err)
    }
  }, [responses, storageKey])

  useEffect(() => {
    if (!hasVerifiedEmailField) return

    const fetchVerifiedEmails = async () => {
      try {
        const res = await fetch('/api/verify-email/account')
        const data = await res.json()
        if (data.verifiedEmails) {
          setVerifiedEmails((prev) => {
            const nextEmails = data.verifiedEmails as string[]
            const hasNewEmails = nextEmails.some(
              (email) => !prev.some((existing) => existing.toLowerCase().trim() === email.toLowerCase().trim())
            )

            if (hasNewEmails) {
              const emailField = fields.find((field) => field.type === 'email' && field.requireVerifiedEmail)
              if (emailField) {
                const currentEmail = responses[emailField.id] as string
                const wasJustVerified = nextEmails.find(
                  (email) => email.toLowerCase().trim() === currentEmail?.toLowerCase().trim()
                )
                if (wasJustVerified && verificationSent[currentEmail]) {
                  setVerificationSent((current) => ({ ...current, [currentEmail]: false }))
                }
              }
            }

            return nextEmails
          })
        }
      } catch (err) {
        console.error('Failed to fetch verified emails:', err)
      }
    }

    fetchVerifiedEmails()

    if (Object.values(verificationSent).some(Boolean)) {
      const interval = setInterval(fetchVerifiedEmails, 5000)
      return () => clearInterval(interval)
    }
  }, [fields, hasVerifiedEmailField, responses, verificationSent])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'email-verified' && event.data.email) {
        const verifiedEmail = event.data.email as string

        setVerifiedEmails((prev) => {
          const normalized = verifiedEmail.toLowerCase().trim()
          if (prev.some((email) => email.toLowerCase().trim() === normalized)) {
            return prev
          }
          return [...prev, verifiedEmail]
        })

        setVerificationSent((prev) => ({ ...prev, [verifiedEmail]: false }))

        const emailField = fields.find((field) => field.type === 'email' && field.requireVerifiedEmail)
        if (emailField) {
          handleInputChange(emailField.id, verifiedEmail)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [fields])

  const sections = fields.filter((field) => field.type === 'section')
  const hasSections = sections.length > 0

  const getPageFields = () => {
    if (!hasSections) return fields

    const sectionIndices = fields
      .map((field, index) => (field.type === 'section' ? index : -1))
      .filter((index) => index !== -1)

    if (currentPage === 0) {
      return fields.slice(0, sectionIndices[0] || fields.length)
    }

    if (currentPage <= sectionIndices.length) {
      const start = sectionIndices[currentPage - 1] + 1
      const end = sectionIndices[currentPage] || fields.length
      return fields.slice(start, end)
    }

    return []
  }

  const pageFields = getPageFields()
  const visiblePageFields = pageFields.filter((field) => !hiddenFieldIdSet.has(field.id))
  const isLastPage = !hasSections || currentPage >= sections.length

  const handleInputChange = (fieldId: string, value: string | string[] | number) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }))
  }

  const hasFieldValue = (field: Field) => {
    if (field.type === 'file_upload') {
      return (fileResponses[field.id] || []).length > 0
    }

    const value = responses[field.id]
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== null && value !== ''
  }

  const handleFileChange = (fieldId: string, files: FileList | null, field: Field) => {
    const selectedFiles = files ? Array.from(files) : []
    const maxFiles = Math.min(field.maxFiles || 1, 10)

    if (selectedFiles.length > maxFiles) {
      setError(`You can upload up to ${maxFiles} file${maxFiles === 1 ? '' : 's'} for "${field.label}".`)
      return
    }

    const oversizedFile = selectedFiles.find((file) => file.size > 10 * 1024 * 1024)
    if (oversizedFile) {
      setError(`"${oversizedFile.name}" is larger than the 10 MB limit.`)
      return
    }

    setError('')
    setFileResponses((prev) => ({ ...prev, [fieldId]: selectedFiles }))
  }

  const handleNext = () => {
    const missingRequired = pageFields.filter(
      (field) => field.required && field.type !== 'text' && field.type !== 'section' && !hasFieldValue(field)
    )

    if (missingRequired.length > 0) {
      setError('Please fill in all required fields')
      return
    }

    setError('')

    if (hasSections && currentPage + 1 === sections.length) {
      suppressSubmitRef.current = true
      if (suppressSubmitTimeoutRef.current !== null) {
        window.clearTimeout(suppressSubmitTimeoutRef.current)
      }
      suppressSubmitTimeoutRef.current = window.setTimeout(() => {
        suppressSubmitRef.current = false
        suppressSubmitTimeoutRef.current = null
      }, 350)
    }

    setCurrentPage((prev) => prev + 1)
    window.scrollTo(0, 0)
  }

  const handlePrevious = () => {
    setError('')
    setCurrentPage((prev) => prev - 1)
    window.scrollTo(0, 0)
  }

  const calculateScore = () => {
    let earned = 0
    let total = 0

    fields.forEach((field) => {
      if (!field.points || !field.correctAnswer) return

      total += field.points
      const userResponse = responses[field.id]

      if (field.type === 'checkboxes' && Array.isArray(field.correctAnswer)) {
        const userAnswers = Array.isArray(userResponse) ? userResponse : []
        const correct = field.correctAnswer.sort().join(',') === userAnswers.sort().join(',')
        if (correct) earned += field.points
        return
      }

      if (typeof field.correctAnswer === 'string' && typeof userResponse === 'string') {
        if (field.correctAnswer.trim().toLowerCase() === userResponse.trim().toLowerCase()) {
          earned += field.points
        }
        return
      }

      if (userResponse === field.correctAnswer) {
        earned += field.points
      }
    })

    return { earned, total }
  }

  const startAnotherResponse = () => {
    window.location.reload()
  }

  const requestSubmissionLocation = async (): Promise<SubmissionLocation> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      throw new Error('This device does not support location access.')
    }

    setIsRequestingLocation(true)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      })

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        capturedAt: new Date(position.timestamp).toISOString(),
      }
    } catch (error) {
      if (error instanceof GeolocationPositionError) {
        if (error.code === error.PERMISSION_DENIED) {
          throw new Error('Please allow location access to submit this form.')
        }
        if (error.code === error.POSITION_UNAVAILABLE) {
          throw new Error('Your location could not be determined. Please try again.')
        }
        if (error.code === error.TIMEOUT) {
          throw new Error('Timed out while requesting your location. Please try again.')
        }
      }

      throw new Error('Unable to get your location. Please try again.')
    } finally {
      setIsRequestingLocation(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (suppressSubmitRef.current) return
    setError('')

    const missingRequired = fields.filter(
      (field) => field.required && field.type !== 'text' && field.type !== 'section' && !hasFieldValue(field)
    )
    if (missingRequired.length > 0) {
      setError('Please fill in all required fields')
      return
    }

    if (isQuiz) {
      setScore(calculateScore())
    }

    setIsSubmitting(true)
    try {
      const submissionLocation = locationRequiredForSubmission ? await requestSubmissionLocation() : null
      const uploadedAttachments: Record<string, UploadedAttachment[]> = {}

      if (Object.keys(fileResponses).length > 0) {
        setIsUploadingFiles(true)

        for (const [fieldId, files] of Object.entries(fileResponses)) {
          if (files.length === 0) continue

          const uploaded = await Promise.all(
            files.map(async (file) => {
              const pathname = `forms/${publicId}/${fieldId}/${sanitizeBlobFilename(file.name)}`
              const blob = await upload(pathname, file, {
                access: 'private',
                contentType: file.type || undefined,
                clientPayload: JSON.stringify({ publicId, fieldId }),
                handleUploadUrl: '/api/blob/upload',
              })

              return {
                filename: file.name,
                mimeType: file.type || null,
                size: file.size,
                url: blob.url,
              }
            })
          )

          uploadedAttachments[fieldId] = uploaded
        }
      }

      const res = await fetch(`/api/submit/${publicId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses,
          location: submissionLocation,
          uploadedAttachments,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'email_not_verified') {
          setError('Please verify your email address before submitting.')
        } else if (data.error === 'already_submitted') {
          setError('You have already submitted this form. Only one response per user is allowed.')
        } else if (data.error === 'email_already_submitted') {
          setError('This email address has already been used to submit this form.')
        } else if (data.error === 'form_closed') {
          setError('This form is no longer accepting responses.')
        } else if (data.error === 'deadline_passed') {
          setError('The response deadline has passed.')
        } else if (data.error === 'location_required') {
          setError('Location access is required before submitting this form.')
        } else if (data.error === 'geo_lock_failed') {
          setError(data.message || 'You are too far from the required location to submit this form.')
        } else {
          setError(data.message || 'Failed to submit form. Please try again.')
        }
        return
      }

      try {
        localStorage.removeItem(storageKey)
      } catch (err) {
        console.error('Failed to clear saved responses:', err)
      }

      setSubmitted(true)
    } catch (err) {
      console.error('Submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit form. Please try again.')
    } finally {
      setIsUploadingFiles(false)
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className={`min-h-screen ${themeColors.bg} px-4 py-12`}>
        <div className="mx-auto max-w-2xl">
          <Card className="p-8 text-center">
            <div className="mb-4 text-4xl">✓</div>
            <h2 className="mb-2 text-2xl font-semibold">Thank you!</h2>
            <p className="text-muted-foreground">{successMessage}</p>
            {isQuiz && showScore && score ? (
              <div className="mt-6 border-t pt-6">
                <h3 className="mb-2 text-xl font-semibold">Your Score</h3>
                <div className="mb-2 text-3xl font-bold text-primary">
                  {score.earned} / {score.total}
                </div>
                <div className="text-muted-foreground">
                  {Math.round((score.earned / score.total) * 100)}% correct
                </div>
              </div>
            ) : null}
            {allowAnotherResponse ? (
              <div className="mt-6 border-t pt-6">
                <Button type="button" variant="outline" onClick={startAnotherResponse}>
                  Submit another response
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    )
  }

  const renderField = (field: Field) => {
    if (field.type === 'text') {
      return (
        <div className="space-y-2">
          {field.label ? <h3 className="text-lg font-semibold text-slate-900">{field.label}</h3> : null}
          {field.description ? (
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">{field.description}</div>
          ) : null}
        </div>
      )
    }

    if (field.type === 'section') {
      return null
    }

    const value = responses[field.id] ?? ''

    switch (field.type) {
      case 'short_text':
        return (
          <Input
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder="Your answer"
            required={field.required}
          />
        )

      case 'paragraph':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder="Your answer"
            required={field.required}
            className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )

      case 'email':
        if (field.requireVerifiedEmail) {
          const currentEmail = typeof value === 'string' ? value : ''
          const isCurrentVerified = verifiedEmails.some(
            (email) => email.toLowerCase().trim() === currentEmail.toLowerCase().trim()
          )
          const wasSent = verificationSent[currentEmail]

          const sendVerification = async (email: string) => {
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              setError('Please enter a valid email address')
              return
            }

            setVerificationSending(true)
            try {
              const formIdResponse = await fetch(`/api/forms/public/${publicId}`)
              const formData = await formIdResponse.json()

              const res = await fetch('/api/verify-email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, formId: formData.formId }),
              })

              const data = await res.json()
              if (data.success) {
                if (data.alreadyVerified) {
                  setVerifiedEmails((prev) => {
                    const normalized = email.toLowerCase().trim()
                    if (prev.some((item) => item.toLowerCase().trim() === normalized)) {
                      return prev
                    }
                    return [...prev, email]
                  })
                  handleInputChange(field.id, email)
                } else {
                  setVerificationSent((prev) => ({ ...prev, [email]: true }))
                }
                setError('')
              } else {
                setError(data.error || 'Failed to send email please try again.')
              }
            } catch {
              setError('Failed to send email please try again.')
            } finally {
              setVerificationSending(false)
            }
          }

          return (
            <div className="space-y-3">
              {verifiedEmails.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Select a verified email:</p>
                  {verifiedEmails.map((email) => (
                    <label
                      key={email}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name={`email-select-${field.id}`}
                        value={email}
                        checked={currentEmail === email}
                        onChange={() => handleInputChange(field.id, email)}
                        className="h-4 w-4"
                      />
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{email}</span>
                    </label>
                  ))}
                  <p className="mt-2 text-sm text-muted-foreground">Or add a new email:</p>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newEmailInput[field.id] || currentEmail || ''}
                    onChange={(e) => {
                      const email = e.target.value
                      setNewEmailInput((prev) => ({ ...prev, [field.id]: email }))
                      handleInputChange(field.id, email)
                    }}
                    placeholder="your.email@example.com"
                    required={field.required}
                  />
                  {currentEmail && !isCurrentVerified && !wasSent ? (
                    <Button
                      type="button"
                      onClick={() => sendVerification(currentEmail)}
                      disabled={verificationSending}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      {verificationSending ? 'Sending...' : 'Verify'}
                    </Button>
                  ) : null}
                </div>

                {isCurrentVerified && currentEmail ? (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 p-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    <span>Email verified</span>
                  </div>
                ) : null}

                {!isCurrentVerified && currentEmail && wasSent ? (
                  <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-600">
                    <div className="mb-1 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">Verification email sent</span>
                    </div>
                    <p className="text-xs">Check your inbox and click the verification link. The page will update automatically.</p>
                  </div>
                ) : null}

                {field.required && !isCurrentVerified && currentEmail ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <X className="h-4 w-4" />
                    <span>Email must be verified before submitting</span>
                  </div>
                ) : null}
              </div>
            </div>
          )
        }

        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder="your.email@example.com"
            required={field.required}
          />
        )

      case 'phone':
        return (
          <Input
            type="tel"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder="+1 (555) 000-0000"
            required={field.required}
          />
        )

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name={field.id}
                  value={option.id}
                  checked={value === option.id}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  className="h-4 w-4"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )

      case 'checkboxes':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  value={option.id}
                  checked={Array.isArray(value) && value.includes(option.id)}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : []
                    const updated = e.target.checked
                      ? [...current, option.id]
                      : current.filter((item) => item !== option.id)
                    handleInputChange(field.id, updated)
                  }}
                  className="h-4 w-4"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )

      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Choose</option>
            {field.options?.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        )

      case 'time':
        return (
          <Input
            type="time"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        )

      case 'file_upload': {
        const allowedTypes = field.allowedFileTypes || []
        const maxFiles = Math.min(field.maxFiles || 1, 10)
        const selectedFiles = fileResponses[field.id] || []

        return (
          <div className="space-y-3">
            <Input
              type="file"
              multiple={maxFiles > 1}
              accept={allowedTypes.join(',')}
              onChange={(e) => handleFileChange(field.id, e.target.files, field)}
              required={field.required}
            />
            <div className="text-xs text-muted-foreground">
              <p>Up to {maxFiles} file{maxFiles === 1 ? '' : 's'}, 10 MB max each.</p>
              <p>{allowedTypes.length > 0 ? `Allowed types: ${allowedTypes.join(', ')}` : 'Any file type allowed.'}</p>
            </div>
            {selectedFiles.length > 0 ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="mb-2 font-medium text-slate-900">Selected files</p>
                <ul className="space-y-1 text-muted-foreground">
                  {selectedFiles.map((file) => (
                    <li key={`${field.id}-${file.name}-${file.lastModified}`}>
                      {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )
      }

      case 'linear_scale':
      case 'rating':
      case 'scale': {
        const style = field.type === 'rating' ? 'stars' : field.type === 'linear_scale' ? 'numbers' : field.scaleStyle || 'numbers'
        const max = style === 'numbers' ? 5 : Math.max(style === 'faces' ? 2 : 3, Math.min(field.scaleMax || 5, 5))

        if (style === 'stars') {
          return (
            <div className="flex justify-center gap-2">
              {Array.from({ length: max }, (_, index) => index + 1).map((num) => (
                <button key={num} type="button" onClick={() => handleInputChange(field.id, num)} className="rounded-md p-1 transition hover:bg-slate-100">
                  <Star className={`h-8 w-8 ${typeof value === 'number' && value >= num ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          )
        }

        if (style === 'faces') {
          const faces = getFaceSet(max)
          return (
            <div className="grid grid-cols-5 justify-items-center gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
              {faces.map((face) => {
                const FaceIcon = FACE_ICONS[face.icon]
                return (
                  <button
                    key={`${face.label}-${face.value}`}
                    type="button"
                    onClick={() => handleInputChange(field.id, face.value)}
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition sm:h-14 sm:w-14 ${
                      value === face.value ? 'border-primary bg-primary/10 text-primary' : 'border-slate-300 text-slate-500 hover:border-primary'
                    }`}
                    aria-label={face.label}
                  >
                    <FaceIcon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </button>
                )
              })}
            </div>
          )
        }

        return (
          <div className="flex justify-center gap-2">
            {Array.from({ length: max }, (_, index) => index + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleInputChange(field.id, num)}
                className={`h-10 w-10 rounded border-2 transition ${
                  value === num ? 'border-primary bg-primary text-white' : 'border-slate-300 hover:border-primary'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )
      }

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder="Your answer"
            required={field.required}
          />
        )
    }
  }

  return (
    <div className={`min-h-screen ${themeColors.bg} px-4 py-12`}>
      <div className="mx-auto max-w-2xl">

        <Card className="mb-6 p-8">
          <h1 className="mb-2 text-3xl font-bold">{formName || 'Untitled form'}</h1>
          {isQuiz ? (() => {
            const totalPoints = fields.reduce((sum, field) => {
              if (['text', 'section', 'email', 'phone'].includes(field.type)) return sum
              return sum + (field.points || 0)
            }, 0)
            if (totalPoints === 0) return null
            return (
              <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                <span className="font-semibold">Quiz:</span> {totalPoints} {totalPoints === 1 ? 'point' : 'points'} total
              </div>
            )
          })() : null}
          {hasSections ? (
            <p className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {sections.length + 1}
            </p>
          ) : null}
        </Card>

        {isClosed ? (
          <Card className="p-8 text-center">
            <Lock className="mx-auto mb-4" />
            <h2 className="mb-2 text-2xl font-semibold">Form Closed</h2>
            <p className="text-muted-foreground">{closedReason}</p>
          </Card>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {visiblePageFields.map((field) => (
                <Card key={field.id} className="p-6">
                  {field.type !== 'text' ? (
                    <>
                      <Label className="mb-3 block text-base">
                        {field.label}
                        {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                      </Label>
                      {field.description ? <p className="mb-3 text-sm text-muted-foreground">{field.description}</p> : null}
                    </>
                  ) : null}
                  {renderField(field)}
                </Card>
              ))}
            </div>

            {error ? (
              <div className="mt-4 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {locationRequiredForSubmission ? (
              <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Location access required</p>
                    <p className="mt-1">
                      {locationSettings.geoLockEnabled && locationSettings.geoLockRadiusMeters
                        ? `You must share your location and be within ${locationSettings.geoLockRadiusMeters} meters of the required area to submit this form.`
                        : 'You must share your location before this form can be submitted.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between">
              <div>
                {currentPage > 0 ? (
                  <Button type="button" variant="outline" onClick={handlePrevious}>
                    Previous
                  </Button>
                ) : null}
              </div>
              <div>
                {isLastPage ? (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (isRequestingLocation ? 'Checking location...' : isUploadingFiles ? 'Uploading files...' : 'Submitting...') : 'Submit'}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}

        <div className="mt-8 flex justify-center opacity-45">
          <Link href="/dashboard" aria-label="Open dashboard">
            <Image src="/betterformlogo.png" alt="Better Form logo" width={28} height={28} />
          </Link>
        </div>
      </div>
    </div>
  )
}
