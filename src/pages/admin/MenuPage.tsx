// src/pages/admin/MenuPage.tsx
//
// Gestión de la carta del restaurante: agregar, editar, activar/desactivar
// y eliminar ítems organizados por categoría.

import { useState, useMemo } from 'react'
import {
  UtensilsCrossed, Plus, Pencil, Trash2, Eye, EyeOff,
  Loader2, ChevronDown, ChevronUp, Search, X, DollarSign,
  Tag, AlignLeft, ArrowUpDown, Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
} from '@/hooks/useMenuItems'
import MenuImportModal from '@/components/admin/MenuImportModal'
import type { MenuItem, CreateMenuItemDTO } from '@/types'

// ----------------------------------------------------------------
// Categorías predefinidas (el admin puede escribir una propia)
// ----------------------------------------------------------------
const PRESET_CATEGORIES = [
  'Entrantes',
  'Sopas y Ensaladas',
  'Principales',
  'Pastas y Arroces',
  'Pizzas',
  'Mariscos',
  'Carnes',
  'Postres',
  'Bebidas',
  'Cócteles',
  'Vinos',
]

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(price)
}

// ----------------------------------------------------------------
// Modal de creación / edición
// ----------------------------------------------------------------
interface ItemFormData {
  category: string
  name: string
  description: string
  price: string
  available: boolean
  sort_order: string
}

const EMPTY_FORM: ItemFormData = {
  category: '',
  name: '',
  description: '',
  price: '',
  available: true,
  sort_order: '0',
}

interface ItemModalProps {
  item?: MenuItem | null
  onClose: () => void
}

