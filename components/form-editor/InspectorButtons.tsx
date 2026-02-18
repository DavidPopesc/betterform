import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CirclePlus, Import, GalleryVertical, Type } from 'lucide-react'

interface Props {
  onAdd?: (type: string) => void
  onImport?: () => void
  className?: string
  vertical?: boolean
}

export default function InspectorButtons({ onAdd, onImport, className, vertical }: Props) {
  const base = 'p-0'
  if (vertical) {
    return (
      <div className={className}>
        <div className="flex flex-col gap-3 items-center">
          <Button variant="outline" size="icon-sm" className={base} onClick={() => onAdd?.('multiple_choice')} title="Add Question">
            <CirclePlus />
          </Button>
          <Button variant="outline" size="icon-sm" className={base} onClick={() => onImport?.()} title="Import Questions">
            <Import />
          </Button>
          <Button variant="outline" size="icon-sm" className={base} onClick={() => onAdd?.('text')} title="Add Text">
            <Type />
          </Button>
          <Button variant="outline" size="icon-sm" className={base} onClick={() => onAdd?.('section')} title="Add Section">
            <GalleryVertical />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex gap-3 items-center justify-center">
        <Button variant="outline" size="icon-sm" className={base} onClick={() => onAdd?.('multiple_choice')} title="Add Question">
          <CirclePlus />
        </Button>
        <Button variant="outline" size="icon-sm" className={base} onClick={() => onImport?.()} title="Import Questions">
          <Import />
        </Button>
        <Button variant="outline" size="icon-sm" className={base} onClick={() => onAdd?.('text')} title="Add Text">
          <Type />
        </Button>
        <Button variant="outline" size="icon-sm" className={base} onClick={() => onAdd?.('section')} title="Add Section">
          <GalleryVertical />
        </Button>
      </div>
    </div>
  )
}
