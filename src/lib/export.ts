import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Row = Record<string, unknown>

/** Export array of objects to CSV download */
export function exportCSV(rows: Row[], filename: string) {
  if (!rows.length) return
  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
}

/** Export to .xlsx */
export function exportExcel(rows: Row[], filename: string, sheetName = 'Data') {
  if (!rows.length) return
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/** Export to PDF table */
export function exportPDF(
  columns: string[],
  rows: (string | number)[][],
  filename: string,
  title?: string,
) {
  const doc = new jsPDF()
  if (title) {
    doc.setFontSize(14)
    doc.text(title, 14, 16)
  }
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: title ? 22 : 14,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [249, 115, 22] }, // orange
  })
  doc.save(`${filename}.pdf`)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
