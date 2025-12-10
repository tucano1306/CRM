// lib/postgres.ts
import { Pool, PoolClient, QueryResult } from 'pg';

// ============================================
// CONFIGURACIÓN DE POSTGRESQL
// ============================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'food_orders_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
  process.exit(-1);
});

// ============================================
// INTERFACES DE TIPOS
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SELLER' | 'CLIENT';
  password?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  seller_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  unit: 'case' | 'pk';
  price: number;
  stock: number;
  seller_ids?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface Order {
  id: string;
  client_id: string;
  seller_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'IN_DELIVERY' | 'DELIVERED' | 'PARTIALLY_DELIVERED' | 'COMPLETED' | 'CANCELED' | 'PAYMENT_PENDING' | 'PAID';
  total_amount: number;
  items?: OrderItem[];
  created_at?: Date;
  updated_at?: Date;
}

export interface OrderItem {
  id?: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_per_unit: number;
  confirmed: boolean;
  created_at?: Date;
}

export interface Stats {
  total_products: number;
  total_clients: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Query ejecutada:', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Error en query:', { text, error });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

export async function closePool(): Promise<void> {
  await pool.end();
}

// ============================================
// MÉTODOS PARA USERS
// ============================================

export const UserDB = {
  async getAll(): Promise<User[]> {
    const result = await query<User>(
      'SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  },

  async getById(id: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async getByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const result = await query<User>(
      `INSERT INTO users (email, name, role, password) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, role, created_at, updated_at`,
      [userData.email, userData.name, userData.role, userData.password]
    );
    return result.rows[0];
  },

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query<User>(
      `UPDATE users SET ${fields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING id, email, name, role, created_at, updated_at`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
};

// ============================================
// MÉTODOS PARA CLIENTS
// ============================================

export const ClientDB = {
  async getAll(): Promise<Client[]> {
    const result = await query<Client>(
      'SELECT * FROM clients ORDER BY created_at DESC'
    );
    return result.rows;
  },

  async getById(id: string): Promise<Client | null> {
    const result = await query<Client>(
      'SELECT * FROM clients WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async getBySellerId(sellerId: string): Promise<Client[]> {
    const result = await query<Client>(
      'SELECT * FROM clients WHERE seller_id = $1 ORDER BY created_at DESC',
      [sellerId]
    );
    return result.rows;
  },

  async create(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    const result = await query<Client>(
      `INSERT INTO clients (name, address, phone, email, seller_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [clientData.name, clientData.address, clientData.phone, clientData.email, clientData.seller_id]
    );
    return result.rows[0];
  },

  async update(id: string, updates: Partial<Client>): Promise<Client | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query<Client>(
      `UPDATE clients SET ${fields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM clients WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
};

// ============================================
// MÉTODOS PARA PRODUCTS
// ============================================

export const ProductDB = {
  async getAll(): Promise<Product[]> {
    const result = await query<Product>(
      `SELECT p.*, 
              ARRAY_AGG(ps.seller_id) FILTER (WHERE ps.seller_id IS NOT NULL) as seller_ids
       FROM products p
       LEFT JOIN product_sellers ps ON p.id = ps.product_id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  },

  async getById(id: string): Promise<Product | null> {
    const result = await query<Product>(
      `SELECT p.*, 
              ARRAY_AGG(ps.seller_id) FILTER (WHERE ps.seller_id IS NOT NULL) as seller_ids
       FROM products p
       LEFT JOIN product_sellers ps ON p.id = ps.product_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );
    return result.rows[0] || null;
  },

  async getBySellerId(sellerId: string): Promise<Product[]> {
    const result = await query<Product>(
      `SELECT p.*, 
              ARRAY_AGG(ps.seller_id) FILTER (WHERE ps.seller_id IS NOT NULL) as seller_ids
       FROM products p
       INNER JOIN product_sellers ps ON p.id = ps.product_id
       WHERE ps.seller_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [sellerId]
    );
    return result.rows;
  },

  async create(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query<Product>(
        `INSERT INTO products (name, description, unit, price, stock) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [productData.name, productData.description, productData.unit, productData.price, productData.stock]
      );
      const product = result.rows[0];

      if (productData.seller_ids && productData.seller_ids.length > 0) {
        for (const sellerId of productData.seller_ids) {
          await client.query(
            'INSERT INTO product_sellers (product_id, seller_id) VALUES ($1, $2)',
            [product.id, sellerId]
          );
        }
      }

      await client.query('COMMIT');
      return product;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'seller_ids' && key !== 'created_at' && key !== 'updated_at') {
          fields.push(`${key} = ${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      let product: Product | null = null;
      if (fields.length > 0) {
        values.push(id);
        const result = await client.query<Product>(
          `UPDATE products SET ${fields.join(', ')} 
           WHERE id = ${paramCount} 
           RETURNING *`,
          values
        );
        product = result.rows[0] || null;
      }

      if (updates.seller_ids !== undefined) {
        await client.query('DELETE FROM product_sellers WHERE product_id = $1', [id]);
        
        if (updates.seller_ids.length > 0) {
          for (const sellerId of updates.seller_ids) {
            await client.query(
              'INSERT INTO product_sellers (product_id, seller_id) VALUES ($1, $2)',
              [id, sellerId]
            );
          }
        }
      }

      await client.query('COMMIT');
      return product;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM products WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
};

// ============================================
// MÉTODOS PARA ORDERS
// ============================================

export const OrderDB = {
  async getAll(): Promise<Order[]> {
    const result = await query<Order>(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    return result.rows;
  },

  async getById(id: string): Promise<Order | null> {
    const orderResult = await query<Order>(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );
    
    if (orderResult.rows.length === 0) return null;
    
    const order = orderResult.rows[0];
    const itemsResult = await query<OrderItem>(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );
    
    order.items = itemsResult.rows;
    return order;
  },

  async getByClientId(clientId: string): Promise<Order[]> {
    const result = await query<Order>(
      'SELECT * FROM orders WHERE client_id = $1 ORDER BY created_at DESC',
      [clientId]
    );
    return result.rows;
  },

  async getBySellerId(sellerId: string): Promise<Order[]> {
    const result = await query<Order>(
      'SELECT * FROM orders WHERE seller_id = $1 ORDER BY created_at DESC',
      [sellerId]
    );
    return result.rows;
  },

  async create(orderData: Omit<Order, 'id' | 'total_amount' | 'created_at' | 'updated_at'>): Promise<Order> {
    const result = await query<Order>(
      `INSERT INTO orders (client_id, seller_id, status) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [orderData.client_id, orderData.seller_id, orderData.status]
    );
    return result.rows[0];
  },

  async update(id: string, updates: Partial<Order>): Promise<Order | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'items' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = ${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query<Order>(
      `UPDATE orders SET ${fields.join(', ')} 
       WHERE id = ${paramCount} 
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM orders WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
};

// ============================================
// MÉTODOS PARA ORDER ITEMS
// ============================================

export const OrderItemDB = {
  async getByOrderId(orderId: string): Promise<OrderItem[]> {
    const result = await query<OrderItem>(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    );
    return result.rows;
  },

  async create(itemData: Omit<OrderItem, 'id' | 'created_at'>): Promise<OrderItem> {
    const result = await query<OrderItem>(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, price_per_unit, confirmed) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [itemData.order_id, itemData.product_id, itemData.product_name, itemData.quantity, itemData.price_per_unit, itemData.confirmed]
    );
    return result.rows[0];
  },

  async update(id: string, updates: Partial<OrderItem>): Promise<OrderItem | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query<OrderItem>(
      `UPDATE order_items SET ${fields.join(', ')} 
       WHERE id = ${paramCount} 
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM order_items WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
};

// ============================================
// MÉTODOS PARA ESTADÍSTICAS
// ============================================

export const StatsDB = {
  async getSummary(): Promise<Stats> {
    const result = await query<Stats>(
      'SELECT * FROM stats_summary'
    );
    return result.rows[0];
  },

  async getOrdersByStatus(): Promise<{ status: string; count: number }[]> {
    const result = await query<{ status: string; count: number }>(
      `SELECT status, COUNT(*)::int as count 
       FROM orders 
       GROUP BY status 
       ORDER BY count DESC`
    );
    return result.rows;
  },

  async getTopProducts(limit: number = 10): Promise<{ product_name: string; total_sold: number }[]> {
    const result = await query<{ product_name: string; total_sold: number }>(
      `SELECT product_name, SUM(quantity)::int as total_sold 
       FROM order_items 
       GROUP BY product_name 
       ORDER BY total_sold DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async getRevenueByMonth(): Promise<{ month: string; revenue: number }[]> {
    const result = await query<{ month: string; revenue: number }>(
      `SELECT 
         TO_CHAR(created_at, 'YYYY-MM') as month,
         SUM(total_amount)::numeric as revenue
       FROM orders
       WHERE status = 'COMPLETED'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 12`
    );
    return result.rows;
  }
};

// ============================================
// FUNCIÓN DE INICIALIZACIÓN
// ============================================

export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Conexión a PostgreSQL exitosa:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error);
    return false;
  }
}

// ============================================
// EXPORTAR TODO
// ============================================

const db = {
  query,
  getClient,
  closePool,
  testConnection,
  users: UserDB,
  clients: ClientDB,
  products: ProductDB,
  orders: OrderDB,
  orderItems: OrderItemDB,
  stats: StatsDB
};

export default db;