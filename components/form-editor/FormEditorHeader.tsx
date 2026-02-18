"use client"

import * as React from 'react'

type Tab = 'questions' | 'responses' | 'send' | 'settings'

interface FormEditorHeaderProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  isSaving: boolean
  lastSavedAt: Date | null
  isDirty: boolean
}

export default function FormEditorHeader({ 
  activeTab, 
  onTabChange, 
  isSaving, 
  lastSavedAt, 
  isDirty 
}: FormEditorHeaderProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'questions', label: 'Questions' },
    { id: 'responses', label: 'Responses' },
    { id: 'send', label: 'Send' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <h2 className="text-lg font-semibold">Form Editor</h2>
          <div className="text-sm text-muted-foreground">
            {isSaving
              ? 'Saving…'
              : lastSavedAt
              ? `Saved ${lastSavedAt.toLocaleTimeString()}`
              : isDirty
              ? 'Unsaved changes'
              : 'All changes saved'}
          </div>
        </div>
        
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export type { Tab }
