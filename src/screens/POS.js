import React, { useCallback, useEffect, useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { C, rp } from '../theme';
import { Card, T } from '../ui';
import { api, sendOrder } from '../api';

import { IconPlus, IconMinus, IconAlert, IconSearch, IconArrowRight } from '../icons';

export default function POS() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.products()
      .then((p) => { setItems(p); setLoading(false); })
      .catch((e) => { setLoading(false); Alert.alert('Gagal', e.message); });
  }, []);

  const list = items.filter((p) => (p.name + p.sku).toLowerCase().includes(q.toLowerCase()));
  const lines = items.filter((p) => cart[p.id]);
  const total = lines.reduce((s, p) => s + Number(p.price) * cart[p.id], 0);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  const add = (p) => setCart((c) => ((c[p.id] || 0) < p.stock ? { ...c, [p.id]: (c[p.id] || 0) + 1 } : c));
  const sub = (p) => setCart((c) => {
    const qty = (c[p.id] || 0) - 1;
    if (qty <= 0) { const { [p.id]: _, ...rest } = c; return rest; }
    return { ...c, [p.id]: qty };
  });

  const pay = (method) => async () => {
    if (paying) return; // guard double submit
    setPaying(true);
    try {
      const store = (await api.stores())[0];
      const res = await sendOrder({
        storeId: store.id,
        paymentMethod: method,
        items: lines.map((p) => ({ productId: p.id, qty: cart[p.id] })),
      });
      setCart({});
      Alert.alert(
        res === 'queued' ? 'Tersimpan offline' : 'Berhasil',
        res === 'queued' ? 'Akan disinkronkan otomatis saat online.' : 'Transaksi tercatat.',
      );
    } catch (e) {
      Alert.alert('Gagal', e.message);
    } finally {
      setPaying(false);
    }
  };

  const checkout = () => {
    if (count === 0) return Alert.alert('Keranjang kosong', 'Tambahkan produk terlebih dahulu.');
    if (paying) return;
    Alert.alert(
      'Metode pembayaran',
      rp(total),
      [['Tunai', 'CASH'], ['QRIS', 'QRIS'], ['Kartu', 'CARD']].map(([text, m]) => ({ text, onPress: pay(m) })),
    );
  };

  const renderItem = useCallback(({ item: p }) => (
    <Card style={{ flex: 1, margin: 6, gap: 6 }}>
      {p.stock <= 10 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.amber, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
          <IconAlert size={11} color={C.bg} />
          <T s={10} w="800" c={C.bg}>{p.stock} LEFT</T>
        </View>
      )}
      <T w="700">{p.name}</T>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T w="700" c={C.green}>{rp(p.price)}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {cart[p.id] > 0 && (
            <TouchableOpacity
              onPress={() => sub(p)}
              accessibilityLabel={`Kurangi ${p.name}`}
              style={{ backgroundColor: C.line, borderRadius: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
            >
              <IconMinus size={16} color={C.red} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => add(p)}
            accessibilityLabel={`Tambah ${p.name}`}
            style={{ backgroundColor: C.line, borderRadius: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
          >
            {cart[p.id] ? (
              <T c={C.green} w="800">{cart[p.id]}</T>
            ) : (
              <IconPlus size={16} color={C.green} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  ), [cart]);

  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 8, gap: 12 }}>
        <T s={24} w="800">New Sale</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: C.line }}>
          <IconSearch size={18} color={C.mute} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Cari produk atau SKU…"
            placeholderTextColor={C.mute}
            accessibilityLabel="Cari produk"
            style={{ flex: 1, padding: 14, color: C.text, fontSize: 14 }}
          />
        </View>
      </View>
      <FlatList
        data={list}
        numColumns={2}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
        renderItem={renderItem}
        extraData={cart}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <T c={C.mute}>{q ? 'Produk tidak ditemukan' : 'Belum ada produk'}</T>
          </View>
        }
      />
      {count > 0 && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 12, backgroundColor: C.green, borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View><T s={10} c="#D1FAE5">TOTAL PAYABLE • {count} item</T><T s={20} w="800">{rp(total)}</T></View>
          <TouchableOpacity
            onPress={checkout}
            disabled={paying}
            accessibilityRole="button"
            accessibilityLabel="Checkout"
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 12,
              opacity: paying ? 0.5 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <T w="700" c={C.green}>{paying ? 'Memproses…' : 'Checkout'}</T>
            {!paying && <IconArrowRight size={16} color={C.green} />}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
