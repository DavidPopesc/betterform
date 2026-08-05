"use client"

import * as React from "react"
import { Caveat } from "next/font/google"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SignatureMode, SignatureValue } from "@/lib/form-schema"

const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600", "700"] })

type SignaturePadProps = {
  mode: SignatureMode
  value?: SignatureValue
  onChange: (value: SignatureValue | undefined) => void
  disabled?: boolean
}

export function SignaturePad({ mode, value, onChange, disabled }: SignaturePadProps) {
  const availableTabs: Array<"draw" | "type"> =
    mode === "either" ? ["draw", "type"] : [mode]
  const [activeTab, setActiveTab] = React.useState<"draw" | "type">(
    value?.mode ?? availableTabs[0]
  )

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const drawingRef = React.useRef(false)
  const hasStrokeRef = React.useRef(false)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || activeTab !== "draw") return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "#0f172a"
  }, [activeTab])

  function getPoint(canvas: HTMLCanvasElement, e: React.PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const { x, y } = getPoint(canvas, e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const { x, y } = getPoint(canvas, e)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasStrokeRef.current = true
  }

  function handlePointerUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    if (hasStrokeRef.current) {
      onChange({ mode: "draw", dataUrl: canvas.toDataURL("image/png") })
    }
  }

  function clearDrawing() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokeRef.current = false
    onChange(undefined)
  }

  function handleTypedChange(text: string) {
    if (!text.trim()) {
      onChange(undefined)
      return
    }
    onChange({ mode: "type", text, font: caveat.style.fontFamily })
  }

  return (
    <div className="space-y-2">
      {availableTabs.length > 1 && (
        <div className="inline-flex rounded-md border p-0.5 text-sm">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              disabled={disabled}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-sm px-3 py-1 capitalize transition-colors",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {tab === "draw" ? "Draw" : "Type"}
            </button>
          ))}
        </div>
      )}

      {activeTab === "draw" ? (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={cn(
              "w-full max-w-md touch-none rounded-md border bg-white",
              disabled && "pointer-events-none opacity-50"
            )}
          />
          <Button type="button" variant="outline" size="sm" onClick={clearDrawing} disabled={disabled}>
            Clear
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            placeholder="Type your full name"
            disabled={disabled}
            defaultValue={value?.mode === "type" ? value.text : ""}
            onChange={(e) => handleTypedChange(e.target.value)}
            className="max-w-md"
          />
          <p
            style={{ fontFamily: caveat.style.fontFamily }}
            className="min-h-10 max-w-md rounded-md border bg-white px-3 py-1 text-3xl text-slate-900"
          >
            {value?.mode === "type" ? value.text : ""}
          </p>
        </div>
      )}
    </div>
  )
}
