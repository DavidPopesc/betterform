'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MoreVertical, Copy, QrCode, Download, Copy as CopyIcon, Trash2 } from 'lucide-react'

interface FormCardMenuProps {
  formId: string
  formName: string
  publicId: string
  onDuplicate: () => void
  onDelete: () => void
}

export default function FormCardMenu({
  formId,
  formName,
  publicId,
  onDuplicate,
  onDelete,
}: FormCardMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formUrl, setFormUrl] = useState('')

  useEffect(() => {
    setFormUrl(`${window.location.origin}/f/${publicId}`)
  }, [publicId])

  const qrDownloadUrl = `/api/qr?data=${encodeURIComponent(formUrl)}`

  function copyLink() {
    if (formUrl) {
      navigator.clipboard.writeText(formUrl)
      setIsOpen(false)
    }
  }

  async function downloadQR() {
    try {
      const res = await fetch(qrDownloadUrl)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${formName || 'form'}-qr.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      setIsOpen(false)
    } catch (err) {
      console.error('QR download failed:', err)
    }
  }

  async function downloadCSV() {
    try {
      const res = await fetch(`/api/forms/${formId}/export`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${formName || 'form'}-responses.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      setIsOpen(false)
    } catch (err) {
      console.error('CSV download failed:', err)
    }
  }

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <Card className="absolute right-0 -top-64 w-48 p-0 z-50 shadow-lg">
          <div className="space-y-1">
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 text-left"
            >
              <Copy className="w-4 h-4" />
              Copy link
            </button>
            <button
              onClick={downloadQR}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 text-left"
            >
              <QrCode className="w-4 h-4" />
              Download QR
            </button>
            <button
              onClick={downloadCSV}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 text-left"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
            <div className="border-t" />
            <button
              onClick={() => {
                onDuplicate()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 text-left"
            >
              <CopyIcon className="w-4 h-4" />
              Duplicate
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete "${formName}"?`)) {
                  onDelete()
                }
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
