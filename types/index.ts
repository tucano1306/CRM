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
  sellerIds: string[];
}

export interface Order {
  id: string;
  clientId: string;
  sellerId: string;
  status: 'PENDING' | 'PLACED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED';
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  confirmed: boolean;
  pricePerUnit?: number;
}