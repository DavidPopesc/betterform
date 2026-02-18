"use client"

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import * as React from 'react'

export type Tab = 'questions' | 'responses' | 'send' | 'settings'

interface TopBarProps {
  title?: string
  activeTab?: Tab
  onTabChange?: (tab: Tab) => void
  isSaving?: boolean
  isDirty?: boolean
}

export default function TopBar({
  title = 'Better Form',
  activeTab = 'questions',
  onTabChange,
  isSaving = false,
  isDirty = false,
}: TopBarProps) {
  const router = useRouter()
  
  const tabs: { id: Tab; label: string }[] = [
    { id: 'questions', label: 'Questions' },
    { id: 'responses', label: 'Responses' },
    { id: 'send', label: 'Send' },
    { id: 'settings', label: 'Settings' },
  ]

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
      if (!confirmed) return
    }
    router.push('/dashboard')
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            <a 
              href="/dashboard" 
              onClick={handleLogoClick}
              className="inline-flex items-center gap-4 cursor-pointer"
            >
              <Image src="/betterformlogo.png" width={40} height={40} alt="Better Form logo" />
              <span className="text-2xl font-semibold">{title}</span>
            </a>

            <div className="text-sm text-muted-foreground md:hidden">
              {isSaving
                ? 'Saving…'
                : isDirty
                ? 'Unsaved changes'
                : 'Changes saved'}
            </div>
          </div>

          <div className="flex items-center justify-between gap-6">
            <nav className="flex gap-4 overflow-x-auto whitespace-nowrap">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="text-sm text-muted-foreground hidden md:block">
              {isSaving
                ? 'Saving…'
                : isDirty
                ? 'Unsaved changes'
                : 'Changes saved'}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
