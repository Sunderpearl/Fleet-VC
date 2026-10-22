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
  { id: '1', sku: 'SKU-9902', name: 'Tech-Shell Parka', price: 450000, stock: 48 },
  { id: '2', sku: 'SKU-6412', name: 'Urban Runner 2.0', price: 899000, stock: 6 },
  { id: '3', sku: 'SKU-2201', name: 'Aviator Pro Polarized', price: 320000, stock: 29 },
  { id: '4', sku: 'SKU-1180', name: 'Pro Studio Headphones', price: 249000, stock: 9 },
  { id: '5', sku: 'SKU-3305', name: 'Sandalwood Candle', price: 34500, stock: 80 },
  { id: '6', sku: 'SKU-4410', name: 'Heritage Leather Wallet', price: 189000, stock: 2 },
];
const mock = {
  login: async (b) => ({ user: { name: 'Jameson Reed', role: b.role || 'OWNER' }, access: 'm', refresh: 'm' }),
  products: async () => P,
  stores: async () => [{ id: 's1', name: 'Flagship Store' }],
  order: async (b) => b,
  summary: async () => ({
    revenue: 14290450, orders: 184, aov: 77660,
    hourly: [0, 0, 0, 0, 0, 0, 0, 0, 900, 1500, 2400, 2900, 2300, 1700, 1500, 1900, 3200, 5800, 8200, 6900, 4800, 2900, 1200, 0].map((v) => v * 1000),
    topSkus: [{ ...P[0], sold: 48, revenue: 2480000 }, { ...P[1], sold: 32, revenue: 4160000 }, { ...P[2], sold: 29, revenue: 1980000 }],
  }),
};
const real = {
  login: (b) => req('/auth/login', { method: 'POST', body: b, auth: false }),
  me: () => req('/auth/me'),
  products: () => req('/api/products'),
  stores: () => req('/api/stores'),
  summary: () => req('/api/dashboard/summary'),
  order: (b) => req('/api/orders', { method: 'POST', body: b }),
};
export const api = MOCK ? mock : real;

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
