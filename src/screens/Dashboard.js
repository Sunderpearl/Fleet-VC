import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { C } from '../theme';
import { useStoreSettings } from '../money';
import { Card, T, Btn } from '../ui';
import { api, syncQueue } from '../api';
import { IconStore, IconAlert } from '../icons';

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
  const topProducts = Object.entries(sold).map(([id, s]) => {
    const p = productById.get(id) || {};
    return { id, name: p.name || s.name, sku: p.sku || s.sku, stock: Number(p.stock || 0), sold: s.qty, revenue: s.revenue };
  }).sort((a, b) => b.sold - a.sold).slice(0, 5);

  let bars = [];
  if (period === 'day') {
    bars = Array.from({ length: 15 }, (_, i) => {
      const hour = i + 8;
      const value = valid.filter((t) => new Date(t.createdAt).getHours() === hour).reduce((s, t) => s + Number(t.total || 0), 0);
      return { label: `${String(hour).padStart(2, '0')}`, value };
    });
  } else if (period === 'week') {
    bars = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const value = valid.filter((t) => dateKey(new Date(t.createdAt)) === dateKey(day)).reduce((s, t) => s + Number(t.total || 0), 0);
      return { label: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][day.getDay()], value };
    });
  } else {
    const days = now.getDate();
    bars = Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const value = valid.filter((t) => new Date(t.createdAt).getDate() === day).reduce((s, t) => s + Number(t.total || 0), 0);
      return { label: String(day), value };
    });
  }

  return {
    revenue, orders: valid.length, aov, itemCount, topProducts, bars, payment,
    lowStock: (products || []).filter((p) => Number(p.stock || 0) <= Number(p.lowStockAt ?? 10)).sort((a, b) => Number(a.stock) - Number(b.stock)),
    transactionCount: valid.length,
    periodLabel: period === 'day' ? 'Hari ini' : period === 'week' ? '7 hari terakhir' : 'Bulan ini',
  };
}

export default function Dashboard() {
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
  report.lowStock = products.filter((p) => Number(p.stock || 0) <= Number(p.lowStockAt ?? lowStockThreshold)).sort((a, b) => Number(a.stock) - Number(b.stock));
  const maxBar = Math.max(1, ...report.bars.map((b) => b.value));
  const chartBars = period === 'month' ? report.bars.filter((_, i) => i % Math.max(1, Math.ceil(report.bars.length / 15)) === 0) : report.bars;

  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;
  if (error && !transactions.length && !products.length) return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 12 }}>
      <T s={18} w="800">Dashboard gagal dimuat</T><T c={C.mute}>{error}</T><Btn title="Coba Lagi" onPress={() => { setLoading(true); load(); }} />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.green} colors={[C.green]} />}>
      <View style={{ gap: 4 }}>
        <T s={11} c={C.mute} w="700">RINGKASAN TOKO</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconStore size={20} color={C.green} />
          <T s={19} w="800">{storeName}</T>
        </View>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4 }}>
        {PERIODS.map((p) => {
          const active = period === p.key;
          return <TouchableOpacity key={p.key} onPress={() => setPeriod(p.key)} style={{ flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', backgroundColor: active ? C.line : 'transparent' }}>
            <T s={12} w="700" c={active ? C.text : C.mute}>{p.label}</T>
          </TouchableOpacity>;
        })}
      </View>

      <View style={{ backgroundColor: C.green, borderRadius: 22, padding: 20, gap: 5 }}>
        <T c="#D1FAE5">Total Pendapatan • {report.periodLabel}</T>
        <T s={30} w="800">{money(report.revenue)}</T>
        <T s={11} c="#D1FAE5">{report.orders} transaksi selesai</T>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, gap: 5 }}><T s={11} c={C.mute}>Transaksi</T><T s={23} w="800">{report.orders}</T></Card>
        <Card style={{ flex: 1, gap: 5 }}><T s={11} c={C.mute}>Rata-rata / transaksi</T><T s={18} w="800">{money(report.aov)}</T></Card>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, gap: 5 }}><T s={11} c={C.mute}>Unit terjual</T><T s={23} w="800">{report.itemCount}</T></Card>
        <Card style={{ flex: 1, gap: 5 }}><T s={11} c={C.mute}>Produk aktif</T><T s={23} w="800">{products.length}</T></Card>
      </View>

      <Card style={{ gap: 10 }}>
        <View><T s={16} w="800">Tren Penjualan</T><T s={11} c={C.mute}>{period === 'day' ? 'Pendapatan per jam' : period === 'week' ? 'Pendapatan per hari' : 'Pendapatan per tanggal'}</T></View>
        {report.orders === 0 ? <View style={{ height: 116, alignItems: 'center', justifyContent: 'center' }}><T s={12} c={C.mute}>Belum ada penjualan pada periode ini</T></View> : (
          <>
            <View style={{ height: 126, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingTop: 10 }}>
              {chartBars.map((b, i) => <View key={`${b.label}-${i}`} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                <View style={{ width: '100%', height: Math.max(3, (b.value / maxBar) * 100), backgroundColor: b.value ? C.green : C.line, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
              </View>)}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T s={9} c={C.mute}>{chartBars[0]?.label || ''}</T><T s={9} c={C.mute}>{chartBars[Math.floor(chartBars.length / 2)]?.label || ''}</T><T s={9} c={C.mute}>{chartBars[chartBars.length - 1]?.label || ''}</T>
            </View>
          </>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <T s={16} w="800">Metode Pembayaran</T>
        {['CASH', 'QRIS', 'CARD'].map((method) => {
          const value = report.payment[method] || 0;
          const pct = report.revenue ? Math.round(value / report.revenue * 100) : 0;
          return <View key={method} style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T s={12} w="700">{method === 'CASH' ? 'Tunai' : method}</T><T s={12} c={C.mute}>{money(value)} ({pct}%)</T></View>
            <View style={{ height: 7, borderRadius: 8, backgroundColor: C.line, overflow: 'hidden' }}><View style={{ width: `${pct}%`, height: 7, backgroundColor: C.green, borderRadius: 8 }} /></View>
          </View>;
        })}
      </Card>

      <View style={{ gap: 8 }}>
        <T s={16} w="800">Produk Terlaris</T>
        {report.topProducts.length === 0 ? <Card style={{ padding: 18, alignItems: 'center' }}><T s={12} c={C.mute}>Belum ada produk terjual pada periode ini</T></Card> :
          report.topProducts.map((p, i) => <Card key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 3 }}><T w="700">{i + 1}. {p.name}</T><T s={10} c={C.mute}>{p.sku} • Stok {p.stock}</T></View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}><T w="800" c={C.green}>{p.sold} terjual</T><T s={10} c={C.mute}>{money(p.revenue)}</T></View>
          </Card>)}
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><IconAlert size={17} color={C.amber} /><T s={16} w="800">Peringatan Stok</T></View>
        {report.lowStock.length === 0 ? <Card style={{ padding: 16 }}><T s={12} c={C.green}>Semua stok berada di atas batas minimum.</T></Card> :
          report.lowStock.slice(0, 5).map((p) => <Card key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 3 }}><T w="700">{p.name}</T><T s={10} c={C.mute}>{p.sku}</T></View><T w="800" c={C.amber}>{p.stock} tersisa</T>
          </Card>)}
      </View>
      {!!error && <T s={11} c={C.amber}>{error}</T>}
    </ScrollView>
  );
}
