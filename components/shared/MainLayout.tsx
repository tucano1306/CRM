'use client'

import Sidebar from './Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Sidebar />
      
      {/* Main content - responsive margins and padding */}
      <div className="flex-1 lg:ml-64 transition-all duration-300">
        <main className="p-4 sm:p-6 lg:p-8 min-h-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}