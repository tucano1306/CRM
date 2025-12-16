// Type aliases for commonly used union types
export type UserRole = 'ADMIN' | 'SELLER' | 'CLIENT';
export type ProductUnit = 'case' | 'pk';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'IN_DELIVERY' | 'DELIVERED' | 'PARTIALLY_DELIVERED' | 'COMPLETED' | 'CANCELED' | 'PAYMENT_PENDING' | 'PAID';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  sellerId?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  unit: ProductUnit;
  price: number;
  stock: number;
  sellerIds: string[];
}

export interface Order {
  id: string;
  clientId: string;
  sellerId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;  // AGREGADO
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;  // AGREGADO
  quantity: number;
  pricePerUnit: number; // AGREGADO (era opcional)
  confirmed: boolean;
}