export function sanitizeBlobFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function isRemoteBlobUrl(value: string) {
  return /^https?:\/\//i.test(value)
}
