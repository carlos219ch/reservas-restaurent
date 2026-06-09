import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const BUCKET = 'assets'

function filePath(restaurantId: string) {
  return `floor-plans/${restaurantId}`
}

export function useFloorPlanImage(restaurantId: string | null | undefined) {
  return useQuery({
    queryKey: ['floor-plan-image', restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<string | null> => {
      const path = filePath(restaurantId!)
      const { data, error } = await supabase.storage.from(BUCKET).list('floor-plans')
      if (error) return null
      const file = data?.find(f => f.name === restaurantId!)
      if (!file) return null
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      return `${urlData.publicUrl}?t=${file.updated_at ?? Date.now()}`
    },
  })
}

export function useUploadFloorPlan(restaurantId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File): Promise<void> => {
      if (!restaurantId) throw new Error('Sin restaurante')
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filePath(restaurantId), file, { upsert: true, contentType: file.type })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-image', restaurantId] })
    },
  })
}

export function useRemoveFloorPlan(restaurantId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!restaurantId) throw new Error('Sin restaurante')
      const { error } = await supabase.storage.from(BUCKET).remove([filePath(restaurantId)])
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-image', restaurantId] })
    },
  })
}
