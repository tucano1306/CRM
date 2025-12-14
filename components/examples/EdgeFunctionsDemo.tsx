/**
 * Example Component: Edge Functions Demo
 * 
 * Demonstrates the usage of Vercel Edge Functions for:
 * - Authentication checks
 * - Geolocation and regional settings
 * - Feature flags and A/B testing
 * - Analytics tracking
 * - Request preprocessing
 */

'use client'

import React, { useState } from 'react'
import { useEdgeFunctions } from '@/hooks/useEdgeFunctions'

interface DemoFormData {
  name: string
  price: string
  category: string
}

export default function EdgeFunctionsDemo() {
  const {
    auth,
    location,
    features,
    loading,
    error,
    trackEvent,
    preprocessRequest,
    hasFeature,
    getABTestVariant,
    isInRegion,
    formatPrice
  } = useEdgeFunctions('user_123', 'SELLER')

  const [formData, setFormData] = useState<DemoFormData>({
    name: '',
    price: '',
    category: 'food'
  })
  const [preprocessResult, setPreprocessResult] = useState<any>(null)

  // Handle form submission with preprocessing
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Track form submission
    await trackEvent({
      type: 'click',
      action: 'submit_form',
      category: 'demo',
      label: 'product_form'
    })

    // Preprocess the request
    const result = await preprocessRequest('/api/products', formData)
    setPreprocessResult(result)

    if (result.valid) {
      // In a real app, you would now make the actual API call
      console.log('Form data is valid:', result.transformedData)
      
      await trackEvent({
        type: 'conversion',
        action: 'form_valid',
        category: 'demo',
        value: Number.parseFloat(formData.price) || 0
      })
    } else {
      await trackEvent({
        type: 'error',
        action: 'form_invalid',
        category: 'demo',
        metadata: { errors: result.errors }
      })
    }
  }

  const handleTrackClick = async (action: string) => {
    await trackEvent({
      type: 'click',
      action,
      category: 'demo',
      page: '/edge-demo'
    })
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Edge Functions</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Vercel Edge Functions Demo
        </h1>
        <p className="text-gray-600">
          Showcasing ultra-fast edge computing capabilities
        </p>
      </div>

      {/* Authentication Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          🔐 Authentication
          <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
            ~15ms
          </span>
        </h2>
        
        {auth ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-gray-600">Status:</span>
              <span className="text-sm font-medium text-green-600">Authenticated</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">User ID:</span>
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {auth.userId}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Role:</span>
              <span className="text-sm font-medium text-blue-600">{auth.role}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Region:</span>
              <span className="text-sm text-gray-900">{auth.region}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-sm text-red-600">Not authenticated</span>
          </div>
        )}
      </div>

      {/* Geolocation Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          🌍 Geolocation & Regional Settings
          <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            ~20ms
          </span>
        </h2>
        
        {location && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Location</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{location.location.flag}</span>
                  <span>{location.location.city}, {location.location.region}</span>
                </div>
                <div className="text-gray-600">{location.location.country}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Currency & Language</h3>
              <div className="space-y-1 text-sm">
                <div>Currency: {location.currency.symbol} {location.currency.code}</div>
                <div>Language: {location.language.name} ({location.language.code})</div>
                <div>Market: {location.market.name}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Payment Methods</h3>
              <div className="flex flex-wrap gap-1">
                {location.features.paymentMethods.map(method => (
                  <span key={method} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {method}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Features</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${location.features.shippingAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>Shipping Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${location.features.taxRequired ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                  <span>Tax {location.features.taxRequired ? 'Required' : 'Not Required'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${location.features.gdprRequired ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                  <span>GDPR {location.features.gdprRequired ? 'Required' : 'Not Required'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Flags & A/B Testing Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          🚩 Feature Flags & A/B Testing
          <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
            ~25ms
          </span>
        </h2>
        
        {features && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Active Feature Flags</h3>
              <div className="space-y-2">
                {Object.entries(features.assignments.featureFlags).map(([flag, enabled]) => (
                  <div key={flag} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{flag}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Feature Checks</h4>
                <div className="space-y-1 text-sm">
                  <div>New Dashboard: {hasFeature('new-dashboard') ? '✅' : '❌'}</div>
                  <div>Dark Mode: {hasFeature('dark-mode') ? '✅' : '❌'}</div>
                  <div>Recurring Orders: {hasFeature('recurring-orders') ? '✅' : '❌'}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">A/B Test Assignments</h3>
              <div className="space-y-2">
                {Object.entries(features.assignments.abTests).map(([test, variant]) => (
                  <div key={test} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{test}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {variant}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Variant Checks</h4>
                <div className="space-y-1 text-sm">
                  <div>Checkout Flow: {getABTestVariant('checkout-flow')}</div>
                  <div>Pricing Display: {getABTestVariant('pricing-display')}</div>
                  <div>Onboarding: {getABTestVariant('onboarding-flow')}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Request Preprocessing Demo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          ⚡ Request Preprocessing
          <span className="ml-2 text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
            ~12ms
          </span>
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="edge-demo-product-name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                id="edge-demo-product-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter product name"
              />
            </div>
            
            <div>
              <label htmlFor="edge-demo-product-price" className="block text-sm font-medium text-gray-700 mb-1">
                Price {location && `(${location.currency.code})`}
              </label>
              <input
                id="edge-demo-product-price"
                type="text"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {formData.price && location && (
                <p className="text-xs text-gray-500 mt-1">
                  Display: {formatPrice(Number.parseFloat(formData.price) || 0)}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="edge-demo-product-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="edge-demo-product-category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="food">Food</option>
                <option value="beverage">Beverage</option>
                <option value="dessert">Dessert</option>
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Validate & Process
          </button>
        </form>
        
        {preprocessResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Preprocessing Result</h3>
            
            {preprocessResult.valid ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm text-green-600">Valid</span>
                </div>
                
                {preprocessResult.transformedData && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Transformed Data:</h4>
                    <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                      {JSON.stringify(preprocessResult.transformedData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-sm text-red-600">Invalid</span>
                </div>
                
                {preprocessResult.errors && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Errors:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {preprocessResult.errors.map((error: string, index: number) => (
                        <li key={`error-${index}`} className="text-sm text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-500">
              Processing time: {preprocessResult.metadata?.processingTime || 'N/A'}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Tracking Demo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          📊 Analytics Tracking
          <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
            ~35ms
          </span>
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleTrackClick('demo_button_1')}
            className="bg-blue-100 text-blue-800 px-4 py-2 rounded-md hover:bg-blue-200 transition-colors"
          >
            Track Click
          </button>
          
          <button
            onClick={() => trackEvent({ type: 'custom', action: 'demo_interaction', category: 'engagement' })}
            className="bg-green-100 text-green-800 px-4 py-2 rounded-md hover:bg-green-200 transition-colors"
          >
            Custom Event
          </button>
          
          <button
            onClick={() => trackEvent({ type: 'conversion', action: 'demo_conversion', value: 25.99 })}
            className="bg-purple-100 text-purple-800 px-4 py-2 rounded-md hover:bg-purple-200 transition-colors"
          >
            Track Conversion
          </button>
          
          <button
            onClick={() => trackEvent({ type: 'error', action: 'demo_error', metadata: { component: 'demo' } })}
            className="bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200 transition-colors"
          >
            Track Error
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Click the buttons above to send analytics events to the edge function.</p>
          <p>Events are tracked with session ID, user ID, and metadata for comprehensive analytics.</p>
        </div>
      </div>

      {/* Regional Features Demo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🌎 Regional Features
        </h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Price Formatting</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>USD: {formatPrice(19.99)}</div>
              <div>Sample: {formatPrice(99.99)}</div>
              <div>Small: {formatPrice(5.5)}</div>
              <div>Large: {formatPrice(150)}</div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Regional Checks</h3>
            <div className="space-y-2 text-sm">
              <div>In North America: {isInRegion(['US', 'CA', 'MX']) ? '✅' : '❌'}</div>
              <div>In Europe: {isInRegion(['GB', 'DE', 'FR', 'ES', 'IT']) ? '✅' : '❌'}</div>
              <div>In GDPR Region: {location?.features.gdprRequired ? '✅' : '❌'}</div>
            </div>
          </div>
          
          {hasFeature('new-dashboard') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">🎉 New Dashboard Available!</h3>
              <p className="text-sm text-blue-700">
                You have access to the new dashboard design based on your feature flag assignment.
              </p>
            </div>
          )}
          
          {getABTestVariant('checkout-flow') === 'streamlined' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">⚡ Streamlined Checkout</h3>
              <p className="text-sm text-green-700">
                You&apos;re in the streamlined checkout A/B test group with 2-step checkout process.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}