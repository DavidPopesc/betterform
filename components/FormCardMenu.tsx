'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MoreVertical, Copy, QrCode, Download, Copy as CopyIcon, Trash2, Edit2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [formUrl, setFormUrl] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(formName)
  const [isRenamingLoading, setIsRenamingLoading] = useState(false)

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

  async function handleRename() {
    if (!newName.trim()) {
      setNewName(formName)
      setIsRenaming(false)
      return
    }

    setIsRenamingLoading(true)
    try {
      const res = await fetch(`/api/forms/${formId}/settings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (res.ok) {
        router.refresh()
        setIsRenaming(false)
        setIsOpen(false)
      }
    } catch (err) {
      console.error('Rename failed:', err)
      setNewName(formName)
    } finally {
      setIsRenamingLoading(false)
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
        <Card className="absolute right-0 -top-59 w-48 p-0 z-50 shadow-lg">
          {isRenaming ? (
            <div className="p-3 space-y-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Form name"
                className="w-full px-2 py-1 border rounded text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') {
                    setIsRenaming(false)
                    setNewName(formName)
                  }
                }}
                disabled={isRenamingLoading}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleRename}
                  disabled={isRenamingLoading}
                >
                  {isRenamingLoading ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsRenaming(false)
                    setNewName(formName)
                  }}
                  disabled={isRenamingLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => setIsRenaming(true)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 text-left"
              >
                <Edit2 className="w-4 h-4" />
                Rename
              </button>
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
          )}
        </Card>
      )}
    </div>
  )
}
