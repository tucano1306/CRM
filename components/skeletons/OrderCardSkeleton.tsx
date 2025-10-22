import { Skeleton } from '@/components/ui/skeleton'

export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  )
}
