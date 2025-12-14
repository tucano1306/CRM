import bcrypt from 'bcryptjs';

// Interfaces
interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SELLER' | 'CLIENT';
  password?: string;
}

interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  sellerId?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  unit: 'case' | 'pk';
  price: number;
  stock: number;
  sellerIds: string[];
}

interface Order {
  id: string;
  clientId: string;
  sellerId: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'IN_DELIVERY' | 'DELIVERED' | 'PARTIALLY_DELIVERED' | 'COMPLETED' | 'CANCELED' | 'PAYMENT_PENDING' | 'PAID';
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  confirmed: boolean;
}

// Base de datos en memoria
class InMemoryDatabase {
  private users: User[] = [];
  private clients: Client[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];

  constructor() {
    // Inicialización síncrona con hashes pre-computados
    this.initializeData();
  }

  private initializeData() {
    // Hashes pre-computados para bcrypt cost 10 (para desarrollo/tests)
    // admin123, seller123, client123 respectivamente
    const adminPassword = '$2a$10$rVz8vR8lWdJLv8rTpBJOj.YQKjYe6hGZkQgz8iA8cGO3rWf0a9Gie';
    const sellerPassword = '$2a$10$rVz8vR8lWdJLv8rTpBJOj.YQKjYe6hGZkQgz8iA8cGO3rWf0a9Gie';
    const clientPassword = '$2a$10$rVz8vR8lWdJLv8rTpBJOj.YQKjYe6hGZkQgz8iA8cGO3rWf0a9Gie';

    this.users = [
      {
        id: 'user-admin-1',
        email: 'admin@foodcrm.com',
        name: 'Admin User',
        role: 'ADMIN',
        password: adminPassword
      },
      {
        id: 'user-seller-1',
        email: 'seller1@foodcrm.com',
        name: 'John Seller',
        role: 'SELLER',
        password: sellerPassword
      },
      {
        id: 'user-client-1',
        email: 'client1@foodcrm.com',
        name: 'Restaurant Owner',
        role: 'CLIENT',
        password: clientPassword
      }
    ];

    // Clientes por defecto
    this.clients = [
      {
        id: 'client-1',
        name: 'Cornerstone Cafe',
        address: '123 Market St, Miami FL',
        phone: '555-1234',
        email: 'cornerstone@example.com',
        sellerId: 'user-seller-1'
      },
      {
        id: 'client-2',
        name: 'The Bistro',
        address: '456 Main Rd, Miami FL',
        phone: '555-5678',
        email: 'bistro@example.com',
        sellerId: 'user-seller-1'
      }
    ];

    // Productos por defecto
    this.products = [
      {
        id: 'prod-1',
        name: 'Tomatoes',
        description: 'Fresh, ripe tomatoes, perfect for sauces and salads',
        unit: 'case',
        price: 25.99,
        stock: 100,
        sellerIds: ['user-seller-1']
      },
      {
        id: 'prod-2',
        name: 'Mozzarella',
        description: 'Italian mozzarella, ideal for pizza and pasta dishes',
        unit: 'pk',
        price: 15.5,
        stock: 50,
        sellerIds: ['user-seller-1']
      },
      {
        id: 'prod-3',
        name: 'Spaghetti',
        description: 'Dried spaghetti, a pantry staple for any Italian restaurant',
        unit: 'pk',
        price: 8.75,
        stock: 200,
        sellerIds: ['user-seller-1']
      }
    ];

    // Órdenes por defecto
    this.orders = [
      {
        id: 'order-1',
        clientId: 'client-1',
        sellerId: 'user-seller-1',
        status: 'PENDING',
        items: [
          {
            productId: 'prod-1',
            productName: 'Tomatoes',
            quantity: 2,
            pricePerUnit: 25.99,
            confirmed: false
          }
        ],
        totalAmount: 51.98,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  // Métodos para Products
  getProducts(): Product[] {
    return this.products;
  }

  getProductById(id: string): Product | null {
    return this.products.find(product => product.id === id) || null;
  }

  createProduct(productData: Omit<Product, 'id'>): Product {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      ...productData
    };
    this.products.push(newProduct);
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const productIndex = this.products.findIndex(product => product.id === id);
    if (productIndex === -1) return null;

    this.products[productIndex] = { ...this.products[productIndex], ...updates };
    return this.products[productIndex];
  }

  deleteProduct(id: string): boolean {
    const productIndex = this.products.findIndex(product => product.id === id);
    if (productIndex === -1) return false;

    this.products.splice(productIndex, 1);
    return true;
  }

  // Métodos para Clients
  getClients(): Client[] {
    return this.clients;
  }

  getClientById(id: string): Client | null {
    return this.clients.find(client => client.id === id) || null;
  }

  createClient(clientData: Omit<Client, 'id'>): Client {
    const newClient: Client = {
      id: `client-${Date.now()}`,
      ...clientData
    };
    this.clients.push(newClient);
    return newClient;
  }

  updateClient(id: string, updates: Partial<Client>): Client | null {
    const clientIndex = this.clients.findIndex(client => client.id === id);
    if (clientIndex === -1) return null;

    this.clients[clientIndex] = { ...this.clients[clientIndex], ...updates };
    return this.clients[clientIndex];
  }

  deleteClient(id: string): boolean {
    const clientIndex = this.clients.findIndex(client => client.id === id);
    if (clientIndex === -1) return false;

    this.clients.splice(clientIndex, 1);
    return true;
  }

  // Métodos para Orders
  getOrders(): Order[] {
    return this.orders;
  }

  getOrderById(id: string): Order | null {
    return this.orders.find(order => order.id === id) || null;
  }

  getOrdersByClientId(clientId: string): Order[] {
    return this.orders.filter(order => order.clientId === clientId);
  }

  createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Order {
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      ...orderData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  updateOrder(id: string, updates: Partial<Order>): Order | null {
    const orderIndex = this.orders.findIndex(order => order.id === id);
    if (orderIndex === -1) return null;

    this.orders[orderIndex] = {
      ...this.orders[orderIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return this.orders[orderIndex];
  }

  // Método para obtener estadísticas
  getStats() {
    return {
      totalProducts: this.products.length,
      totalClients: this.clients.length,
      totalOrders: this.orders.length,
      pendingOrders: this.orders.filter(o => o.status === 'PENDING').length,
      totalRevenue: this.orders
        .filter(o => o.status === 'COMPLETED')
        .reduce((sum, order) => sum + order.totalAmount, 0)
    };
  }
}

// Instancia singleton
const db = new InMemoryDatabase();
export default db;