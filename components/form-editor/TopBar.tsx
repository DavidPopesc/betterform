"use client"

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { CloudBackup, CloudCheck, CloudOff } from 'lucide-react'

import SignOutButton from '@/components/sign-out-button'

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

  const status = isSaving
    ? { label: 'Saving...', icon: CloudBackup }
    : isDirty
    ? { label: 'Unsaved changes', icon: CloudOff }
    : { label: 'Changes saved', icon: CloudCheck }

  const StatusIcon = status.icon

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="py-3 md:grid md:grid-cols-[auto_1fr_auto] md:items-end md:gap-6">
          <div className="flex items-center justify-between gap-4">
            <a 
              href="/dashboard" 
              onClick={handleLogoClick}
              className="inline-flex items-center gap-4 cursor-pointer"
            >
              <Image src="/betterformlogo.png" width={40} height={40} alt="Better Form logo" />
              <span className="text-2xl font-semibold">{title}</span>
            </a>

            <div className="flex items-center gap-2 text-sm text-muted-foreground md:hidden">
              <StatusIcon className="h-4 w-4" />
              <span>{status.label}</span>
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-6 md:mt-0">
            <nav className="flex gap-4 overflow-x-auto whitespace-nowrap md:justify-center">
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

            <div className="hidden items-center justify-end gap-2 pb-2 text-sm text-muted-foreground md:flex">
              <StatusIcon className="h-4 w-4" />
              <span>{status.label}</span>
            </div>

            <div className="hidden pb-2 md:block">
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
