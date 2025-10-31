'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import { formatPrice, formatNumber } from '@/lib/utils'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  ArrowRight,
  DollarSign,
  Loader2,
  Clock,
  AlertCircle,
  Bookmark,
  Tag,
  Info,
  X,
  Calendar,
  Truck,
  Store,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

type ToastMessage = {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

type CartItem = {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    description: string | null
    price: number
    stock: number
    unit: string
    imageUrl: string | null
    sku: string | null
  }
}

type Cart = {
  id: string
  items: CartItem[]
}

function CartPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [savedForLater, setSavedForLater] = useState<string[]>([])
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null)
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([])
  const [popularProducts, setPopularProducts] = useState<any[]>([])
  const [availableCredits, setAvailableCredits] = useState<any[]>([])
  const [selectedCredits, setSelectedCredits] = useState<string[]>([])
  const [creditAmounts, setCreditAmounts] = useState<Record<string, number>>({}) // Monto a usar de cada crédito
  const [showCreditsSection, setShowCreditsSection] = useState(false)
  const [loadingCredits, setLoadingCredits] = useState(true)
  
  // Nuevos estados para el flujo de verificación
  const [orderStep, setOrderStep] = useState<1 | 2 | 3>(1) // 1: Pedido, 2: Orden Verificada, 3: Listo para envío
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState(false)
  const [showSaveCartModal, setShowSaveCartModal] = useState(false)
  const [savingCart, setSavingCart] = useState(false)

  const TAX_RATE = 0.10 // 10% de impuestos
  const DELIVERY_FEE = 5.00 // Costo de envío

  // Mostrar toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  useEffect(() => {
    fetchCart()
    loadSuggestedProducts()
    loadPopularProducts()
    loadAvailableCredits()
  }, [])

  // Detectar crédito en URL y aplicarlo automáticamente
  useEffect(() => {
    const creditIdFromUrl = searchParams?.get('useCredit')
    
    if (creditIdFromUrl && availableCredits.length > 0) {
      console.log('💳 [AUTO-APPLY] Crédito detectado en URL:', creditIdFromUrl)
      
      // Buscar el crédito en los disponibles
      const credit = availableCredits.find(c => c.id === creditIdFromUrl)
      
      if (credit && !selectedCredits.includes(creditIdFromUrl)) {
        console.log('💳 [AUTO-APPLY] Aplicando crédito automáticamente')
        const maxBalance = Number(credit.balance)
        
        setSelectedCredits([creditIdFromUrl])
        setCreditAmounts({ [creditIdFromUrl]: maxBalance }) // Usar el balance completo por defecto
        setShowCreditsSection(true) // Expandir sección para que vea el crédito aplicado
        
        showToast(`✓ Crédito de ${formatPrice(maxBalance)} aplicado automáticamente`, 'success')
        
        // Limpiar URL (opcional - remueve el parámetro después de aplicarlo)
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [searchParams, availableCredits])

  // Cargar productos sugeridos
  const loadSuggestedProducts = async () => {
    const products = await getSuggestedProducts()
    setSuggestedProducts(products)
  }

  // Cargar productos populares
  const loadPopularProducts = async () => {
    const products = await getPopularProducts()
    setPopularProducts(products)
  }

  // Cargar créditos disponibles del comprador
  const loadAvailableCredits = async () => {
    try {
      setLoadingCredits(true)
      console.log('💳 [CREDITS] Iniciando carga de créditos...')
      
      const result = await apiCall('/api/credit-notes?role=client', {
        method: 'GET',
      })
      
      console.log('💳 [CREDITS] Respuesta completa:', result)
      console.log('💳 [CREDITS] result.success:', result.success)
      console.log('💳 [CREDITS] result.data:', result.data)
      console.log('💳 [CREDITS] result.data keys:', result.data ? Object.keys(result.data) : 'null')
      console.log('💳 [CREDITS] result.data.data:', result.data?.data)
      
      if (result.success && result.data) {
        console.log('💳 [CREDITS] Tipo de result.data:', typeof result.data, 'Es array:', Array.isArray(result.data))
        
        // El problema: apiCall puede devolver { data: { data: [...] } }
        // Intentar primero result.data.data, luego result.data
        let creditsArray = []
        
        if (Array.isArray(result.data.data)) {
          console.log('💳 [CREDITS] Usando result.data.data (array anidado)')
          creditsArray = result.data.data
        } else if (Array.isArray(result.data)) {
          console.log('💳 [CREDITS] Usando result.data (array directo)')
          creditsArray = result.data
        } else {
          console.log('💳 [CREDITS] No se encontró array en ninguna ubicación')
          creditsArray = []
        }
        
        console.log('💳 [CREDITS] Credits array length:', creditsArray.length)
        
        // Filtrar solo créditos activos con balance (aunque el endpoint ya lo hace)
        const activeCredits = creditsArray.filter((credit: any) => {
          const isActive = credit.isActive && credit.balance > 0
          const notExpired = !credit.expiresAt || new Date(credit.expiresAt) > new Date()
          console.log(`   - ${credit.creditNoteNumber}: activo=${isActive}, no expirado=${notExpired}`)
          return isActive && notExpired
        })
        
        console.log('💳 [CREDITS] Créditos filtrados:', activeCredits.length)
        
        setAvailableCredits(activeCredits)
        
        if (activeCredits.length > 0) {
          console.log('✅ [CREDITS] Créditos cargados exitosamente:', activeCredits.map((c: any) => c.creditNoteNumber))
        } else {
          console.log('⚠️ [CREDITS] No hay créditos disponibles después del filtrado')
        }
      } else {
        console.log('❌ [CREDITS] No se obtuvieron créditos. Success:', result.success)
        setAvailableCredits([])
      }
    } catch (error) {
      console.error('❌ [CREDITS] Error loading credits:', error)
      console.error('❌ [CREDITS] Error stack:', error instanceof Error ? error.stack : 'No stack')
      setAvailableCredits([])
    } finally {
      setLoadingCredits(false)
    }
  }

  // Calcular total de créditos seleccionados
  const calculateCreditsApplied = () => {
    if (selectedCredits.length === 0) return 0
    
    // Sumar los montos específicos ingresados para cada crédito seleccionado
    return selectedCredits.reduce((sum, creditId) => {
      const amount = creditAmounts[creditId] || 0
      return sum + amount
    }, 0)
  }

  // Toggle selección de crédito
  const toggleCreditSelection = (creditId: string, maxBalance: number) => {
    if (selectedCredits.includes(creditId)) {
      // Deseleccionar
      setSelectedCredits(prev => prev.filter(id => id !== creditId))
      setCreditAmounts(prev => {
        const newAmounts = { ...prev }
        delete newAmounts[creditId]
        return newAmounts
      })
    } else {
      // Seleccionar y establecer monto inicial limitado a lo que realmente se necesita
      setSelectedCredits(prev => [...prev, creditId])
      
      // Calcular cuánto realmente necesita el usuario
      const currentTotal = calculateTotal() // Esto ya incluye los créditos actuales aplicados
      const alreadyApplied = calculateCreditsApplied()
      const remainingToPay = currentTotal + alreadyApplied // Total antes de aplicar este nuevo crédito
      
      // Usar el menor entre el balance del crédito y lo que falta por pagar
      const smartAmount = Math.min(maxBalance, Math.max(0, remainingToPay))
      
      setCreditAmounts(prev => ({
        ...prev,
        [creditId]: smartAmount
      }))
    }
  }

  // Actualizar monto de crédito a usar
  const updateCreditAmount = (creditId: string, amount: number, maxBalance: number) => {
    // Calcular cuánto realmente necesita el usuario
    const subtotal = calculateSubtotal()
    const discount = calculateDiscount()
    const tax = calculateTax()
    const delivery = calculateDeliveryFee()
    const alreadyApplied = calculateCreditsApplied() - (creditAmounts[creditId] || 0) // Excluir el crédito actual
    const totalBeforeThisCredit = subtotal - discount + tax + delivery - alreadyApplied
    const remainingToPay = Math.max(0, totalBeforeThisCredit)
    
    // Limitar al menor entre: el monto ingresado, el balance máximo, y lo que realmente falta pagar
    const smartLimit = Math.min(Math.max(0, amount), maxBalance, remainingToPay)
    
    setCreditAmounts(prev => ({
      ...prev,
      [creditId]: smartLimit
    }))
  }

  // ✅ fetchCart CON TIMEOUT
  const fetchCart = async () => {
    try {
      setLoading(true)
      setTimedOut(false)
      setError(null)

      const result = await apiCall('/api/buyer/cart', {
        timeout: 5000,
        onTimeout: () => setTimedOut(true)
      })

      setLoading(false)

      if (result.success) {
        setCart(result.data.cart)
      } else {
        setError(result.error || 'Error cargando carrito')
      }
    } catch (err) {
      setLoading(false)
      setError(getErrorMessage(err))
    }
  }

  // ✅ updateQuantity CON TIMEOUT
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    try {
      setUpdating(itemId)

      const result = await apiCall(`/api/buyer/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
        timeout: 5000,
      })

      if (result.success) {
        showToast('✓ Cantidad actualizada', 'success')
        await fetchCart()
      } else {
        showToast(result.error || 'Error actualizando cantidad', 'error')
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setUpdating(null)
    }
  }

  // Abrir modal de confirmación de eliminación
  const confirmRemoveItem = (itemId: string, productName: string) => {
    setItemToDelete({ id: itemId, name: productName })
    setShowDeleteModal(true)
  }

  // ✅ removeItem CON TIMEOUT
  const removeItem = async () => {
    if (!itemToDelete) return

    try {
      setUpdating(itemToDelete.id)
      setShowDeleteModal(false)

      const result = await apiCall(`/api/buyer/cart/items/${itemToDelete.id}`, {
        method: 'DELETE',
        timeout: 5000,
      })

      if (result.success) {
        showToast('Producto eliminado del carrito', 'info')
        await fetchCart()
      } else {
        showToast(result.error || 'Error eliminando item', 'error')
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setUpdating(null)
      setItemToDelete(null)
    }
  }

  // Guardar para después
  const saveForLater = (itemId: string) => {
    setSavedForLater(prev => {
      if (prev.includes(itemId)) {
        showToast('Producto quitado de guardados', 'info')
        return prev.filter(id => id !== itemId)
      } else {
        showToast('Producto guardado para después', 'success')
        return [...prev, itemId]
      }
    })
  }

  // Aplicar cupón
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      showToast('Por favor ingresa un cupón', 'error')
      return
    }

    try {
      const result = await apiCall('/api/buyer/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.toUpperCase(),
          cartTotal: calculateSubtotal()
        }),
      })

      if (result.success && result.data) {
        setAppliedCoupon({
          code: result.data.code,
          discount: result.data.discountAmount
        })
        showToast(`¡Cupón aplicado! Descuento: ${formatPrice(result.data.discountAmount)}`, 'success')
        setCouponCode('')
      }
    } catch (error: any) {
      showToast(error.message || 'Cupón inválido o expirado', 'error')
      setAppliedCoupon(null)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    showToast('Cupón eliminado', 'info')
  }

  const calculateSubtotal = () => {
    if (!cart) return 0
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0
    // El descuento ya viene calculado del backend
    return appliedCoupon.discount
  }

  const calculateTax = () => {
    const subtotalAfterDiscount = calculateSubtotal() - calculateDiscount()
    return subtotalAfterDiscount * TAX_RATE
  }

  const calculateDeliveryFee = () => {
    return deliveryMethod === 'delivery' ? DELIVERY_FEE : 0
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discount = calculateDiscount()
    const tax = calculateTax()
    const delivery = calculateDeliveryFee()
    const credits = calculateCreditsApplied()
    
    const total = subtotal - discount + tax + delivery - credits
    
    // El total nunca puede ser negativo
    return Math.max(0, total)
  }

  const getEstimatedDeliveryDate = () => {
    const today = new Date()
    if (deliveryMethod === 'pickup') {
      return 'Hoy'
    } else {
      const startDate = new Date(today)
      startDate.setDate(today.getDate() + 2)
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 3)
      return `${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleDateString('es', { month: 'short' })}`
    }
  }

  const getSuggestedProducts = async () => {
    try {
      const result = await apiCall('/api/products/suggested', {
        method: 'GET',
      })
      
      console.log('Suggested products result:', result)
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log('Suggested products count:', result.data.length)
        return result.data.slice(0, 3) // Limitar a 3
      }
    } catch (error) {
      console.error('Error loading suggested products:', error)
    }
    
    return []
  }

  const getPopularProducts = async () => {
    try {
      const result = await apiCall('/api/products/popular', {
        method: 'GET',
      })
      
      console.log('Popular products result:', result)
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log('Popular products count:', result.data.length)
        return result.data.slice(0, 4) // Limitar a 4
      }
    } catch (error) {
      console.error('Error loading popular products:', error)
    }
    
    return []
  }

  const saveCartForLater = async () => {
    if (!cart || cart.items.length === 0) {
      showToast('El carrito está vacío', 'error')
      return
    }

    setShowSaveCartModal(true)
  }

  // Confirmar guardar carrito y redirigir al catálogo
  const confirmSaveCart = async () => {
    setSavingCart(true)
    
    try {
      // Guardar en localStorage
      const savedCart = {
        items: cart?.items || [],
        savedAt: new Date().toISOString(),
        notes: orderNotes,
        deliveryMethod: deliveryMethod,
        appliedCoupon: appliedCoupon,
        selectedCredits: selectedCredits,
        creditAmounts: creditAmounts
      }
      
      localStorage.setItem('saved-cart', JSON.stringify(savedCart))
      
      setSavingCart(false)
      setShowSaveCartModal(false)
      showToast('✅ Carrito guardado exitosamente', 'success')
      
      // Redirigir al catálogo después de 1 segundo
      setTimeout(() => {
        router.push('/buyer/catalog')
      }, 1000)
    } catch (error) {
      setSavingCart(false)
      showToast('Error al guardar el carrito', 'error')
      console.error('Error saving cart:', error)
    }
  }

  // Cargar carrito guardado si existe
  useEffect(() => {
    const savedCartData = localStorage.getItem('saved-cart')
    if (savedCartData) {
      try {
        const parsed = JSON.parse(savedCartData)
        const savedAt = new Date(parsed.savedAt)
        const hoursSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60)
        
        // Mostrar notificación si hay un carrito guardado hace menos de 7 días
        if (hoursSince < 168) { // 7 días
          showToast(`💾 Tienes un carrito guardado (${Math.floor(hoursSince)}h)`, 'info')
        }
      } catch (e) {
        console.error('Error parsing saved cart:', e)
      }
    }
  }, [])

  // Restaurar carrito guardado
  const restoreSavedCart = async () => {
    const savedCartData = localStorage.getItem('saved-cart')
    if (!savedCartData) {
      showToast('No hay carrito guardado', 'error')
      return
    }

    try {
      const parsed = JSON.parse(savedCartData)
      
      // Restaurar notas y configuraciones
      setOrderNotes(parsed.notes || '')
      setDeliveryMethod(parsed.deliveryMethod || 'delivery')
      setAppliedCoupon(parsed.appliedCoupon || null)
      setSelectedCredits(parsed.selectedCredits || [])
      setCreditAmounts(parsed.creditAmounts || {})
      
      // Agregar productos al carrito actual
      for (const item of parsed.items) {
        await apiCall('/api/buyer/cart/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.product.id,
            quantity: item.quantity
          }),
        })
      }
      
      // Recargar carrito
      await fetchCart()
      
      // Limpiar carrito guardado
      localStorage.removeItem('saved-cart')
      
      showToast('✅ Carrito restaurado exitosamente', 'success')
    } catch (error) {
      showToast('Error al restaurar el carrito', 'error')
      console.error('Error restoring cart:', error)
    }
  }

  // Verificar si hay carrito guardado
  const hasSavedCart = () => {
    const savedCartData = localStorage.getItem('saved-cart')
    if (!savedCartData) return false
    
    try {
      const parsed = JSON.parse(savedCartData)
      const savedAt = new Date(parsed.savedAt)
      const hoursSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60)
      return hoursSince < 168 // Menos de 7 días
    } catch (e) {
      return false
    }
  }

  // Agregar producto al carrito
  const addToCart = async (productId: string, quantity: number = 1) => {
    try {
      console.log('Adding to cart:', { productId, quantity })
      
      const result = await apiCall('/api/buyer/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })

      console.log('Add to cart result:', result)

      if (result.success) {
        showToast('✅ Producto agregado al carrito', 'success')
        await fetchCart() // Recargar el carrito
      } else {
        showToast(result.error || '❌ Error al agregar producto', 'error')
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Error al agregar producto'
      showToast(`❌ ${errorMsg}`, 'error')
      console.error('Error adding to cart:', error)
    }
  }

  // ✅ clearCart CON TIMEOUT
  const clearCart = async () => {
    if (!confirm('¿Vaciar todo el carrito?')) return

    try {
      const result = await apiCall('/api/buyer/cart', {
        method: 'DELETE',
        timeout: 5000,
      })

      if (result.success) {
        await fetchCart()
      } else {
        alert(result.error || 'Error vaciando carrito')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  // Función para mostrar modal de verificación
  const handleConfirmOrder = () => {
    if (!cart || cart.items.length === 0) {
      alert('El carrito está vacío')
      return
    }
    
    setShowVerificationModal(true)
    setOrderStep(2) // Cambiar a "Orden Verificada"
  }

  // Función para modificar orden (volver al carrito)
  const handleModifyOrder = () => {
    setShowVerificationModal(false)
    setOrderStep(1)
    showToast('Puedes seguir agregando o modificando productos', 'info')
  }

  // Función para cancelar orden
  const handleCancelOrder = () => {
    setShowVerificationModal(false)
    setShowCancelModal(true)
  }

  // Confirmar cancelación y redirigir al catálogo
  const confirmCancelOrder = async () => {
    setCancellingOrder(true)
    
    // Vaciar el carrito
    try {
      await apiCall('/api/buyer/cart/clear', {
        method: 'DELETE',
        timeout: 5000
      })
      
      setCancellingOrder(false)
      setShowCancelModal(false)
      showToast('Pedido cancelado', 'info')
      
      // Redirigir al catálogo después de 1 segundo
      setTimeout(() => {
        router.push('/buyer/catalog')
      }, 1000)
    } catch (err) {
      setCancellingOrder(false)
      alert('Error al cancelar el pedido')
    }
  }

  // Función para marcar como revisado y pasar a envío
  const handleMarkAsReviewed = () => {
    setShowVerificationModal(false)
    setOrderStep(3) // Cambiar a paso 3 (listo para envío)
    showToast('¡Orden verificada! Ahora puedes enviar tu pedido', 'success')
  }

  // ✅ createOrder - Ahora se ejecuta en el paso 3
  const createOrder = async () => {
    if (!cart || cart.items.length === 0) {
      alert('El carrito está vacío')
      return
    }

    try {
      setCreatingOrder(true)
      
      const result = await apiCall('/api/buyer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: orderNotes || null,
          deliveryMethod: deliveryMethod,
          couponCode: appliedCoupon?.code || null,
          creditNotes: selectedCredits.length > 0 
            ? selectedCredits.map(creditId => ({
                creditNoteId: creditId,
                amountToUse: creditAmounts[creditId] || 0
              }))
            : null,
          idempotencyKey: uuidv4()
        }),
        timeout: 8000, // ✅ 8 segundos para crear orden (operación compleja)
        retries: 2, // ✅ 2 reintentos
        retryDelay: 1500,
        onRetry: (attempt) => {
          console.log(`Reintentando crear orden... (${attempt} reintentos restantes)`)
        }
      })

      if (result.success) {
        alert('✅ ¡Pedido enviado exitosamente!')
        router.push('/buyer/orders')
      } else {
        alert(result.error || 'Error creando el pedido')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setCreatingOrder(false)
    }
  }

  // Los cálculos ahora se hacen en las funciones calculate*()
  // para incluir descuentos de cupones

  // ✅ ESTADO DE LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <ShoppingCart className="text-blue-600" size={32} />
              Mi Carrito
            </h1>
            <p className="text-gray-600 mt-1">Cargando productos...</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <Skeleton className="h-8 w-32 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
                <Skeleton className="h-12 w-full mt-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ✅ ESTADO DE TIMEOUT
  if (timedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 border-2 border-amber-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-amber-500 to-yellow-600 p-2 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-amber-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-6 font-medium">
            La carga del carrito está tardando más de lo esperado. 
            Esto puede ser temporal.
          </p>
          <button
            onClick={fetchCart}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold shadow-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ✅ ESTADO DE ERROR
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 border-2 border-red-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-2 rounded-lg">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-6 font-medium">{error}</p>
          <button
            onClick={fetchCart}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold shadow-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Stepper de progreso - NUEVO */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 mb-6 border-2 border-purple-200">
          <div className="flex items-center justify-between">
            {/* Etapa 1: Pedido */}
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 ${orderStep >= 1 ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gray-200'} text-white rounded-full flex items-center justify-center font-bold shadow-md transition-all`}>
                {orderStep >= 1 ? '✓' : '1'}
              </div>
              <span className={`text-sm font-semibold ${orderStep >= 1 ? 'text-purple-600' : 'text-gray-500'}`}>
                Pedido
              </span>
            </div>
            
            <div className={`flex-1 h-1 mx-4 rounded transition-all ${orderStep >= 2 ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gray-200'}`}></div>
            
            {/* Etapa 2: Orden Verificada */}
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 ${orderStep >= 2 ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gray-200'} ${orderStep >= 2 ? 'text-white' : 'text-gray-500'} rounded-full flex items-center justify-center font-bold shadow-md transition-all`}>
                {orderStep >= 2 ? '✓' : '2'}
              </div>
              <span className={`text-sm font-semibold ${orderStep >= 2 ? 'text-purple-600' : 'text-gray-500'}`}>
                Orden Verificada
              </span>
            </div>
            
            <div className={`flex-1 h-1 mx-4 rounded transition-all ${orderStep >= 3 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gray-200'}`}></div>
            
            {/* Etapa 3: Listo para Envío */}
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 ${orderStep >= 3 ? 'bg-gradient-to-r from-emerald-600 to-green-600' : 'bg-gray-200'} ${orderStep >= 3 ? 'text-white' : 'text-gray-500'} rounded-full flex items-center justify-center font-bold shadow-md transition-all`}>
                {orderStep >= 3 ? '✓' : '3'}
              </div>
              <span className={`text-sm font-semibold ${orderStep >= 3 ? 'text-emerald-600' : 'text-gray-500'}`}>
                Listo para Envío
              </span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 mb-6 border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                <ShoppingCart className="text-purple-600" size={32} />
                Mi Carrito
              </h1>
              <p className="text-gray-600 mt-1 font-medium">
                {cart?.items.length || 0}{' '}
                {cart?.items.length === 1 ? 'producto' : 'productos'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasSavedCart() && (
                <button
                  onClick={restoreSavedCart}
                  className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-purple-50 transition-all border-2 border-purple-200 shadow-sm"
                >
                  <Bookmark size={18} />
                  Restaurar guardado
                </button>
              )}
              {cart && cart.items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition-all border-2 border-red-200 shadow-sm"
                >
                  <Trash2 size={18} />
                  Vaciar carrito
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Carrito vacío */}
        {(!cart || cart.items.length === 0) && (
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-12 text-center border-2 border-purple-200">
            <ShoppingCart className="mx-auto text-purple-200 mb-4" size={96} strokeWidth={1.5} />
            <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              Tu carrito está vacío
            </h3>
            <p className="text-gray-600 mb-8 text-lg font-medium">
              ¡Agrega productos desde el catálogo!
            </p>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold inline-flex items-center gap-2 shadow-md"
            >
              <Package size={20} />
              Ir al Catálogo
            </button>

            {/* Productos más vendidos */}
            {popularProducts.length > 0 && (
              <div className="mt-12">
                <h4 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6 flex items-center justify-center gap-2">
                  🔥 Los más vendidos
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {popularProducts.map(product => (
                    <div key={product.id} className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border-2 border-purple-200 hover:shadow-lg hover:border-purple-400 transition-all cursor-pointer group">
                      <div className="aspect-square bg-white rounded-lg flex items-center justify-center mb-3 shadow-sm">
                        <Package className="w-12 h-12 text-purple-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                      <p className="font-semibold text-gray-800 text-sm line-clamp-2 mb-2">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-purple-600 font-bold text-base">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                      <button 
                        onClick={() => addToCart(product.id)}
                        className="w-full mt-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
                      >
                        + Agregar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items del carrito */}
        {cart && cart.items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda: Items (2/3) */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-lg border-2 border-purple-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
                    updating === item.id ? 'opacity-75 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6">
                    {/* IMAGEN DEL PRODUCTO */}
                    <div className="flex-shrink-0 mx-auto sm:mx-0 relative w-24 h-24">
                      <Image 
                        src={item.product.imageUrl || '/placeholder-food.jpg'}
                        alt={item.product.name}
                        fill
                        className="object-cover rounded-lg shadow-md"
                        sizes="96px"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br', 'from-purple-100', 'to-indigo-100')
                            const packageIcon = document.createElement('div')
                            packageIcon.innerHTML = '<svg class="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>'
                            parent.appendChild(packageIcon.firstChild!)
                          }
                        }}
                      />
                    </div>

                    {/* INFORMACIÓN DEL PRODUCTO */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {item.product.name}
                          </h3>
                          {item.product.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2 font-medium">
                              {item.product.description}
                            </p>
                          )}
                          {item.product.sku && (
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                              SKU: {item.product.sku}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* PRECIO Y STOCK */}
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-purple-600 font-bold text-base">
                          {formatPrice(item.price)}
                        </span>
                        <span className="text-gray-600 text-sm font-medium">
                          / {item.product.unit}
                        </span>
                        {item.product.stock < 10 && (
                          <span className="text-amber-600 text-sm font-semibold flex items-center gap-1">
                            <Info className="w-4 h-4" />
                            Solo {item.product.stock} disponibles
                          </span>
                        )}
                      </div>

                      {/* CONTROLES Y ACCIONES */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          {/* Controles de cantidad */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-purple-50 border-2 border-purple-200 rounded-lg p-1">
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                disabled={updating === item.id || item.quantity <= 1}
                                className="bg-white rounded p-2 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-purple-600 font-bold"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="w-12 text-center font-bold text-purple-600">
                                {updating === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                ) : (
                                  item.quantity
                                )}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                disabled={
                                  updating === item.id ||
                                  item.quantity >= item.product.stock
                                }
                                className="bg-white rounded p-2 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-purple-600 font-bold"
                              >
                                <Plus size={16} />
                              </button>
                            </div>

                            {/* QUICK ADD BUTTONS */}
                            <div className="flex gap-1 ml-2">
                              <button 
                                onClick={() => updateQuantity(item.id, 10)}
                                disabled={updating === item.id || item.product.stock < 10}
                                className="text-xs px-2 py-1 bg-white border-2 border-purple-200 text-purple-600 rounded hover:bg-purple-50 hover:border-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                              >
                                10
                              </button>
                              <button 
                                onClick={() => updateQuantity(item.id, 25)}
                                disabled={updating === item.id || item.product.stock < 25}
                                className="text-xs px-2 py-1 bg-white border-2 border-purple-200 text-purple-600 rounded hover:bg-purple-50 hover:border-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                              >
                                25
                              </button>
                              <button 
                                onClick={() => updateQuantity(item.id, 50)}
                                disabled={updating === item.id || item.product.stock < 50}
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              >
                                50
                              </button>
                            </div>
                          </div>

                          {/* Subtotal del item */}
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Subtotal</p>
                            <p className="text-lg font-bold text-gray-800 transition-all duration-300">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>

                        {/* DESCUENTO POR VOLUMEN */}
                        {item.quantity >= 10 && (
                          <div className="bg-green-50 border border-green-200 p-2 rounded-lg mt-3 animate-fade-in-up">
                            <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                              🎉 ¡10% de descuento por compra al mayor! Ahorraste {formatPrice(item.price * item.quantity * 0.10)}
                            </p>
                          </div>
                        )}

                        {item.quantity < 10 && item.quantity > 5 && (
                          <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-lg mt-3 animate-fade-in-up">
                            <p className="text-xs text-yellow-700 font-medium flex items-center gap-1">
                              💡 Agrega {10 - item.quantity} más para obtener 10% de descuento
                            </p>
                          </div>
                        )}
                      </div>

                      {/* BOTONES DE ACCIÓN */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        {/* Guardar para después */}
                        <button 
                          onClick={() => saveForLater(item.id)}
                          className={`text-sm flex items-center gap-1 transition-colors ${
                            savedForLater.includes(item.id)
                              ? 'text-blue-600 font-medium'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${savedForLater.includes(item.id) ? 'fill-current' : ''}`} />
                          {savedForLater.includes(item.id) ? 'Guardado' : 'Guardar para después'}
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => confirmRemoveItem(item.id, item.product.name)}
                          disabled={updating === item.id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={16} />
                          <span className="text-sm">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* PRODUCTOS SUGERIDOS */}
              {suggestedProducts.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 rounded-xl mt-6 border border-blue-100">
                  <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                    💡 Productos que podrían interesarte
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {suggestedProducts.map(product => (
                      <div key={product.id} className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-gradient-to-br from-blue-100 to-slate-100 rounded flex items-center justify-center mb-2">
                          <Package className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{product.name}</p>
                        <p className="text-blue-600 font-bold mt-1 text-xs">{formatPrice(product.price)}</p>
                        <button 
                          onClick={() => addToCart(product.id)}
                          className="w-full bg-blue-100 text-blue-600 py-1.5 rounded mt-2 text-sm hover:bg-blue-200 transition-colors font-medium"
                        >
                          + Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Columna derecha: Resumen (1/3) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-blue-100 sticky top-4">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <DollarSign size={24} className="text-blue-600" />
                    Resumen del pedido
                  </h2>
                </div>

                {/* Notas del pedido */}
                <div className="p-6 border-b border-gray-100">
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    📝 Notas especiales (opcional)
                  </label>
                  <textarea 
                    placeholder="Ej: Sin cebolla, bien cocido, empaque especial..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Método de entrega/retiro */}
                <div className="p-6 border-b border-gray-100">
                  <h4 className="font-bold mb-3 text-gray-800 flex items-center gap-2">
                    🚚 Método de recepción
                  </h4>
                  
                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg mb-3 cursor-pointer hover:bg-blue-50 transition-colors" 
                    style={{ borderColor: deliveryMethod === 'delivery' ? '#3b82f6' : '#e5e7eb' }}>
                    <input 
                      type="radio" 
                      name="delivery" 
                      value="delivery"
                      checked={deliveryMethod === 'delivery'}
                      onChange={(e) => setDeliveryMethod(e.target.value as 'delivery' | 'pickup')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Truck className={`w-5 h-5 ${deliveryMethod === 'delivery' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${deliveryMethod === 'delivery' ? 'text-blue-600' : 'text-gray-700'}`}>
                        Entrega a domicilio
                      </p>
                      <p className="text-sm text-gray-500">2-3 días hábiles - {formatPrice(DELIVERY_FEE)}</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                    style={{ borderColor: deliveryMethod === 'pickup' ? '#3b82f6' : '#e5e7eb' }}>
                    <input 
                      type="radio" 
                      name="delivery" 
                      value="pickup"
                      checked={deliveryMethod === 'pickup'}
                      onChange={(e) => setDeliveryMethod(e.target.value as 'delivery' | 'pickup')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Store className={`w-5 h-5 ${deliveryMethod === 'pickup' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${deliveryMethod === 'pickup' ? 'text-blue-600' : 'text-gray-700'}`}>
                        Recoger en tienda
                      </p>
                      <p className="text-sm text-gray-500">Disponible hoy - Gratis</p>
                    </div>
                  </label>

                  {/* Fecha de entrega estimada */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>
                      <strong className="text-blue-600">
                        {deliveryMethod === 'pickup' ? 'Disponible:' : 'Entrega estimada:'}
                      </strong>{' '}
                      {getEstimatedDeliveryDate()}
                    </span>
                  </div>
                </div>

                {/* Cupón de descuento */}
                <div className="p-6 border-b border-gray-100">
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    ¿Tienes un cupón?
                  </label>
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Código de descuento"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button 
                        onClick={applyCoupon}
                        disabled={!couponCode.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Aplicar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">
                          {appliedCoupon.code}
                        </span>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Cupones válidos: DESCUENTO10, PRIMERACOMPRA, ENVIOGRATIS
                  </p>
                </div>

                {/* Créditos disponibles - SIEMPRE VISIBLE */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setShowCreditsSection(!showCreditsSection)}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                      💳 Créditos disponibles ({loadingCredits ? '...' : availableCredits.length})
                      {!loadingCredits && availableCredits.length > 0 && (
                        <span className="text-xs text-green-600 font-bold">
                          {formatPrice(availableCredits.reduce((sum, c) => sum + Number(c.balance), 0))}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={loadAvailableCredits}
                      className="text-xs text-blue-600 hover:text-blue-800"
                      title="Recargar créditos"
                    >
                      🔄
                    </button>
                  </div>

                  {showCreditsSection && availableCredits.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {availableCredits.map((credit) => {
                        const isSelected = selectedCredits.includes(credit.id)
                        const maxBalance = Number(credit.balance)
                        const currentAmount = creditAmounts[credit.id] || maxBalance
                        
                        // Calcular cuánto realmente se necesita para este crédito
                        const subtotal = calculateSubtotal()
                        const discount = calculateDiscount()
                        const tax = calculateTax()
                        const delivery = calculateDeliveryFee()
                        const alreadyApplied = calculateCreditsApplied() - (isSelected ? currentAmount : 0)
                        const totalBeforeThisCredit = subtotal - discount + tax + delivery - alreadyApplied
                        const remainingToPay = Math.max(0, totalBeforeThisCredit)
                        const optimalAmount = Math.min(maxBalance, remainingToPay)
                        const isOverApplying = currentAmount > optimalAmount && optimalAmount > 0
                        const isWastingCredit = currentAmount > remainingToPay
                        
                        return (
                          <div
                            key={credit.id}
                            className={`p-3 border-2 rounded-lg transition-colors ${
                              isSelected
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCreditSelection(credit.id, maxBalance)}
                                className="w-4 h-4 text-green-600 mt-1 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 text-sm">
                                  {credit.creditNoteNumber}
                                </p>
                                <p className="text-xs text-gray-500 truncate mb-2">
                                  {credit.notes}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <span>Balance disponible:</span>
                                  <span className="font-bold text-green-600">
                                    {formatPrice(maxBalance)}
                                  </span>
                                </div>
                                
                                {isSelected && (
                                  <div className="mt-3 space-y-2">
                                    <label className="text-xs font-medium text-gray-700">
                                      Monto a usar de este crédito:
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold">$</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max={maxBalance}
                                        step="0.01"
                                        value={currentAmount}
                                        onChange={(e) => updateCreditAmount(credit.id, parseFloat(e.target.value) || 0, maxBalance)}
                                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                        placeholder="0.00"
                                      />
                                      <button
                                        onClick={() => updateCreditAmount(credit.id, maxBalance, maxBalance)}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                                      >
                                        Usar todo
                                      </button>
                                    </div>
                                    {currentAmount > maxBalance && (
                                      <p className="text-xs text-red-600">
                                        ❌ No puedes usar más del balance disponible
                                      </p>
                                    )}
                                    {isWastingCredit && currentAmount <= maxBalance && (
                                      <div className="bg-amber-50 border border-amber-300 rounded-lg p-2">
                                        <p className="text-xs text-amber-800 font-medium">
                                          ⚠️ Solo necesitas {formatPrice(optimalAmount)} de tu crédito de {formatPrice(maxBalance)}
                                        </p>
                                        <p className="text-xs text-amber-700 mt-1">
                                          El sistema ha limitado automáticamente el uso a lo necesario. 
                                          Los {formatPrice(maxBalance - optimalAmount)} restantes quedarán disponibles para futuras compras.
                                        </p>
                                      </div>
                                    )}
                                    {currentAmount > 0 && currentAmount <= maxBalance && !isWastingCredit && (
                                      <div className="flex items-start gap-2">
                                        <p className="text-xs text-green-600 font-medium flex-1">
                                          ✓ Se aplicarán {formatPrice(currentAmount)} de este crédito
                                        </p>
                                        {currentAmount < maxBalance && (
                                          <p className="text-xs text-gray-500">
                                            (Quedan {formatPrice(maxBalance - currentAmount)})
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                          💡 El sistema protege tus créditos limitando automáticamente el uso al monto necesario para tu compra
                        </p>
                      </div>
                    </div>
                  )}

                  {!showCreditsSection && availableCredits.length > 0 && (
                    <p className="text-xs text-blue-600 mt-2 cursor-pointer hover:underline"
                       onClick={() => setShowCreditsSection(true)}>
                      Haz clic para ver y usar tus créditos
                    </p>
                  )}

                  {availableCredits.length === 0 && showCreditsSection && (
                    <div className="text-sm text-gray-500 mt-3 p-3 bg-gray-50 rounded-lg">
                      {loadingCredits ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cargando créditos...
                        </div>
                      ) : (
                        'No tienes créditos disponibles actualmente.'
                      )}
                    </div>
                  )}
                </div>

                {/* Desglose de precios */}
                <div className="p-6 space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-xs">
                      {formatPrice(calculateSubtotal())}
                    </span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({formatNumber(appliedCoupon.discount * 100, 0)}%):</span>
                      <span className="font-semibold text-xs">
                        -{formatPrice(calculateDiscount())}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Impuestos ({formatNumber(TAX_RATE * 100, 0)}%):</span>
                    <span className="font-semibold text-xs">{formatPrice(calculateTax())}</span>
                  </div>

                  {deliveryMethod === 'delivery' && (
                    <div className="flex justify-between text-gray-600">
                      <span className="flex items-center gap-1">
                        <Truck className="w-4 h-4" />
                        Envío:
                      </span>
                      <span className="font-semibold text-xs">{formatPrice(DELIVERY_FEE)}</span>
                    </div>
                  )}

                  {deliveryMethod === 'pickup' && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <Store className="w-4 h-4" />
                        Retiro en tienda:
                      </span>
                      <span className="font-semibold">Gratis</span>
                    </div>
                  )}

                  {selectedCredits.length > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span className="flex items-center gap-1">
                        💳 Créditos aplicados ({selectedCredits.length}):
                      </span>
                      <span className="text-xs">-{formatPrice(calculateCreditsApplied())}</span>
                    </div>
                  )}

                  {/* Indicador de ahorro */}
                  {appliedCoupon && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="text-green-700 font-medium flex items-center gap-2 text-xs">
                        <Tag className="w-4 h-4" />
                        ¡Ahorraste {formatPrice(calculateDiscount())} en este pedido!
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-3 flex justify-between font-bold text-gray-800">
                    <span>Total:</span>
                    <span className="text-blue-600 text-lg">
                      {formatPrice(calculateTotal())}
                    </span>
                  </div>
                </div>

                {/* Botón de confirmar */}
                <div className="p-6 border-t border-gray-100">
                  {/* Botón guardar carrito */}
                  <button
                    onClick={saveCartForLater}
                    className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg mb-3 hover:bg-blue-50 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <Bookmark size={20} />
                    💾 Guardar carrito para después
                  </button>

                  {/* Botón confirmar/enviar pedido - CAMBIA SEGÚN EL PASO */}
                  <button
                    onClick={orderStep === 3 ? createOrder : handleConfirmOrder}
                    disabled={creatingOrder}
                    className={`w-full ${orderStep === 3 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-4 rounded-lg transition-colors font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
                  >
                    {creatingOrder ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Procesando...
                      </>
                    ) : (
                      <>
                        {orderStep === 3 ? (
                          <>
                            <Truck size={20} />
                            Enviar pedido
                          </>
                        ) : (
                          <>
                            Continuar
                            <ArrowRight size={20} />
                          </>
                        )}
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Al confirmar, aceptas los términos y condiciones
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notificaciones Toast */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in min-w-[300px] ${
              toast.type === 'success' 
                ? 'bg-emerald-500 text-white' 
                : toast.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            {toast.type === 'success' && <Tag className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Info className="w-5 h-5" />}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  ¿Eliminar producto?
                </h3>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de eliminar <strong className="text-gray-800">"{itemToDelete.name}"</strong> del carrito?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowDeleteModal(false)
                  setItemToDelete(null)
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button 
                onClick={removeItem}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Verificación de Orden */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-scale-in border-4 border-blue-500">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                ¡Has verificado tu orden!
              </h2>
              <p className="text-gray-600 text-lg">
                Revisa los detalles de tu pedido antes de continuar
              </p>
            </div>

            {/* Resumen rápido */}
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl p-4 mb-6 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">Total de productos:</span>
                <span className="text-blue-600 font-bold">{cart?.items.length || 0} items</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Total a pagar:</span>
                <span className="text-2xl font-bold text-green-600">{formatPrice(calculateTotal())}</span>
              </div>
            </div>

            {/* Opciones */}
            <div className="space-y-3">
              {/* Botón Modificar */}
              <button
                onClick={handleModifyOrder}
                className="w-full bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600 transition-colors font-bold text-lg flex items-center justify-center gap-2 shadow-md"
              >
                <ArrowRight className="rotate-180" size={20} />
                Modificar
              </button>

              {/* Botón Revisado */}
              <button
                onClick={handleMarkAsReviewed}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-bold text-lg flex items-center justify-center gap-2 shadow-md"
              >
                ✓ Revisado
              </button>

              {/* Botón Cancelar */}
              <button
                onClick={handleCancelOrder}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-bold text-lg flex items-center justify-center gap-2 shadow-md"
              >
                <X size={20} />
                Cancelar
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Selecciona una opción para continuar
            </p>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cancelación */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-scale-in border-4 border-red-500">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ¿Cancelar pedido?
              </h2>
              <p className="text-gray-600">
                Tu carrito se vaciará y serás redirigido al catálogo
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={confirmCancelOrder}
                disabled={cancellingOrder}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-bold text-lg flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancellingOrder ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Cancelando...
                  </>
                ) : (
                  <>
                    Sí, cancelar pedido
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setShowVerificationModal(true)
                }}
                disabled={cancellingOrder}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                No, volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Guardar Carrito para Después */}
      {showSaveCartModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-scale-in border-4 border-blue-500">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                💾 Guardar Carrito
              </h2>
              <p className="text-gray-600 mb-4">
                Tu carrito se guardará y podrás continuar más tarde
              </p>
              <div className="bg-blue-50 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Se guardará:</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ {cart?.items.length || 0} productos</li>
                  <li>✓ Notas del pedido</li>
                  <li>✓ Método de entrega</li>
                  <li>✓ Cupones aplicados</li>
                  <li>✓ Créditos seleccionados</li>
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  El carrito estará disponible por 7 días
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={confirmSaveCart}
                disabled={savingCart}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingCart ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Bookmark size={20} />
                    Sí, guardar y salir
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowSaveCartModal(false)}
                disabled={savingCart}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos para animaciones */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        :global(.animate-scale-in) {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-xl shadow-md">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  )
}
 