"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Copy, Download, Code, Mail, Share2, CheckCheck } from 'lucide-react'

interface SendTabProps {
  publicId: string
}

export default function SendTab({ publicId }: SendTabProps) {
  const [copied, setCopied] = React.useState(false)
  const [embedCopied, setEmbedCopied] = React.useState(false)
  
  const formUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${publicId}`
  const embedCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`

  const copyLink = () => {
    navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode)
    setEmbedCopied(true)
    setTimeout(() => setEmbedCopied(false), 2000)
  }

  const downloadQR = () => {
    // Generate QR code and download
    // Using a simple QR code API for now
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(formUrl)}`
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `form-${publicId}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Fill out this form')
    const body = encodeURIComponent(`Please fill out this form: ${formUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Form',
          text: 'Please fill out this form',
          url: formUrl,
        })
      } catch {
        console.log('Share cancelled')
      }
    }
  }

  return (
    <div className="max-w-4xl w-full mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">Send & Share</h3>
          <p className="text-sm text-muted-foreground">
            Share your form with respondents through different channels
          </p>
        </div>

        {/* Direct Link */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Copy className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">Direct Link</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Copy and share the link to your form
              </p>
              <div className="flex gap-2">
                <Input
                  value={formUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button onClick={copyLink} variant={copied ? "default" : "outline"}>
                  {copied ? (
                    <>
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* QR Code */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">QR Code</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Download a QR code for print materials, posters, or flyers
              </p>
              <Button onClick={downloadQR} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
            </div>
          </div>
        </Card>

        {/* Embed */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Code className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">Embed in Website</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Embed this form directly into your website with an iframe
              </p>
              <div className="space-y-3">
                <div className="bg-slate-900 text-slate-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
                  {embedCode}
                </div>
                <Button onClick={copyEmbedCode} variant={embedCopied ? "default" : "outline"}>
                  {embedCopied ? (
                    <>
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Embed Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Other sharing options */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">More Options</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Share via email or other platforms
              </p>
              <div className="flex gap-2">
                <Button onClick={shareViaEmail} variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Share via Email
                </Button>
                {typeof window !== 'undefined' && 'share' in navigator && (
                  <Button onClick={shareNative} variant="outline">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
