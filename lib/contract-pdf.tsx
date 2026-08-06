import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { SignatureValue } from '@/lib/form-schema'

type ContractField = {
  id: string
  type: string
  label?: string
  content?: string
  options?: Array<{ id: string; label: string }>
}

type ContractPdfParams = {
  formName: string
  fields: ContractField[]
  responses: Record<string, unknown>
  signedAt: Date
  respondentIp: string | null
  respondentEmail: string
  deviceMetadata?: Record<string, unknown>
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  fieldBlock: { marginBottom: 12 },
  label: { fontWeight: 700, marginBottom: 2 },
  legalText: { whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.4 },
  value: { color: '#0f172a' },
  signatureImage: { width: 200, height: 75, objectFit: 'contain' },
  signatureText: { fontSize: 24, fontStyle: 'italic' },
  auditBox: { marginTop: 20, paddingTop: 12, borderTop: '1pt solid #cbd5e1' },
  auditRow: { fontSize: 9, color: '#64748b', marginBottom: 2 },
})

function formatValue(field: ContractField, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  if (['multiple_choice', 'dropdown'].includes(field.type)) {
    const option = field.options?.find((o) => o.id === String(value))
    return option?.label || String(value)
  }
  if (field.type === 'checkboxes' && Array.isArray(value)) {
    return value.map((item) => field.options?.find((o) => o.id === String(item))?.label || String(item)).join(', ')
  }
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export async function renderContractPdf(params: ContractPdfParams): Promise<Buffer> {
  const { formName, fields, responses, signedAt, respondentIp, respondentEmail, deviceMetadata } = params

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{formName}</Text>

        {fields.map((field) => {
          if (field.type === 'legal_text') {
            return (
              <View key={field.id} style={styles.fieldBlock}>
                {field.label ? <Text style={styles.label}>{field.label}</Text> : null}
                <Text style={styles.legalText}>{field.content || ''}</Text>
              </View>
            )
          }

          if (field.type === 'signature') {
            const value = responses[field.id] as SignatureValue | undefined
            return (
              <View key={field.id} style={styles.fieldBlock}>
                <Text style={styles.label}>{field.label || 'Signature'}</Text>
                {value?.mode === 'draw' && value.dataUrl ? (
                  <Image src={value.dataUrl} style={styles.signatureImage} />
                ) : value?.mode === 'type' && value.text ? (
                  <Text style={styles.signatureText}>{value.text}</Text>
                ) : (
                  <Text style={styles.value}>—</Text>
                )}
              </View>
            )
          }

          return (
            <View key={field.id} style={styles.fieldBlock}>
              <Text style={styles.label}>{field.label || field.id}</Text>
              <Text style={styles.value}>{formatValue(field, responses[field.id])}</Text>
            </View>
          )
        })}

        <View style={styles.auditBox}>
          <Text style={styles.auditRow}>Signed by: {respondentEmail}</Text>
          <Text style={styles.auditRow}>Signed at: {signedAt.toISOString()}</Text>
          <Text style={styles.auditRow}>IP address: {respondentIp || 'unknown'}</Text>
          {deviceMetadata ? (
            <Text style={styles.auditRow}>Device info: {JSON.stringify(deviceMetadata)}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  )

  return renderToBuffer(doc)
}
