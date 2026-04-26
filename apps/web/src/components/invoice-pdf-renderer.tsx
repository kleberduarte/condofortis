'use client'

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import type { InvoiceData } from './invoice-pdf'

dayjs.locale('pt-br')

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  OVERDUE: 'Em atraso',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  brandSub: { fontSize: 8, color: '#6b7280', marginTop: 3 },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  docRef: { fontSize: 9, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  section: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#6b7280', fontSize: 9 },
  value: { fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'right' },
  amountBig: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: '#111827', marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 12 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerText: { fontSize: 7, color: '#9ca3af', textAlign: 'center' },
  pixBlock: { backgroundColor: '#eff6ff', borderRadius: 6, padding: 12, marginTop: 4 },
  pixLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1d4ed8', marginBottom: 4 },
  pixCode: { fontSize: 7, color: '#1e40af', fontFamily: 'Courier', wordBreak: 'break-all' },
})

function getStatusColors(status: string) {
  switch (status) {
    case 'PAID':
      return { bg: '#d1fae5', text: '#065f46' }
    case 'OVERDUE':
      return { bg: '#fee2e2', text: '#991b1b' }
    case 'CANCELLED':
      return { bg: '#f3f4f6', text: '#374151' }
    default:
      return { bg: '#fef9c3', text: '#854d0e' }
  }
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function InvoicePdfDocument({ invoice }: { invoice: InvoiceData }) {
  const { bg, text } = getStatusColors(invoice.status)

  return (
    <Document title={`Fatura ${invoice.reference}`} author="CondoFortis">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CondoFortis</Text>
            <Text style={styles.brandSub}>{invoice.condominiumName ?? 'Sistema de Gestão'}</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>COBRANÇA</Text>
            <Text style={styles.docRef}>{invoice.reference}</Text>
          </View>
        </View>

        {/* Dados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes da Cobrança</Text>

          {invoice.unitNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Unidade</Text>
              <Text style={styles.value}>{invoice.unitNumber}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Referência</Text>
            <Text style={styles.value}>{invoice.reference}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Vencimento</Text>
            <Text style={styles.value}>{dayjs(invoice.dueDate).format('DD/MM/YYYY')}</Text>
          </View>
          {invoice.status === 'PAID' && invoice.paidAt && (
            <View style={styles.row}>
              <Text style={styles.label}>Pago em</Text>
              <Text style={styles.value}>{dayjs(invoice.paidAt).format('DD/MM/YYYY')}</Text>
            </View>
          )}
        </View>

        {/* Valor */}
        <View style={[styles.section, { alignItems: 'flex-start' }]}>
          <Text style={styles.sectionTitle}>Valor</Text>
          <Text style={styles.amountBig}>
            {fmt(Number(invoice.status === 'PAID' ? (invoice.paidAmount ?? invoice.amount) : invoice.amount))}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: bg }]}>
            <Text style={[styles.statusText, { color: text }]}>
              {STATUS_LABEL[invoice.status] ?? invoice.status}
            </Text>
          </View>
        </View>

        {/* PIX */}
        {invoice.pixCode && (
          <View style={styles.pixBlock}>
            <Text style={styles.pixLabel}>Código PIX (Copia e Cola)</Text>
            <Text style={styles.pixCode}>{invoice.pixCode}</Text>
          </View>
        )}

        {/* Código de barras */}
        {invoice.barcode && (
          <View style={[styles.section, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Código de Barras</Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, color: '#374151' }}>
              {invoice.barcode}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.divider} />
          <Text style={styles.footerText}>
            Documento gerado em {dayjs().format('DD/MM/YYYY [às] HH:mm')} · CondoFortis — Sistema de Gestão Condominial
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default function InvoicePdfDownload({ invoice }: { invoice: InvoiceData }) {
  const filename = `cobranca-${invoice.reference.replace('/', '-')}.pdf`

  return (
    <PDFDownloadLink document={<InvoicePdfDocument invoice={invoice} />} fileName={filename}>
      {({ loading }) => (
        <button
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          <FileDown className="w-3.5 h-3.5" />
          {loading ? 'Gerando…' : 'PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
