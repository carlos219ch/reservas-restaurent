// src/components/admin/MenuImportModal.tsx
//
// Wizard de importación de carta en 3 pasos:
//   1. Upload  → el admin sube un .xlsx / .xls / .csv / .pdf
//   2. Preview → tabla editable; puede corregir categoría, nombre, precio o eliminar filas
//   3. Done    → resumen de cuántos ítems se importaron
//
// Excel/CSV: parseo client-side con SheetJS (sin llamada a IA)
// PDF:       extracción de texto con pdf.js → envío a edge function parse-menu → Groq

import { useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import {
  Upload, FileSpreadsheet, FileText, X, Loader2, CheckCircle2,
  Trash2, AlertCircle, Download, Plus, ChevronLeft, UtensilsCrossed,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useMenuItems } from '@/hooks/useMenuItems'
import { useQueryClient } from '@tanstack/react-query'
import type { CreateMenuItemDTO } from '@/types'

// Configurar el worker de PDF.js (CDN para evitar complicaciones de Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()

// ----------------------------------------------------------------
// Tipos internos
// ----------------------------------------------------------------
type Step = 'upload' | 'parsing' | 'preview' | 'importing' | 'done'

interface PreviewRow {
  _id:         string
  include:     boolean
  category:    string
  name:        string
  description: string
  price:       string
  _error?:     string
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function makeId() {
  return Math.random().toString(36).slice(2)
}

function normalize(s: string) {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

function detectExcelColumns(headers: string[]): Record<string, number> {
  const maps: Record<string, string[]> = {
    category:    ['categoria', 'category', 'seccion', 'tipo', 'rubro', 'section'],
    name:        ['nombre', 'name', 'plato', 'producto', 'item', 'articulo', 'dish'],
    description: ['descripcion', 'description', 'detalle', 'detall', 'ingredientes', 'nota'],
    price:       ['precio', 'price', 'valor', 'importe', 'costo', 'cost', 'monto'],
  }
  const result: Record<string, number> = {}
  headers.forEach((header, idx) => {
    const n = normalize(header)
    for (const [field, aliases] of Object.entries(maps)) {
      if (!(field in result) && aliases.some(a => n.includes(a))) {
        result[field] = idx
      }
    }
  })
  return result
}

function rowsToPreview(
  rawRows: unknown[][],
  colMap: Record<string, number>,
): PreviewRow[] {
  return rawRows
    .filter(row => row.some(c => c !== null && c !== undefined && c !== ''))
    .map((row, i) => {
      const get = (field: string) =>
        colMap[field] !== undefined ? String(row[colMap[field]] ?? '') : ''
      return {
        _id:         makeId(),
        include:     true,
        category:    get('category'),
        name:        get('name'),
        description: get('description'),
        price:       get('price'),
      }
    })
}

function validateRow(row: PreviewRow): string | undefined {
  if (!row.name.trim())   return 'El nombre es obligatorio'
  const p = parseFloat(row.price)
  if (row.price.trim() && (isNaN(p) || p < 0)) return 'Precio inválido'
  return undefined
}

// Descarga una plantilla Excel para que el admin sepa el formato esperado
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Categoría',  'Nombre',            'Descripción',                  'Precio'],
    ['Entrantes',  'Ceviche de corvina','Fresco, con leche de tigre',   '1200'  ],
    ['Principales','Salmón a la plancha','Con vegetales salteados',     '2100'  ],
    ['Postres',    'Tiramisú',          'Cremoso, con cacao',           '850'   ],
    ['Bebidas',    'Limonada artesanal','Natural, con menta',           '450'   ],
  ])
  // Ancho de columnas
  ws['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 36 }, { wch: 10 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Carta')
  XLSX.writeFile(wb, 'plantilla-carta.xlsx')
}

// Extrae todo el texto de un PDF página por página
async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text    = content.items
      .map((item: unknown) => {
        const i = item as { str?: string }
        return i.str ?? ''
      })
      .join(' ')
    pages.push(text)
  }

  return pages.join('\n\n')
}

