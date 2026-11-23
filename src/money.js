import { useCallback, useEffect, useState } from 'react';
import { storage } from './storage';

export const DEFAULT_USD_RATE = 16000;

export function formatMoney(amount, currency = 'IDR', rate = DEFAULT_USD_RATE) {
  const value = Number(amount) || 0;
  if (currency === 'USD') {
    const usd = value / (Number(rate) > 0 ? Number(rate) : DEFAULT_USD_RATE);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usd);
  }
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded));
  let out = '';
  for (let i = digits.length - 1, c = 0; i >= 0; i--, c++) {
    if (c > 0 && c % 3 === 0) out = '.' + out;
    out = digits[i] + out;
  }
  return (rounded < 0 ? '-Rp' : 'Rp') + out;
}

export function useStoreSettings() {
  const [settings, setSettings] = useState({ storeName: 'Fleet Demo Store', currency: 'IDR', exchangeRate: DEFAULT_USD_RATE, lowStockThreshold: 10 });
  const reload = useCallback(async () => {
    try {
      const storesRaw = await storage.getItem('fleet_stores');
      const appRaw = await storage.getItem('fleet_settings');
      const store = storesRaw ? (JSON.parse(storesRaw)[0] || {}) : {};
      const app = appRaw ? JSON.parse(appRaw) : {};
      setSettings({
        storeName: store.name || 'Fleet Demo Store',
        currency: store.currency === 'USD' ? 'USD' : 'IDR',
        exchangeRate: Number(store.exchangeRate) > 0 ? Number(store.exchangeRate) : DEFAULT_USD_RATE,
        lowStockThreshold: Number.isInteger(Number(app.lowStockThreshold)) ? Number(app.lowStockThreshold) : 10,
      });
    } catch (_) {}
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const money = useCallback((amount) => formatMoney(amount, settings.currency, settings.exchangeRate), [settings.currency, settings.exchangeRate]);
  return { ...settings, money, reload };
}
