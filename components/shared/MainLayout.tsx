'use client'

import Sidebar from './Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 dark:bg-gray-900 transition-colors duration-200 overflow-x-hidden w-full max-w-full">
      <Sidebar />
      
      {/* Main content - responsive margins and padding */}
      <div className="flex-1 lg:ml-64 transition-all duration-300 overflow-x-hidden w-full">
        <main className="p-4 sm:p-6 lg:p-8 min-h-full max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}