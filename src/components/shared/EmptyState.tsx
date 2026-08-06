import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">{description}</p>
      )}
    </div>
  )
}
