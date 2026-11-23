import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { C } from '../theme';
import { useStoreSettings } from '../money';
import { Card, T, Btn } from '../ui';
import { api, syncQueue } from '../api';
import { IconStore, IconAlert, IconArrowRight, IconPOS, IconInventory } from '../icons';

const PERIODS = [
  { key: 'day', label: 'Hari ini' },
  { key: 'week', label: '7 hari' },
  { key: 'month', label: 'Bulan ini' },
];

const dateKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function buildReport(transactions, products, period) {
  const now = new Date();
  let start;
  if (period === 'day') start = startOfDay(now);
  else if (period === 'week') {
    start = startOfDay(now);
    start.setDate(start.getDate() - 6);
  } else start = new Date(now.getFullYear(), now.getMonth(), 1);

  const valid = (transactions || []).filter((t) => {
    const dt = new Date(t.createdAt);
    return !Number.isNaN(dt.getTime()) && dt >= start && dt <= now && t.status !== 'CANCELLED';
  });
  const revenue = valid.reduce((sum, t) => sum + Number(t.total || 0), 0);
  const itemCount = valid.reduce((sum, t) => sum + (t.items || []).reduce((n, line) => n + Number(line.qty || 0), 0), 0);
  const aov = valid.length ? Math.round(revenue / valid.length) : 0;
  const sold = {};
  const payment = { CASH: 0, QRIS: 0, CARD: 0 };
  valid.forEach((t) => {
    const method = String(t.paymentMethod || 'CASH').toUpperCase();
    payment[method] = (payment[method] || 0) + Number(t.total || 0);
    (t.items || []).forEach((line) => {
      const id = String(line.productId);
      if (!sold[id]) sold[id] = { qty: 0, revenue: 0, name: line.name || 'Produk', sku: line.sku || id };
      sold[id].qty += Number(line.qty || 0);
      sold[id].revenue += Number(line.subtotal ?? Number(line.price || 0) * Number(line.qty || 0));
    });
  });

  const productById = new Map((products || []).map((p) => [String(p.id), p]));
  const topProducts = Object.entries(sold).map(([id, item]) => {
    const product = productById.get(id) || {};
    return { id, name: product.name || item.name, sku: product.sku || item.sku, stock: Number(product.stock || 0), sold: item.qty, revenue: item.revenue };
  }).sort((a, b) => b.sold - a.sold).slice(0, 5);

  let bars = [];
  if (period === 'day') {
    bars = Array.from({ length: 15 }, (_, i) => {
      const hour = i + 8;
      const value = valid.filter((t) => new Date(t.createdAt).getHours() === hour).reduce((sum, t) => sum + Number(t.total || 0), 0);
      return { label: `${String(hour).padStart(2, '0')}`, value };
    });
  } else if (period === 'week') {
    bars = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const value = valid.filter((t) => dateKey(new Date(t.createdAt)) === dateKey(day)).reduce((sum, t) => sum + Number(t.total || 0), 0);
      return { label: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][day.getDay()], value };
    });
  } else {
    bars = Array.from({ length: now.getDate() }, (_, i) => {
      const day = i + 1;
      const value = valid.filter((t) => new Date(t.createdAt).getDate() === day).reduce((sum, t) => sum + Number(t.total || 0), 0);
      return { label: String(day), value };
    });
  }

  return {
    revenue, orders: valid.length, aov, itemCount, topProducts, bars, payment,
    lowStock: [],
    periodLabel: period === 'day' ? 'Hari ini' : period === 'week' ? '7 hari terakhir' : 'Bulan ini',
  };
}

function SectionTitle({ title, subtitle, action, onAction }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <View style={{ flex: 1, gap: 3 }}>
        <T s={16} w="800">{title}</T>
        {!!subtitle && <T s={11} c={C.mute}>{subtitle}</T>}
      </View>
      {!!action && <TouchableOpacity onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><T s={11} w="700" c={C.green}>{action}</T><IconArrowRight size={13} color={C.green} /></TouchableOpacity>}
    </View>
  );
}

