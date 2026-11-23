import React, { useCallback, useEffect, useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { C } from '../theme';
import { useStoreSettings } from '../money';
import { Card, T } from '../ui';
import { api, sendOrder } from '../api';
import { IconPlus, IconMinus, IconAlert, IconSearch, IconArrowRight } from '../icons';

export default function POS() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const { money } = useStoreSettings();

  const loadProducts = useCallback(async () => {
    const products = await api.products();
    setItems(Array.isArray(products) ? products : []);
  }, []);

  useEffect(() => {
    loadProducts().catch((e) => setNotice(e.message || 'Gagal memuat produk')).finally(() => setLoading(false));
  }, [loadProducts]);

  const list = items.filter((p) => `${p.name || ''} ${p.sku || ''}`.toLowerCase().includes(q.toLowerCase()));
  const lines = items.filter((p) => cart[p.id]);
  const total = lines.reduce((s, p) => s + Number(p.price || 0) * cart[p.id], 0);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  const add = (p) => {
    if (Number(cart[p.id] || 0) >= Number(p.stock || 0)) {
      setNotice(`Stok ${p.name} tidak mencukupi.`);
      return;
    }
    setNotice('');
    setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));
  };
  const sub = (p) => setCart((c) => {
    const qty = (c[p.id] || 0) - 1;
    if (qty <= 0) { const { [p.id]: _, ...rest } = c; return rest; }
    return { ...c, [p.id]: qty };
  });

  const pay = async (method) => {
    if (paying || !count) return;
    setPaying(true);
    setNotice('');
    try {
      const stores = await api.stores();
      const store = stores?.[0] || { id: 's1' };
      const result = await sendOrder({
        storeId: store.id,
        paymentMethod: method,
        items: lines.map((p) => ({ productId: p.id, qty: cart[p.id] })),
      });
      setCart({});
      setPaymentOpen(false);
      await loadProducts();
      setNotice(result === 'queued'
        ? 'Transaksi masuk antrean offline dan menunggu koneksi.'
        : `Pembayaran ${method} berhasil dicatat • ${money(total)}.`);
    } catch (e) {
      setNotice(e.message || 'Checkout gagal. Silakan coba lagi.');
    } finally {
      setPaying(false);
    }
  };

  const renderItem = useCallback(({ item: p }) => (
    <Card style={{ flex: 1, margin: 6, gap: 6, opacity: Number(p.stock) <= 0 ? 0.5 : 1 }}>
      {Number(p.stock) <= 10 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.amber, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
          <IconAlert size={11} color={C.bg} />
          <T s={10} w="800" c={C.bg}>{p.stock} LEFT</T>
        </View>
      )}
      <T w="700">{p.name}</T>
      <T s={10} c={C.mute}>{p.sku}</T>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T w="700" c={C.green}>{money(p.price)}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {cart[p.id] > 0 && <TouchableOpacity onPress={() => sub(p)} style={{ backgroundColor: C.line, borderRadius: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}><IconMinus size={16} color={C.red} /></TouchableOpacity>}
          <TouchableOpacity onPress={() => add(p)} disabled={Number(p.stock) <= 0} style={{ backgroundColor: C.line, borderRadius: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            {cart[p.id] ? <T c={C.green} w="800">{cart[p.id]}</T> : <IconPlus size={16} color={C.green} />}
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
          <TextInput value={q} onChangeText={setQ} placeholder="Cari produk atau SKU…" placeholderTextColor={C.mute} accessibilityLabel="Cari produk" style={{ flex: 1, padding: 14, color: C.text, fontSize: 14 }} />
        </View>
        <T s={11} c={C.mute}>{items.length} produk tersedia • {count} item di keranjang</T>
        {!!notice && <T s={11} c={notice.includes('berhasil') ? C.green : C.amber}>{notice}</T>}
      </View>
      <FlatList data={list} numColumns={2} keyExtractor={(p) => String(p.id)} contentContainerStyle={{ padding: 14, paddingBottom: 110 }} renderItem={renderItem} extraData={cart}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: 40 }}><T c={C.mute}>{q ? 'Produk tidak ditemukan' : 'Belum ada produk'}</T></View>} />
      {count > 0 && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 12, backgroundColor: C.green, borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View><T s={10} c="#D1FAE5">TOTAL PAYABLE • {count} item</T><T s={20} w="800">{money(total)}</T></View>
          <TouchableOpacity onPress={() => { setNotice(''); setPaymentOpen(true); }} disabled={paying} style={{ backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, opacity: paying ? 0.5 : 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T w="700" c={C.green}>Checkout</T><IconArrowRight size={16} color={C.green} />
          </TouchableOpacity>
        </View>
      )}
      <Modal visible={paymentOpen} transparent animationType="slide" onRequestClose={() => !paying && setPaymentOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, gap: 14, borderWidth: 1, borderColor: C.line }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T s={20} w="800">Metode Pembayaran</T>
              <TouchableOpacity disabled={paying} onPress={() => setPaymentOpen(false)}><T c={C.mute}>Tutup</T></TouchableOpacity>
            </View>
            <T s={12} c={C.mute}>{count} item dalam keranjang</T>
            <T s={26} w="800" c={C.green}>{money(total)}</T>
            {[
              { key: 'CASH', title: 'Tunai', subtitle: 'Pembayaran cash di kasir' },
              { key: 'QRIS', title: 'QRIS', subtitle: 'Catat pembayaran QRIS' },
              { key: 'CARD', title: 'Kartu', subtitle: 'Catat pembayaran kartu' },
            ].map((m) => (
              <TouchableOpacity key={m.key} disabled={paying} onPress={() => pay(m.key)} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: paying ? 0.55 : 1 }}>
                <View><T w="800">{m.title}</T><T s={11} c={C.mute}>{m.subtitle}</T></View>
                <T c={C.green} w="800">{paying ? 'Memproses…' : 'Pilih ›'}</T>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
