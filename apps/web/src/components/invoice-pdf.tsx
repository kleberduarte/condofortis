'use client'

import dynamic from 'next/dynamic'
import { FileDown, Loader2 } from 'lucide-react'

export type InvoiceData = {
  id: string
  reference: string
  dueDate: string
  amount: number
  paidAmount?: number
  paidAt?: string
  status: string
  barcode?: string
  pixCode?: string
  condominiumName?: string
  unitNumber?: string
  tenantName?: string
}

// Dynamically import the heavy PDF libs only on the client
const InvoicePdfDownload = dynamic(() => import('./invoice-pdf-renderer'), {
  ssr: false,
  loading: () => (
    <button
      disabled
      className="inline-flex items-center gap-1.5 text-xs text-gray-400 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> PDF…
    </button>
  ),
})

export function DownloadInvoiceButton({ invoice }: { invoice: InvoiceData }) {
  return <InvoicePdfDownload invoice={invoice} />
}
