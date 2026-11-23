import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { C } from '../theme';
import { useStoreSettings } from '../money';
import { Card, T, Btn } from '../ui';
import { api } from '../api';

const dateLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Tanggal tidak tersedia' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function Transactions() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { money } = useStoreSettings();

  const load = useCallback(async () => {
    try {
      const data = typeof api.transactions === 'function' ? await api.transactions() : [];
      setRows(Array.isArray(data) ? data.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)) : []);
    } catch (e) {
      setRows([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;

  return <>
    <FlatList data={rows} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.green} />}
      contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 30 }}
      ListHeaderComponent={<View style={{ gap: 5, marginBottom: 8 }}><T s={24} w="800">Riwayat Transaksi</T><T s={12} c={C.mute}>{rows.length} transaksi tersimpan di perangkat ini</T></View>}
      ListEmptyComponent={<Card style={{ alignItems: 'center', padding: 24, gap: 8 }}><T w="700">Belum ada transaksi</T><T s={12} c={C.mute}>Transaksi yang berhasil checkout akan muncul di sini.</T></Card>}
      renderItem={({ item }) => <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.8}>
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><T w="800">{item.id}</T><T c={C.green} w="800">{money(item.total || 0)}</T></View>
          <T s={11} c={C.mute}>{dateLabel(item.createdAt)}</T>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T s={12} c={C.mute}>{item.paymentMethod || 'CASH'} • {(item.items || []).reduce((n, line) => n + Number(line.qty || 0), 0)} item</T><T s={11} c={C.green}>Lihat detail ›</T></View>
        </Card>
      </TouchableOpacity>} />
    <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12, maxHeight: '82%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T s={20} w="800">Detail Transaksi</T><TouchableOpacity onPress={() => setSelected(null)}><T c={C.mute}>Tutup</T></TouchableOpacity></View>
          {selected && <>
            <T s={12} c={C.mute}>{selected.id} • {dateLabel(selected.createdAt)}</T>
            <T w="700">Metode pembayaran: {selected.paymentMethod || 'CASH'}</T>
            {(selected.items || []).map((line, i) => <View key={`${line.productId}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <View style={{ flex: 1 }}><T w="700">{line.name}</T><T s={11} c={C.mute}>{line.qty} × {money(line.price)}</T></View><T w="700">{money(line.subtotal ?? Number(line.price) * Number(line.qty))}</T>
            </View>)}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }}><T s={16} w="800">Total</T><T s={18} w="800" c={C.green}>{money(selected.total || 0)}</T></View>
            <Btn title="Tutup struk" onPress={() => setSelected(null)} />
          </>}
        </View>
      </View>
    </Modal>
  </>;
}