// ----------------------------------------------------------------
// Subcomponente: fila editable en la tabla de preview
// ----------------------------------------------------------------
interface RowProps {
  row:      PreviewRow
  onChange: (id: string, field: keyof PreviewRow, value: string | boolean) => void
  onRemove: (id: string) => void
}

function PreviewRowComponent({ row, onChange, onRemove }: RowProps) {
  const error = validateRow(row)
  const base  = 'h-7 w-full rounded border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30'
  const err   = error ? 'border-destructive' : ''

  return (
    <tr className={`border-b last:border-0 transition-opacity ${!row.include ? 'opacity-40' : ''}`}>
      <td className="px-3 py-1.5">
        <input
          type="checkbox"
          checked={row.include}
          onChange={e => onChange(row._id, 'include', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 accent-primary"
        />
      </td>
      <td className="px-1.5 py-1.5 min-w-[120px]">
        <input
          type="text"
          value={row.category}
          onChange={e => onChange(row._id, 'category', e.target.value)}
          placeholder="Categoría"
          className={`${base} ${err}`}
        />
      </td>
      <td className="px-1.5 py-1.5 min-w-[160px]">
        <input
          type="text"
          value={row.name}
          onChange={e => onChange(row._id, 'name', e.target.value)}
          placeholder="Nombre del plato *"
          className={`${base} ${!row.name.trim() ? 'border-destructive' : ''}`}
        />
      </td>
      <td className="px-1.5 py-1.5 min-w-[180px]">
        <input
          type="text"
          value={row.description}
          onChange={e => onChange(row._id, 'description', e.target.value)}
          placeholder="Descripción (opcional)"
          className={base}
        />
      </td>
      <td className="px-1.5 py-1.5 w-24">
        <input
          type="text"
          value={row.price}
          onChange={e => onChange(row._id, 'price', e.target.value)}
          placeholder="0"
          className={`${base} ${err}`}
        />
      </td>
      <td className="px-2 py-1.5">
        <button
          onClick={() => onRemove(row._id)}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ----------------------------------------------------------------
// Modal principal
// ----------------------------------------------------------------
interface Props {
  onClose: () => void
}

export default function MenuImportModal({ onClose }: Props) {
  const [step,        setStep]        = useState<Step>('upload')
  const [rows,        setRows]        = useState<PreviewRow[]>([])
  const [parseError,  setParseError]  = useState('')
  const [importStats, setImportStats] = useState({ ok: 0, errors: 0 })
  const [dragOver,    setDragOver]    = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qc           = useQueryClient()

  // ── Parsing ──────────────────────────────────────────────────

  async function processExcel(file: File) {
    const buffer = await file.arrayBuffer()
    const wb     = XLSX.read(buffer, { type: 'array' })
    const ws     = wb.Sheets[wb.SheetNames[0]]
    const raw    = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

    if (raw.length < 2) throw new Error('El archivo no tiene datos suficientes.')

    const headers = raw[0].map(h => String(h ?? ''))
    const colMap  = detectExcelColumns(headers)

    // Si no se detectó ninguna columna, asumir orden por defecto: A=category, B=name, C=desc, D=price
    if (Object.keys(colMap).length === 0) {
      colMap.category    = 0
      colMap.name        = 1
      colMap.description = 2
      colMap.price       = 3
    }

    const parsed = rowsToPreview(raw.slice(1), colMap)
    if (parsed.length === 0) throw new Error('No se encontraron ítems en el archivo.')
    setRows(parsed)
  }

  async function processCsv(file: File) {
    const text = await file.text()
    const wb   = XLSX.read(text, { type: 'string' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const raw  = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

    const headers = raw[0].map(h => String(h ?? ''))
    const colMap  = detectExcelColumns(headers)
    if (Object.keys(colMap).length === 0) {
      colMap.category = 0; colMap.name = 1; colMap.description = 2; colMap.price = 3
    }

    const parsed = rowsToPreview(raw.slice(1), colMap)
    if (parsed.length === 0) throw new Error('No se encontraron ítems en el CSV.')
    setRows(parsed)
  }

  async function processPdf(file: File) {
    // 1. Extraer texto del PDF
    const text = await extractPdfText(file)
    if (!text.trim()) throw new Error('No se pudo extraer texto del PDF. ¿Es un PDF escaneado?')

    // 2. Enviar a la edge function para parsear con Groq
    const { data, error } = await supabase.functions.invoke('parse-menu', {
      body: { text },
    })

    if (error) throw new Error('Error al procesar el PDF con IA: ' + error.message)

    const items = (data as { items: Array<{category:string;name:string;description:string|null;price:number}> })?.items ?? []
    if (items.length === 0) throw new Error('La IA no encontró ítems en el PDF. Revisá que sea una carta de menú.')

    const parsed: PreviewRow[] = items.map(item => ({
      _id:         makeId(),
      include:     true,
      category:    item.category ?? '',
      name:        item.name ?? '',
      description: item.description ?? '',
      price:       String(item.price ?? 0),
    }))

    setRows(parsed)
  }

  async function handleFile(file: File) {
    setParseError('')
    setStep('parsing')

    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'xlsx' || ext === 'xls') {
        await processExcel(file)
      } else if (ext === 'csv') {
        await processCsv(file)
      } else if (ext === 'pdf') {
        await processPdf(file)
      } else {
        throw new Error('Formato no soportado. Usá .xlsx, .xls, .csv o .pdf')
      }
      setStep('preview')
    } catch (err) {
      setParseError((err as Error).message)
      setStep('upload')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  // ── Edición de filas ─────────────────────────────────────────

  function updateRow(id: string, field: keyof PreviewRow, value: string | boolean) {
    setRows(rs => rs.map(r => r._id === id ? { ...r, [field]: value } : r))
  }

  function removeRow(id: string) {
    setRows(rs => rs.filter(r => r._id !== id))
  }

  function addRow() {
    setRows(rs => [...rs, {
      _id: makeId(), include: true,
      category: '', name: '', description: '', price: '',
    }])
  }

  function toggleAll(checked: boolean) {
    setRows(rs => rs.map(r => ({ ...r, include: checked })))
  }

  // ── Importación ──────────────────────────────────────────────

  async function handleImport() {
    const toImport = rows.filter(r => r.include && r.name.trim())
    if (toImport.length === 0) return

    setStep('importing')

    let ok = 0
    let errors = 0

    // Insertar en lotes de 50
    const chunks: PreviewRow[][] = []
    for (let i = 0; i < toImport.length; i += 50) {
      chunks.push(toImport.slice(i, i + 50))
    }

    for (const chunk of chunks) {
      const dtos: CreateMenuItemDTO[] = chunk.map(r => ({
        category:    r.category.trim() || 'Sin categoría',
        name:        r.name.trim(),
        description: r.description.trim() || null,
        price:       parseFloat(r.price) || 0,
        available:   true,
        sort_order:  0,
      }))

      const { error } = await supabase.from('menu_items').insert(dtos)
      if (error) {
        errors += chunk.length
      } else {
        ok += chunk.length
      }
    }

    qc.invalidateQueries({ queryKey: ['menu_items'] })
    setImportStats({ ok, errors })
    setStep('done')
  }

  // ── Calcular validez para el botón de importar ────────────────
  const validRows  = rows.filter(r => r.include && r.name.trim())
  const errorRows  = rows.filter(r => r.include && !r.name.trim())
  const allChecked = rows.length > 0 && rows.every(r => r.include)

  // ── Render ───────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && step !== 'parsing' && step !== 'importing' && onClose()}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90dvh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
            <span className="font-semibold">Importar carta</span>
            {step === 'preview' && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
                {rows.length} ítems detectados
              </span>
            )}
          </div>
          {step !== 'parsing' && step !== 'importing' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Indicador de pasos */}
        {(step === 'upload' || step === 'parsing' || step === 'preview') && (
          <div className="flex gap-0 shrink-0 px-5 pt-4 pb-0">
            {[['1', 'Subir archivo'], ['2', 'Revisar y editar'], ['3', 'Importar']].map(([n, label], i) => {
              const active = (step === 'upload' || step === 'parsing') ? i === 0 : i === 1
              const done   = (step === 'preview' && i === 0)
              return (
                <div key={n} className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 rounded-full items-center justify-center text-[11px] font-bold
                    ${done   ? 'bg-green-500 text-white'
                    : active ? 'bg-primary text-primary-foreground'
                    :          'bg-muted text-muted-foreground'}`}>
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-xs ${active ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
                  {i < 2 && <div className="w-8 h-px bg-border mx-2" />}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Contenido según step ── */}

        {/* STEP: Upload */}
        {(step === 'upload') && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Error de parsing previo */}
            {parseError && (
              <div className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Error al procesar el archivo</p>
                  <p className="text-xs text-destructive/80 mt-0.5">{parseError}</p>
                </div>
              </div>
            )}

            {/* Zona drag & drop */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors
                ${dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="flex justify-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-red-500" />
                </div>
              </div>
              <p className="font-semibold text-base">
                {dragOver ? 'Soltá el archivo aquí' : 'Arrastrá el archivo o hacé clic para seleccionar'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Acepta <span className="font-mono text-xs">.xlsx</span>,{' '}
                <span className="font-mono text-xs">.xls</span>,{' '}
                <span className="font-mono text-xs">.csv</span> y{' '}
                <span className="font-mono text-xs">.pdf</span>
              </p>
            </div>

            {/* Info formatos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Excel / CSV</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  El archivo debe tener columnas: <strong>Categoría, Nombre, Descripción, Precio</strong>.
                  Los encabezados se detectan automáticamente.
                </p>
                <button
                  onClick={e => { e.stopPropagation(); downloadTemplate() }}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Download className="h-3 w-3" />
                  Descargar plantilla Excel
                </button>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">PDF</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  La IA lee el contenido del PDF y extrae los platos automáticamente.
                  Funciona con cartas de texto (no escaneadas como imagen).
                </p>
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <Info className="h-3 w-3 shrink-0" />
                  Podés corregir cualquier error en el paso siguiente.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Parsing */}
        {step === 'parsing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Procesando archivo…</p>
              <p className="text-sm text-muted-foreground mt-1">
                Si es un PDF, la IA está extrayendo los ítems. Puede tardar unos segundos.
              </p>
            </div>
          </div>
        )}

        {/* STEP: Preview */}
        {step === 'preview' && (
          <>
            <div className="flex-1 overflow-auto p-5 space-y-3 min-h-0">

              {/* Alertas */}
              {errorRows.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30
                                border border-amber-200 dark:border-amber-900/40 px-4 py-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>{errorRows.length} filas</strong> no tienen nombre y serán omitidas al importar.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Revisá cada fila. Podés editar cualquier campo, desmarcar lo que no quieras importar o agregar filas nuevas.
                </p>
                <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5 shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Agregar fila
                </Button>
              </div>

              {/* Tabla */}
              <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={e => toggleAll(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 accent-primary"
                          />
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Categoría</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Nombre *</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Descripción</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Precio</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map(row => (
                        <PreviewRowComponent
                          key={row._id}
                          row={row}
                          onChange={updateRow}
                          onRemove={removeRow}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="border-t px-5 py-4 flex items-center justify-between gap-3 shrink-0 bg-background">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStep('upload'); setParseError('') }}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver
              </Button>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{validRows.length}</strong> ítems para importar
                </p>
                <Button
                  onClick={handleImport}
                  disabled={validRows.length === 0}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar {validRows.length > 0 ? `${validRows.length} platos` : ''}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* STEP: Importing */}
        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Importando platos…</p>
              <p className="text-sm text-muted-foreground mt-1">
                Guardando {validRows.length} ítems en la base de datos.
              </p>
            </div>
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-10 text-center">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-950/30
                            flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold">¡Importación completada!</p>
              <p className="text-muted-foreground mt-2">
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  {importStats.ok} platos
                </span>{' '}
                importados exitosamente.
                {importStats.errors > 0 && (
                  <span className="text-destructive ml-1">
                    ({importStats.errors} con errores)
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep('upload'); setRows([]); setParseError('') }}
              >
                Importar otro archivo
              </Button>
              <Button onClick={onClose}>
                Ver carta
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
