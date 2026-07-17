export function sanitizeBlobFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function isRemoteBlobUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function getBlobStoreId() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return null
  // Token format: vercel_blob_rw_<storeId>_<secret>
  const parts = token.split('_')
  return parts[3] || null
}

// Verifies a blob URL actually belongs to this app's own Vercel Blob store and
// falls under the pathname prefix that was authorized when the upload token
// was issued (see app/api/blob/upload/route.ts). Without this, any https://
// URL — including one pointing at an attacker-owned blob store — would be
// accepted and later served back same-origin.
export function isOwnBlobUrl(value: string, expectedPathPrefix: string) {
  if (!/^https:\/\//i.test(value)) return false

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }

  if (!/\.blob\.vercel-storage\.com$/i.test(parsed.hostname)) return false

  const storeId = getBlobStoreId()
  if (storeId && !parsed.hostname.startsWith(`${storeId}.`)) return false

  const pathname = parsed.pathname.replace(/^\/+/, '')
  return pathname.startsWith(expectedPathPrefix)
}
