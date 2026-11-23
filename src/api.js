import { storage } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tanpa EXPO_PUBLIC_API_URL, app berjalan dengan data contoh (mock).
export const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
export const MOCK = !API_URL;
let tokens = null;
export const setTokens = (t) => { tokens = t; };

// ---- Mutex untuk token refresh (mencegah N request 401 memicu N refresh) ----
let refreshPromise = null;

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const go = () => {
    try {
      return fetch(API_URL + path, {
        method,
        body: body && JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          ...(auth && tokens ? { Authorization: `Bearer ${tokens.access}` } : {}),
        },
      });
    } catch (e) {
      // fetch() throws TypeError on network failure (DNS, offline)
      throw new Error('Tidak ada koneksi internet. Periksa jaringan Anda.');
    }
  };

  let r;
  try {
    r = await go();
  } catch (_) {
    throw new Error('Tidak ada koneksi internet. Periksa jaringan Anda.');
  }

  if (r.status === 401 && auth && tokens?.refresh) {
    // Mutex: hanya satu refresh jalan di satu waktu
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const rr = await fetch(API_URL + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: tokens.refresh }),
          });
          if (rr.ok) {
            const newTokens = await rr.json();
            tokens = newTokens;
            const s = JSON.parse((await storage.getItem('session')) || '{}');
            await storage.setItem('session', JSON.stringify({ ...s, ...newTokens }));
            return true;
          }
          return false;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      try {
        r = await go();
      } catch (_) {
        throw new Error('Tidak ada koneksi internet. Periksa jaringan Anda.');
      }
    }
  }

  // Guard: server might return HTML (502, nginx error page) instead of JSON
  let j;
  try {
    j = await r.json();
  } catch (_) {
    throw new Error(`Server error (${r.status}). Coba lagi nanti.`);
  }

  if (!r.ok) throw new Error(typeof j.error === 'string' ? j.error : 'Terjadi kesalahan');
  return j;
}

