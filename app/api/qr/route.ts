import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createCanvas, loadImage } from 'canvas'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const data = searchParams.get('data')
    
    if (!data) {
      return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 })
    }

    // QR code parameters
    const qrSize = 600
    const logoSize = 120
    const logoPadding = 19.5

    // Generate base QR code to buffer
    const qrBuffer = await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'H', // High error correction to allow logo overlay
      margin: 2,
      width: qrSize,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Create canvas and load QR code
    const canvas = createCanvas(qrSize, qrSize)
    const ctx = canvas.getContext('2d')
    const qrImage = await loadImage(qrBuffer)
    ctx.drawImage(qrImage, 0, 0, qrSize, qrSize)

    // Load and draw logo
    try {
      const logoPath = `${process.cwd()}/public/betterformlogo.png`
      const logo = await loadImage(logoPath)
      
      // Calculate logo position (centered)
      const logoX = (qrSize - logoSize) / 2
      const logoY = (qrSize - logoSize) / 2
      
      // Draw white square background for logo (with padding)
      const bgSize = logoSize + logoPadding * 2
      const bgX = (qrSize - bgSize) / 2 +.5
      const bgY = (qrSize - bgSize) / 2 +.5
      
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(bgX, bgY, bgSize, bgSize)
      
      // Draw logo in the center
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
    } catch (logoError) {
      console.error('Logo loading failed, generating QR without logo:', logoError)
      // Continue without logo if it fails to load
    }

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png')

    // Return as PNG image
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('QR code generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}
