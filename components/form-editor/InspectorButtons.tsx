import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CirclePlus, Import, CaseSensitive, Image, GalleryVertical } from 'lucide-react'

interface Props {
  onAdd?: (type: string) => void
  className?: string
  vertical?: boolean
}

export default function InspectorButtons({ onAdd, className, vertical }: Props) {
  const base = 'p-0'
  if (vertical) {
    return (
      <div className={className}>
        <div className="flex flex-col gap-3 items-center">
          <Button variant="outline" size="icon-sm" className={base} onClick={() => onAdd?.('multiple_choice')}>
            <CirclePlus />
          </Button>
          <Button variant="outline" size="icon-sm" className={base}>
            <Import />
          </Button>
          <Button variant="outline" size="icon-sm" className={base} onClick={() => onAdd?.('short_text')}>
            <CaseSensitive />
          </Button>
          {/* <Button variant="outline" size="icon-sm" className={base}>
            <Image />
          </Button> */}
          <Button variant="outline" size="icon-sm" className={base}>
            <GalleryVertical />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex gap-3 items-center justify-center">
        <Button variant="outline" size="icon-sm" className={base} onClick={() => onAdd?.('multiple_choice')}>
          <CirclePlus />
        </Button>
        <Button variant="outline" size="icon-sm" className={base}>
          <Import />
        </Button>
        <Button variant="outline" size="icon-sm" className={base} onClick={() => onAdd?.('short_text')}>
          <CaseSensitive />
        </Button>
        {/* <Button variant="outline" size="icon-sm" className={base}>
          <Image />
        </Button> */}
        <Button variant="outline" size="icon-sm" className={base}>
          <GalleryVertical />
        </Button>
      </div>
    </div>
  )
}