const P = [
  { id: '1', sku: 'SKU-9902', name: 'Tech-Shell Parka', price: 450000, stock: 48, lowStockAt: 10 },
  { id: '2', sku: 'SKU-6412', name: 'Urban Runner 2.0', price: 899000, stock: 6, lowStockAt: 10 },
  { id: '3', sku: 'SKU-2201', name: 'Aviator Pro Polarized', price: 320000, stock: 29, lowStockAt: 10 },
  { id: '4', sku: 'SKU-1180', name: 'Pro Studio Headphones', price: 249000, stock: 9, lowStockAt: 10 },
  { id: '5', sku: 'SKU-3305', name: 'Sandalwood Candle', price: 34500, stock: 80, lowStockAt: 10 },
  { id: '6', sku: 'SKU-4410', name: 'Heritage Leather Wallet', price: 189000, stock: 2, lowStockAt: 10 },
];
const readLocal = async (key, fallback) => {
  const raw = await storage.getItem(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
};
const writeLocal = (key, value) => storage.setItem(key, JSON.stringify(value));
const seedLocal = async () => {
  const products = await storage.getItem('fleet_products');
  if (!products) await writeLocal('fleet_products', P);
  const stores = await storage.getItem('fleet_stores');
  if (!stores) await writeLocal('fleet_stores', [{ id: 's1', name: 'Fleet Demo Store', currency: 'IDR' }]);
};
const mock = {
  login: async (b) => {
    await seedLocal();
    const users = await readLocal('fleet_users', []);
    const email = String(b.email || '').trim().toLowerCase();
    const user = users.find((u) => u.email === email && u.password === b.password);
    if (!user) throw new Error('Email atau password salah. Silakan daftar akun terlebih dahulu.');
    const { password, ...safeUser } = user;
    return { user: safeUser, access: 'local-session', refresh: 'local-session' };
  },
  register: async (b) => {
    await seedLocal();
    const users = await readLocal('fleet_users', []);
    const email = String(b.email || '').trim().toLowerCase();
    if (users.some((u) => u.email === email)) throw new Error('Email sudah terdaftar. Silakan masuk.');
    const user = { id: `u-${Date.now()}`, name: String(b.name || '').trim(), email, role: b.role || 'OWNER', password: b.password, createdAt: new Date().toISOString() };
    if (!user.name || !email || !b.password) throw new Error('Nama, email, dan password wajib diisi.');
    await writeLocal('fleet_users', [...users, user]);
    const { password, ...safeUser } = user;
    return { user: safeUser, access: 'local-session', refresh: 'local-session' };
  },
  products: async () => { await seedLocal(); return readLocal('fleet_products', P); },
  saveProducts: async (items) => writeLocal('fleet_products', items),
  stores: async () => { await seedLocal(); return readLocal('fleet_stores', [{ id: 's1', name: 'Fleet Demo Store' }]); },
  saveStores: async (items) => writeLocal('fleet_stores', items),
  order: async (b) => {
    await seedLocal();
    const products = await readLocal('fleet_products', P);
    const transactions = await readLocal('fleet_transactions', []);
    const lines = (b.items || []).map((line) => {
      const product = products.find((x) => x.id === line.productId);
      if (!product) throw new Error('Produk tidak ditemukan.');
      if (product.stock < line.qty) throw new Error(`Stok ${product.name} tidak mencukupi.`);
      return { productId: product.id, sku: product.sku, name: product.name, price: Number(product.price), qty: Number(line.qty), subtotal: Number(product.price) * Number(line.qty) };
    });
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const updated = products.map((product) => {
      const sold = lines.find((line) => line.productId === product.id);
      return sold ? { ...product, stock: product.stock - sold.qty } : product;
    });
    const transaction = { id: `TRX-${Date.now()}`, createdAt: new Date().toISOString(), storeId: b.storeId || 's1', paymentMethod: b.paymentMethod || 'CASH', items: lines, total, status: 'COMPLETED' };
    await writeLocal('fleet_products', updated);
    await writeLocal('fleet_transactions', [transaction, ...transactions]);
    return transaction;
  },
  transactions: async () => readLocal('fleet_transactions', []),
  summary: async () => {
    const products = await mock.products();
    const transactions = await mock.transactions();
    const today = new Date().toDateString();
    const todays = transactions.filter((t) => new Date(t.createdAt).toDateString() === today);
    const revenue = todays.reduce((sum, t) => sum + t.total, 0);
    const sold = {};
    todays.forEach((t) => t.items.forEach((line) => { sold[line.productId] = (sold[line.productId] || 0) + line.qty; }));
    const topSkus = Object.entries(sold).map(([id, qty]) => {
      const product = products.find((p) => p.id === id) || {};
      return { ...product, sold: qty, revenue: qty * Number(product.price || 0) };
    }).sort((a, b) => b.sold - a.sold).slice(0, 5);
    const hourly = Array(24).fill(0);
    todays.forEach((t) => { hourly[new Date(t.createdAt).getHours()] += t.total; });
    return { revenue, orders: todays.length, aov: todays.length ? Math.round(revenue / todays.length) : 0, hourly, topSkus };
  },
};
const real = {
  login: (b) => req('/auth/login', { method: 'POST', body: b, auth: false }),
  register: (b) => req('/auth/register', { method: 'POST', body: b, auth: false }),
  me: () => req('/auth/me'),
  products: () => req('/api/products'),
  stores: () => req('/api/stores'),
  summary: () => req('/api/dashboard/summary'),
  order: (b) => req('/api/orders', { method: 'POST', body: b }),
};
export const api = MOCK ? mock : real;
export const localData = MOCK ? mock : null;

// ---- POS offline-first: antre lokal + sinkron otomatis (clientId = idempotent di server) ----
export async function sendOrder(o) {
  const order = { ...o, clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` };
  try {
    await api.order(order);
    return 'synced';
  } catch (e) {
    if (!/Network|internet|koneksi/i.test(e.message)) throw e;
    const q = JSON.parse((await AsyncStorage.getItem('queue')) || '[]');
    await AsyncStorage.setItem('queue', JSON.stringify([...q, order]));
    return 'queued';
  }
}
export async function syncQueue() {
  const raw = await AsyncStorage.getItem('queue');
  if (!raw) return;
  const q = JSON.parse(raw);
  if (q.length === 0) return;
  const left = [];
  for (const o of q) {
    try { await api.order(o); } catch { left.push(o); }
  }
  await AsyncStorage.setItem('queue', JSON.stringify(left));
}
