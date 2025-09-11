export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SELLER' | 'CLIENT';
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
  unit: 'case' | 'pk';
  price: number;
  stock: number;
  sellerIds: string[];
}

export interface Order {
  id: string;
  clientId: string;
  sellerId: string;
  status: 'PENDING' | 'PLACED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED';
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