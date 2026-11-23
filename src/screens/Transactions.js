import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, TouchableOpacity, Modal, ActivityIndicator, RefreshControl, TextInput, ScrollView } from 'react-native';
import { C } from '../theme';
import { useStoreSettings } from '../money';
import { Card, T, Btn } from '../ui';
import { api } from '../api';

const PERIODS = [
  ['all', 'Semua'],
  ['day', 'Hari ini'],
  ['week', '7 hari'],
  ['month', 'Bulan ini'],
];
const PAYMENTS = [
  ['ALL', 'Semua'],
  ['CASH', 'Tunai'],
  ['QRIS', 'QRIS'],
  ['CARD', 'Kartu'],
];

const dateLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Tanggal tidak tersedia' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};
const itemCount = (row) => (row.items || []).reduce((n, line) => n + Number(line.qty || 0), 0);
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function Transactions() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('all');
  const [payment, setPayment] = useState('ALL');
  const { money } = useStoreSettings();

  const load = useCallback(async () => {
    try {
      const data = typeof api.transactions === 'function' ? await api.transactions() : [];
      setRows(Array.isArray(data) ? data.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const now = new Date();
    let from = null;
    if (period === 'day') from = startOfDay(now);
    if (period === 'week') { from = startOfDay(now); from.setDate(from.getDate() - 6); }
    if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const created = new Date(row.createdAt);
      const matchesPeriod = !from || (created >= from && created <= now);
      const matchesPayment = payment === 'ALL' || String(row.paymentMethod || 'CASH').toUpperCase() === payment;
      const matchesQuery = !needle || String(row.id || '').toLowerCase().includes(needle);
      return matchesPeriod && matchesPayment && matchesQuery;
    });
  }, [rows, period, payment, query]);

  const summary = useMemo(() => ({
    count: filtered.length,
    revenue: filtered.reduce((sum, row) => sum + Number(row.total || 0), 0),
    units: filtered.reduce((sum, row) => sum + itemCount(row), 0),
  }), [filtered]);

  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;

  return <>
    <FlatList
      data={filtered}
      keyExtractor={(item, index) => String(item.id || index)}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.green} />}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 30 }}
      ListHeaderComponent={<View style={{ gap: 13, marginBottom: 4 }}>
        <View style={{ gap: 3 }}>
          <T s={23} w="800">Riwayat Transaksi</T>
          <T s={11} c={C.mute}>Cari, filter, dan periksa transaksi tokomu.</T>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Card style={{ flex: 1, padding: 12, gap: 4 }}>
            <T s={10} c={C.mute}>Total penjualan</T>
            <T s={18} w="800" c={C.green}>{money(summary.revenue)}</T>
          </Card>
          <Card style={{ flex: 1, padding: 12, gap: 4 }}>
            <T s={10} c={C.mute}>Transaksi</T>
            <T s={22} w="800">{summary.count}</T>
            <T s={10} c={C.mute}>{summary.units} unit terjual</T>
          </Card>
        </View>

        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 13, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' }}>
          <T s={17} c={C.mute}>⌕</T>
          <TextInput value={query} onChangeText={setQuery} placeholder="Cari ID transaksi..." placeholderTextColor={C.mute}
            autoCapitalize="none" returnKeyType="search" style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 9, color: C.text, fontSize: 13 }} />
          {!!query && <TouchableOpacity onPress={() => setQuery('')}><T s={11} c={C.green}>Hapus</T></TouchableOpacity>}
        </View>

        <View style={{ gap: 7 }}>
          <T s={11} w="700" c={C.mute}>PERIODE</T>
          <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 4 }}>
            {PERIODS.map(([key, label]) => <TouchableOpacity key={key} onPress={() => setPeriod(key)} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9, backgroundColor: period === key ? C.line : 'transparent' }}>
              <T s={10} w="700" c={period === key ? C.text : C.mute}>{label}</T>
            </TouchableOpacity>)}
          </View>
        </View>

        <View style={{ gap: 7 }}>
          <T s={11} w="700" c={C.mute}>METODE PEMBAYARAN</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
            {PAYMENTS.map(([key, label]) => <TouchableOpacity key={key} onPress={() => setPayment(key)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: payment === key ? C.green : C.card, borderWidth: 1, borderColor: payment === key ? C.green : C.line }}>
              <T s={11} w="700" c={payment === key ? '#06281F' : C.mute}>{label}</T>
            </TouchableOpacity>)}
          </ScrollView>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
          <T s={12} w="700">Daftar transaksi</T>
          <T s={10} c={C.mute}>{filtered.length} dari {rows.length} transaksi</T>
        </View>
      </View>}
      ListEmptyComponent={<Card style={{ alignItems: 'center', padding: 24, gap: 8 }}>
        <T w="700">Tidak ada transaksi ditemukan</T>
        <T s={11} c={C.mute} style={{ textAlign: 'center' }}>Coba ubah kata kunci atau filter periode dan pembayaran.</T>
        <TouchableOpacity onPress={() => { setQuery(''); setPeriod('all'); setPayment('ALL'); }}><T s={12} w="700" c={C.green}>Reset filter</T></TouchableOpacity>
      </Card>}
      renderItem={({ item }) => {
        const status = String(item.status || 'COMPLETED').toUpperCase();
        const statusLabel = status === 'COMPLETED' ? 'SELESAI' : status;
        return <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Lihat struk ${item.id}`}>
          <Card style={{ padding: 14, gap: 9 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <T s={13} w="800">{item.id}</T>
                <T s={10} c={C.mute}>{dateLabel(item.createdAt)}</T>
              </View>
              <T s={15} w="800" c={C.green}>{money(item.total || 0)}</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <View style={{ backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 }}><T s={9} w="800" c={C.mute}>{item.paymentMethod || 'CASH'}</T></View>
                <T s={10} c={C.mute}>{itemCount(item)} unit</T>
              </View>
              <T s={9} w="800" c={status === 'COMPLETED' ? C.green : C.amber}>{statusLabel} · LIHAT STRUK ›</T>
            </View>
          </Card>
        </TouchableOpacity>;
      }}
    />

    <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.68)' }}>
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 13, maxHeight: '88%', borderWidth: 1, borderColor: C.line }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ gap: 3 }}><T s={20} w="800">Detail Struk</T><T s={10} c={C.mute}>Rincian transaksi dan pembayaran</T></View>
            <TouchableOpacity onPress={() => setSelected(null)} style={{ padding: 8 }}><T s={12} w="700" c={C.green}>Tutup</T></TouchableOpacity>
          </View>
          {selected && <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 6 }}>
            <Card style={{ padding: 13, gap: 5 }}>
              <T s={10} c={C.mute}>NOMOR TRANSAKSI</T>
              <T s={13} w="800">{selected.id}</T>
              <T s={11} c={C.mute}>{dateLabel(selected.createdAt)}</T>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 7, borderTopWidth: 1, borderTopColor: C.line }}>
                <T s={11} c={C.mute}>Metode pembayaran</T><T s={11} w="800">{selected.paymentMethod || 'CASH'}</T>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T s={11} c={C.mute}>Status</T><T s={11} w="800" c={String(selected.status || 'COMPLETED').toUpperCase() === 'COMPLETED' ? C.green : C.amber}>{String(selected.status || 'COMPLETED').toUpperCase()}</T>
              </View>
            </Card>
            <View style={{ gap: 8 }}>
              <T s={13} w="800">Item pesanan ({itemCount(selected)} unit)</T>
              {(selected.items || []).map((line, i) => <View key={`${line.productId}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <View style={{ flex: 1, gap: 3 }}><T s={12} w="700">{line.name}</T><T s={10} c={C.mute}>{line.sku || line.productId} · {line.qty} × {money(line.price)}</T></View>
                <T s={12} w="700">{money(line.subtotal ?? Number(line.price) * Number(line.qty))}</T>
              </View>)}
            </View>
            <Card style={{ padding: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T s={11} c={C.mute}>Jumlah unit</T><T s={11} w="700">{itemCount(selected)}</T></View>
              <View style={{ height: 1, backgroundColor: C.line, marginVertical: 3 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T s={14} w="800">Total pembayaran</T><T s={20} w="800" c={C.green}>{money(selected.total || 0)}</T></View>
            </Card>
            <Btn title="Selesai" onPress={() => setSelected(null)} />
          </ScrollView>}
        </View>
      </View>
    </Modal>
  </>;
}
