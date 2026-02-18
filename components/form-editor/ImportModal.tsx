'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X } from 'lucide-react'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (questions: Array<{ question: string; options: string[] }>) => void
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [importText, setImportText] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  function parseQuizletFormat(text: string) {
    try {
      const lines = text.trim().split('\n').filter((line) => line.trim())
      const questions: Array<{ question: string; options: string[] }> = []

      for (const line of lines) {
        // Support tab-separated format: Question\tAnswer1\tAnswer2\tAnswer3
        const parts = line.split('\t').map((p) => p.trim()).filter(Boolean)
        
        if (parts.length < 2) {
          throw new Error('Each line must have at least a question and one answer (tab-separated)')
        }

        questions.push({
          question: parts[0],
          options: parts.slice(1),
        })
      }

      return questions
    } catch (err) {
      throw new Error(`Parse error: ${err instanceof Error ? err.message : 'Invalid format'}`)
    }
  }

  function handleImport() {
    setError('')
    try {
      const questions = parseQuizletFormat(importText)
      if (questions.length === 0) {
        setError('No valid questions found')
        return
      }
      onImport(questions)
      setImportText('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse questions')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Import Questions from Quizlet</h2>
          <Button size="icon-sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-sm text-muted-foreground mb-4">
            Paste your questions in Quizlet format. Each line should be tab-separated:
            <br />
            <code className="bg-slate-100 px-2 py-1 rounded text-xs mt-2 block">
              Question text&nbsp;&nbsp;&nbsp;&nbsp;Option 1&nbsp;&nbsp;&nbsp;&nbsp;Option 2&nbsp;&nbsp;&nbsp;&nbsp;Option 3
            </code>
          </p>

          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Question 1	Answer A	Answer B	Answer C&#10;Question 2	Option 1	Option 2	Option 3"
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm min-h-50 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {error && (
            <div className="mt-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!importText.trim()}>
            Import Questions
          </Button>
        </div>
      </Card>
    </div>
  )
}
