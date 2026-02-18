'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Field {
  id: string
  type: string
  label: string
  description?: string
  required?: boolean
  options?: Array<{ id: string; label: string }>
}

interface PublicFormProps {
  publicId: string
  formName: string
  fields: Field[]
  theme?: string
}

const THEME_COLORS: Record<string, { bg: string; border: string; input: string; button: string; text: string }> = {
    slate: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    input: 'focus:ring-slate-500',
    button: 'bg-slate-600 hover:bg-slate-700',
    text: 'text-slate-900',
  },
    blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    input: 'focus:ring-blue-500',
    button: 'bg-blue-500 hover:bg-blue-600',
    text: 'text-blue-900',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    input: 'focus:ring-green-500',
    button: 'bg-green-500 hover:bg-green-600',
    text: 'text-green-900',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    input: 'focus:ring-purple-500',
    button: 'bg-purple-500 hover:bg-purple-600',
    text: 'text-purple-900',
  },
  pink: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    input: 'focus:ring-pink-500',
    button: 'bg-pink-500 hover:bg-pink-600',
    text: 'text-pink-900',
  },
}

export default function PublicForm({ publicId, formName, fields, theme = 'slate' }: PublicFormProps) {
  const themeColors = THEME_COLORS[theme] || THEME_COLORS.slate
  const [responses, setResponses] = useState<Record<string, string | string[] | number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Filter out section fields for navigation
  const sections = fields.filter(f => f.type === 'section')
  const hasSections = sections.length > 0
  const [currentPage, setCurrentPage] = useState(0)

  // Get fields for current page
  const getPageFields = () => {
    if (!hasSections) return fields

    const sectionIndices = fields
      .map((f, idx) => (f.type === 'section' ? idx : -1))
      .filter(idx => idx !== -1)

    if (currentPage === 0) {
      // First page: all fields before first section
      return fields.slice(0, sectionIndices[0] || fields.length)
    } else if (currentPage <= sectionIndices.length) {
      // Middle pages: between sections
      const start = sectionIndices[currentPage - 1] + 1
      const end = sectionIndices[currentPage] || fields.length
      return fields.slice(start, end)
    }
    return []
  }

  const pageFields = getPageFields()
  const isLastPage = !hasSections || currentPage >= sections.length

  const handleInputChange = (fieldId: string, value: string | string[] | number) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleNext = () => {
    // Validate required fields on current page
    const missingRequired = pageFields.filter(f => f.required && !responses[f.id] && f.type !== 'text')
    if (missingRequired.length > 0) {
      setError('Please fill in all required fields')
      return
    }
    setError('')
    setCurrentPage(prev => prev + 1)
    window.scrollTo(0, 0)
  }

  const handlePrevious = () => {
    setError('')
    setCurrentPage(prev => prev - 1)
    window.scrollTo(0, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate all required fields
    const missingRequired = fields.filter(f => f.required && !responses[f.id] && f.type !== 'text' && f.type !== 'section')
    if (missingRequired.length > 0) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/submit/${publicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })

      if (!res.ok) {
        throw new Error('Submission failed')
      }

      setSubmitted(true)
    } catch {
      setError('Failed to submit form. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className={`min-h-screen ${themeColors.bg} py-12 px-4`}>
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-2xl font-semibold mb-2">Thank you!</h2>
            <p className="text-muted-foreground">Your response has been recorded.</p>
          </Card>
        </div>
      </div>
    )
  }

  const renderField = (field: Field) => {
    if (field.type === 'text') {
      return (
        <div className="whitespace-pre-wrap text-sm text-muted-foreground">
          {field.label}
        </div>
      )
    }

    if (field.type === 'section') {
      return null // Sections are handled by pagination
    }

    const value = responses[field.id] || ''

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
            className="w-full border border-slate-200 rounded-md px-3 py-2 min-h-24 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )

      case 'email':
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
            {field.options?.map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={opt.id}
                  checked={value === opt.id}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-4 h-4"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )

      case 'checkboxes':
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  value={opt.id}
                  checked={Array.isArray(value) && value.includes(opt.id)}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : []
                    const updated = e.target.checked
                      ? [...current, opt.id]
                      : current.filter((v) => v !== opt.id)
                    handleInputChange(field.id, updated)
                  }}
                  className="w-4 h-4"
                />
                <span>{opt.label}</span>
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
            className="w-full border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Choose</option>
            {field.options?.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
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

      case 'linear_scale':
      case 'rating':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleInputChange(field.id, num)}
                className={`w-10 h-10 rounded border-2 transition ${
                  value === num
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-300 hover:border-primary'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )

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
    <div className={`min-h-screen ${themeColors.bg} py-12 px-4`}>
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 mb-6">
          <h1 className="text-3xl font-bold mb-2">{formName || 'Untitled form'}</h1>
          {hasSections && (
            <p className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {sections.length + 1}
            </p>
          )}
        </Card>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {pageFields.map((field) => (
              <Card key={field.id} className="p-6">
                <Label className="text-base mb-3 block">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.description && (
                  <p className="text-sm text-muted-foreground mb-3">{field.description}</p>
                )}
                {renderField(field)}
              </Card>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div>
              {currentPage > 0 && (
                <Button type="button" variant="outline" onClick={handlePrevious}>
                  Previous
                </Button>
              )}
            </div>
            <div>
              {isLastPage ? (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