function ItemModal({ item, onClose }: ItemModalProps) {
  const isEdit = !!item

  const [form, setForm] = useState<ItemFormData>(
    item
      ? {
          category:    item.category,
          name:        item.name,
          description: item.description ?? '',
          price:       String(item.price),
          available:   item.available,
          sort_order:  String(item.sort_order),
        }
      : EMPTY_FORM
  )
  const [customCategory, setCustomCategory] = useState(
    item && !PRESET_CATEGORIES.includes(item.category)
  )
  const [error, setError] = useState('')

  const createMutation = useCreateMenuItem()
  const updateMutation = useUpdateMenuItem()
  const isPending = createMutation.isPending || updateMutation.isPending

  function set(field: keyof ItemFormData, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.category.trim()) { setError('Seleccioná una categoría.'); return }
    if (!form.name.trim())     { setError('El nombre es obligatorio.'); return }
    const priceNum = parseFloat(form.price)
    if (isNaN(priceNum) || priceNum < 0) { setError('El precio debe ser un número positivo.'); return }

    const dto: CreateMenuItemDTO = {
      category:    form.category.trim(),
      name:        form.name.trim(),
      description: form.description.trim() || null,
      price:       priceNum,
      available:   form.available,
      sort_order:  parseInt(form.sort_order) || 0,
    }

    if (isEdit && item) {
      updateMutation.mutate({ id: item.id, ...dto }, { onSuccess: onClose })
    } else {
      createMutation.mutate(dto, { onSuccess: onClose })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
            <span className="font-semibold">
              {isEdit ? 'Editar plato' : 'Nuevo plato'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Categoría
            </label>
            {!customCategory ? (
              <div className="flex gap-2">
                <select
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="flex-1 h-10 rounded-xl border bg-background px-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Seleccionar…</option>
                  {PRESET_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { set('category', ''); setCustomCategory(true) }}
                  className="px-3 h-10 rounded-xl border text-xs text-muted-foreground
                             hover:bg-muted transition-colors whitespace-nowrap"
                >
                  + Otra
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  placeholder="Ej: Tapas, Fondue…"
                  className="flex-1 h-10 rounded-xl border bg-background px-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => { set('category', ''); setCustomCategory(false) }}
                  className="px-3 h-10 rounded-xl border text-xs text-muted-foreground
                             hover:bg-muted transition-colors"
                >
                  Lista
                </button>
              </div>
            )}
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nombre del plato</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ej: Salmón a la plancha"
              className="w-full h-10 rounded-xl border bg-background px-3 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlignLeft className="h-3.5 w-3.5" /> Descripción
              <span className="text-muted-foreground/50">(opcional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Ingredientes, acompañamientos, alérgenos…"
              rows={2}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Precio + Orden */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Precio
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 rounded-xl border bg-background pl-7 pr-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" /> Orden
              </label>
              <input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={e => set('sort_order', e.target.value)}
                className="w-full h-10 rounded-xl border bg-background px-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Disponible */}
          <div className="flex items-center justify-between rounded-xl border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Disponible en carta</p>
              <p className="text-xs text-muted-foreground">El plato aparece en el menú y en las sugerencias de IA</p>
            </div>
            <button
              type="button"
              onClick={() => set('available', !form.available)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent
                          transition-colors focus:outline-none
                          ${form.available ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
                            transform transition-transform
                            ${form.available ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Error */}
          {(error || createMutation.error || updateMutation.error) && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error || (createMutation.error as Error)?.message || (updateMutation.error as Error)?.message}
            </p>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : null
              }
              {isEdit ? 'Guardar cambios' : 'Agregar plato'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Tarjeta de ítem
// ----------------------------------------------------------------
interface ItemCardProps {
  item: MenuItem
  onEdit: () => void
}

function ItemCard({ item, onEdit }: ItemCardProps) {
  const updateMutation = useUpdateMenuItem()
  const deleteMutation = useDeleteMenuItem()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function toggleAvailable() {
    updateMutation.mutate({ id: item.id, available: !item.available })
  }

  function handleDelete() {
    deleteMutation.mutate(item.id, {
      onSuccess: () => setConfirmDelete(false),
    })
  }

  return (
    <div className={`rounded-xl border bg-card p-4 transition-opacity ${!item.available ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{item.name}</p>
            {!item.available && (
              <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                No disponible
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <p className="text-sm font-bold text-primary mt-1.5">{formatPrice(item.price)}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle disponible */}
          <button
            onClick={toggleAvailable}
            disabled={updateMutation.isPending}
            title={item.available ? 'Ocultar del menú' : 'Mostrar en menú'}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {updateMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : item.available
                ? <Eye className="h-3.5 w-3.5" />
                : <EyeOff className="h-3.5 w-3.5" />
            }
          </button>

          {/* Editar */}
          <button
            onClick={onEdit}
            title="Editar plato"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {/* Eliminar */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Eliminar plato"
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors text-xs"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs"
              >
                {deleteMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Sección de categoría colapsable
// ----------------------------------------------------------------
interface CategorySectionProps {
  category: string
  items: MenuItem[]
  onEdit: (item: MenuItem) => void
  defaultOpen?: boolean
}

function CategorySection({ category, items, onEdit, defaultOpen = true }: CategorySectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const available = items.filter(i => i.available).length

  return (
    <div className="rounded-xl border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30
                   hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{category}</span>
          <span className="text-xs text-muted-foreground bg-background border rounded-full px-2 py-0.5">
            {available}/{items.length} disponibles
          </span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className="p-3 space-y-2 bg-background">
          {items.map(item => (
            <ItemCard key={item.id} item={item} onEdit={() => onEdit(item)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Página principal
// ----------------------------------------------------------------
export default function MenuPage() {
  const { data: items = [], isLoading, isError } = useMenuItems()
  const [showModal,  setShowModal]  = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editItem,   setEditItem]   = useState<MenuItem | null>(null)
  const [search,     setSearch]     = useState('')

  // Agrupar ítems por categoría
  const grouped = useMemo(() => {
    const filtered = items.filter(item =>
      !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? '').toLowerCase().includes(search.toLowerCase())
    )

    return filtered.reduce<Record<string, MenuItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [items, search])

  const categories  = Object.keys(grouped).sort()
  const totalItems  = items.length
  const activeItems = items.filter(i => i.available).length

  function openAdd() {
    setEditItem(null)
    setShowModal(true)
  }
  function openEdit(item: MenuItem) {
    setEditItem(item)
    setShowModal(true)
  }
  function closeModal() {
    setShowModal(false)
    setEditItem(null)
  }

  return (
    <div className="space-y-6">

      {showModal && (
        <ItemModal item={editItem} onClose={closeModal} />
      )}

      {showImport && (
        <MenuImportModal onClose={() => setShowImport(false)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Carta del restaurante</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona los platos y bebidas. La IA usa esta carta para hacer recomendaciones con precios.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar carta
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo plato
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total de platos', value: totalItems, color: 'text-foreground' },
          { label: 'Disponibles',     value: activeItems, color: 'text-green-600 dark:text-green-400' },
          { label: 'Categorías',      value: Object.keys(items.reduce<Record<string,boolean>>((a,i) => { a[i.category]=true; return a }, {})).length, color: 'text-primary' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar plato, categoría o descripción…"
          className="w-full h-10 rounded-xl border bg-background pl-9 pr-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border bg-destructive/5 p-6 text-center">
          <p className="font-medium text-destructive">Error al cargar la carta</p>
          <p className="text-sm text-muted-foreground mt-1">Intentá recargar la página.</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center space-y-3">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <div>
            <p className="font-medium">
              {search ? 'Sin resultados' : 'La carta está vacía'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? `No se encontraron platos con "${search}".`
                : 'Comenzá agregando tus primeros platos para que la IA pueda recomendarlos.'
              }
            </p>
          </div>
          {!search && (
            <Button size="sm" onClick={openAdd} className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Agregar primer plato
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat, i) => (
            <CategorySection
              key={cat}
              category={cat}
              items={grouped[cat]}
              onEdit={openEdit}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
