import { ReactNode } from 'react'

interface PageHeaderProps {
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 gap-4">
        <div className="space-y-2 max-w-full sm:max-w-2xl min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent tracking-tight leading-tight break-words">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-base lg:text-lg text-gray-700 font-medium">{description}</p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0 w-full sm:w-auto">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}