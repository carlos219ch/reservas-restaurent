import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const BUCKET = 'assets'
const FILE   = 'floor-plan'

export function useFloorPlanImage() {
  return useQuery({
    queryKey: ['floor-plan-image'],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.storage.from(BUCKET).list()
      if (error) return null
      const file = data?.find(f => f.name === FILE)
      if (!file) return null
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(FILE)
      // Append updated_at to bust browser cache on re-upload
      return `${urlData.publicUrl}?t=${file.updated_at ?? Date.now()}`
    },
  })
}

export function useUploadFloorPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File): Promise<void> => {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(FILE, file, { upsert: true, contentType: file.type })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-image'] })
    },
  })
}

export function useRemoveFloorPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.storage.from(BUCKET).remove([FILE])
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-plan-image'] })
    },
  })
}
