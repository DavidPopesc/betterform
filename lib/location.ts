export type SubmissionLocation = {
  latitude: number
  longitude: number
  accuracyMeters: number | null
  capturedAt: string
}

export function isValidCoordinate(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export function parseSubmissionLocation(input: unknown): SubmissionLocation | null {
  if (typeof input !== 'object' || input === null) return null

  const candidate = input as Record<string, unknown>
  const latitude = candidate.latitude
  const longitude = candidate.longitude
  const accuracyMeters = candidate.accuracyMeters
  const capturedAt = candidate.capturedAt

  if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) {
    return null
  }

  if (accuracyMeters !== null && accuracyMeters !== undefined && (typeof accuracyMeters !== 'number' || !Number.isFinite(accuracyMeters) || accuracyMeters < 0)) {
    return null
  }

  if (typeof capturedAt !== 'string' || Number.isNaN(Date.parse(capturedAt))) {
    return null
  }

  return {
    latitude: latitude as number,
    longitude: longitude as number,
    accuracyMeters: typeof accuracyMeters === 'number' ? accuracyMeters : null,
    capturedAt,
  }
}

export function distanceBetweenMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const earthRadiusMeters = 6371000
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const deltaLatitude = toRadians(latitudeB - latitudeA)
  const deltaLongitude = toRadians(longitudeB - longitudeA)
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2)

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatLocationSummary(location: SubmissionLocation | null | undefined) {
  if (!location) return 'Location unavailable'

  const pieces = [
    `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
  ]

  if (typeof location.accuracyMeters === 'number') {
    pieces.push(`±${Math.round(location.accuracyMeters)}m`)
  }

  return pieces.join(' • ')
}