export default function Dashboard({ onNavigate = () => {} }) {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState('day');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { storeName, money, lowStockThreshold } = useStoreSettings();

  const load = useCallback(async () => {
    try {
      setError('');
      try { syncQueue().catch(() => {}); } catch (_) {}
      const [tx, prod] = await Promise.all([api.transactions(), api.products()]);
      setTransactions(Array.isArray(tx) ? tx : []);
      setProducts(Array.isArray(prod) ? prod : []);
    } catch (e) {
      setError(e.message || 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const report = useMemo(() => buildReport(transactions, products, period), [transactions, products, period]);
  report.lowStock = products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(lowStockThreshold)).sort((a, b) => Number(a.stock) - Number(b.stock));
  const maxBar = Math.max(1, ...report.bars.map((bar) => bar.value));
  const chartBars = period === 'month' ? report.bars.filter((_, i) => i % Math.max(1, Math.ceil(report.bars.length / 15)) === 0) : report.bars;
  const lowStockCount = report.lowStock.length;
  const outOfStockCount = products.filter((p) => Number(p.stock || 0) <= 0).length;

  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;
  if (error && !transactions.length && !products.length) return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 12 }}>
      <T s={18} w="800">Dashboard gagal dimuat</T><T c={C.mute}>{error}</T><Btn title="Coba Lagi" onPress={() => { setLoading(true); load(); }} />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.green} colors={[C.green]} />}>
      <View style={{ gap: 4 }}>
        <T s={10} c={C.mute} w="800">RINGKASAN TOKO</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <IconStore size={20} color={C.green} />
            <T s={21} w="800" numberOfLines={1}>{storeName}</T>
          </View>
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }}>
            <T s={10} w="700" c={C.green}>LOCAL POS</T>
          </View>
        </View>
        <T s={11} c={C.mute}>Pantau performa dan operasional tokomu.</T>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={() => onNavigate('pos')} style={{ flex: 1, backgroundColor: C.green, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <IconPOS size={17} color="#06281F" /><T s={12} w="800" c="#06281F">Transaksi baru</T>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('inv')} style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <IconInventory size={17} color={C.green} /><T s={12} w="800">Tambah produk</T>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 13, padding: 4 }}>
        {PERIODS.map((item) => {
          const active = period === item.key;
          return <TouchableOpacity key={item.key} onPress={() => setPeriod(item.key)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: active ? C.line : 'transparent' }}>
            <T s={11} w="700" c={active ? C.text : C.mute}>{item.label}</T>
          </TouchableOpacity>;
        })}
      </View>

      <View style={{ backgroundColor: C.green, borderRadius: 20, padding: 18, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T s={12} c="#D1FAE5" w="700">PENDAPATAN · {report.periodLabel.toUpperCase()}</T>
          <View style={{ backgroundColor: 'rgba(6,40,31,0.18)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}><T s={9} c="#D1FAE5" w="800">TOTAL</T></View>
        </View>
        <T s={30} w="800" c="#06281F">{money(report.revenue)}</T>
        <T s={11} c="#D1FAE5">{report.orders} transaksi selesai · {report.itemCount} unit terjual</T>
      </View>

      <View style={{ flexDirection: 'row', gap: 9 }}>
        <Card style={{ flex: 1, padding: 13, gap: 5 }}>
          <T s={10} c={C.mute}>Transaksi</T><T s={22} w="800">{report.orders}</T>
          <T s={10} c={C.mute}>{report.periodLabel}</T>
        </Card>
        <Card style={{ flex: 1, padding: 13, gap: 5 }}>
          <T s={10} c={C.mute}>Rata-rata transaksi</T><T s={18} w="800">{money(report.aov)}</T>
          <T s={10} c={C.mute}>Nilai per pesanan</T>
        </Card>
      </View>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <Card style={{ flex: 1, padding: 13, gap: 5 }}>
          <T s={10} c={C.mute}>Unit terjual</T><T s={22} w="800">{report.itemCount}</T>
          <T s={10} c={C.mute}>{report.periodLabel}</T>
        </Card>
        <Card style={{ flex: 1, padding: 13, gap: 5 }}>
          <T s={10} c={C.mute}>Produk terdaftar</T><T s={22} w="800">{products.length}</T>
          <T s={10} c={C.mute}>Di inventaris</T>
        </Card>
      </View>

      <Card style={{ gap: 13, padding: 15 }}>
        <SectionTitle title="Tren penjualan" subtitle={period === 'day' ? 'Pendapatan per jam' : period === 'week' ? 'Pendapatan per hari' : 'Pendapatan per tanggal'} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T s={10} c={C.mute}>Puncak: {money(maxBar > 1 ? maxBar : 0)}</T>
          <T s={10} c={C.mute}>{report.periodLabel}</T>
        </View>
        {report.orders === 0 ? <View style={{ height: 112, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, borderRadius: 12 }}><T s={12} c={C.mute}>Belum ada transaksi pada periode ini.</T></View> : (
          <>
            <View style={{ height: 126, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
              {chartBars.map((bar, i) => <View key={`${bar.label}-${i}`} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                <View style={{ width: '100%', height: Math.max(bar.value ? 5 : 2, (bar.value / maxBar) * 105), backgroundColor: bar.value ? C.green : C.line, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
              </View>)}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T s={9} c={C.mute}>{chartBars[0]?.label || ''}</T><T s={9} c={C.mute}>{chartBars[Math.floor(chartBars.length / 2)]?.label || ''}</T><T s={9} c={C.mute}>{chartBars[chartBars.length - 1]?.label || ''}</T>
            </View>
          </>
        )}
      </Card>

      <Card style={{ gap: 12, padding: 15 }}>
        <SectionTitle title="Metode pembayaran" subtitle="Bagian pendapatan berdasarkan cara bayar." />
        {['CASH', 'QRIS', 'CARD'].map((method) => {
          const value = report.payment[method] || 0;
          const pct = report.revenue ? Math.round(value / report.revenue * 100) : 0;
          return <View key={method} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T s={12} w="700">{method === 'CASH' ? 'Tunai' : method}</T><T s={11} c={C.mute}>{money(value)} · {pct}%</T>
            </View>
            <View style={{ height: 8, borderRadius: 8, backgroundColor: C.line, overflow: 'hidden' }}><View style={{ width: `${pct}%`, height: 8, backgroundColor: C.green, borderRadius: 8 }} /></View>
          </View>;
        })}
      </Card>

      <View style={{ gap: 10 }}>
        <SectionTitle title="Produk terlaris" subtitle="Produk dengan unit penjualan terbanyak." />
        {report.topProducts.length === 0 ? <Card style={{ padding: 18, alignItems: 'center' }}><T s={12} c={C.mute}>Produk terjual akan muncul setelah transaksi.</T></Card> :
          report.topProducts.map((product, index) => <Card key={product.id} style={{ padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><T s={12} w="800" c={C.green}>{index + 1}</T></View>
            <View style={{ flex: 1, gap: 3 }}><T w="700">{product.name}</T><T s={10} c={C.mute}>{product.sku} · Stok {product.stock}</T></View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}><T s={12} w="800" c={C.green}>{product.sold} terjual</T><T s={10} c={C.mute}>{money(product.revenue)}</T></View>
          </Card>)}
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle title="Perlu perhatian" subtitle={`${lowStockCount} produk perlu dicek · ${outOfStockCount} stok habis`} action="Buka inventaris" onAction={() => onNavigate('inv')} />
        {report.lowStock.length === 0 ? <Card style={{ padding: 15 }}><T s={12} c={C.green}>Semua produk memiliki stok yang cukup.</T></Card> :
          report.lowStock.slice(0, 5).map((product) => {
            const out = Number(product.stock || 0) <= 0;
            return <Card key={product.id} style={{ padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 3, borderLeftColor: out ? C.red : C.amber }}>
              <View style={{ flex: 1, gap: 3 }}><T w="700">{product.name}</T><T s={10} c={C.mute}>{product.sku}</T></View>
              <T s={12} w="800" c={out ? C.red : C.amber}>{out ? 'Habis' : `${product.stock} tersisa`}</T>
            </Card>;
          })}
      </View>
      {!!error && <T s={11} c={C.amber}>{error}</T>}
    </ScrollView>
  );
}
