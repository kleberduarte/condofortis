'use client'

import { QRCodeSVG } from 'qrcode.react'

type VisitorQrCodePanelProps = {
  value: string
  /** Título curto acima do QR */
  caption?: string
  /** Texto abaixo do QR (ex.: validade) */
  footer?: string
  /** Lado do quadrado em px (padrão 200) */
  size?: number
}

/**
 * QR matricial legível por câmeras (fundo branco / módulos pretos).
 */
export function VisitorQrCodePanel({
  value,
  caption = 'Aponte a câmara ou mostre na portaria',
  footer,
  size = 200,
}: VisitorQrCodePanelProps) {
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{caption}</p>
      <div className="flex justify-center">
        <div className="inline-block p-4 bg-white rounded-2xl shadow-sm border border-gray-200 dark:border-gray-600">
          <QRCodeSVG
            value={value}
            size={size}
            level="M"
            includeMargin
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
      </div>
      {footer ? (
        <p className="text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-lg px-3 py-2 text-center font-medium">
          {footer}
        </p>
      ) : null}
      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Ou copie o código</p>
      <p className="font-mono text-xs break-all text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
        {value}
      </p>
    </div>
  )
}
