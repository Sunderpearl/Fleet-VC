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
  const [cartOpen, setCartOpen] = useState(false);
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

  const renderItem = useCallback(({ item: p }) => {
    const qty = Number(cart[p.id] || 0);
    const stock = Number(p.stock || 0);
    const low = stock > 0 && stock <= Number(p.lowStockAt ?? 10);
    return (
      <Card style={{ padding: 14, gap: 10, opacity: stock <= 0 ? 0.55 : 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1, gap: 5 }}>
            <T s={14} w="800">{p.name}</T>
            <T s={10} c={C.mute}>{p.sku}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              {low && <IconAlert size={12} color={C.amber} />}
              <T s={11} c={stock <= 0 ? C.red : low ? C.amber : C.mute} w={low || stock <= 0 ? '700' : '400'}>
                {stock <= 0 ? 'Stok habis' : low ? `Stok menipis · ${stock} tersisa` : `${stock} tersedia`}
              </T>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 7 }}>
            <T s={15} w="800" c={C.green}>{money(p.price)}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {qty > 0 && (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Kurangi ${p.name}`} onPress={() => sub(p)}
                  style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
                  <IconMinus size={15} color={C.text} />
                </TouchableOpacity>
              )}
              {qty > 0 && <T s={13} w="800">{qty}</T>}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Tambah ${p.name}`} onPress={() => add(p)} disabled={stock <= qty}
                style={{ minWidth: 36, height: 34, paddingHorizontal: 10, borderRadius: 10, backgroundColor: stock <= qty ? C.line : C.green, alignItems: 'center', justifyContent: 'center', opacity: stock <= qty ? 0.55 : 1 }}>
                <IconPlus size={16} color={stock <= qty ? C.mute : '#06281F'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Card>
    );
  }, [cart, items, money]);

  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 3 }}>
            <T s={23} w="800">Buat Transaksi</T>
            <T s={11} c={C.mute}>Pilih produk untuk ditambahkan ke keranjang.</T>
          </View>
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, alignItems: 'center' }}>
            <T s={16} w="800" c={C.green}>{count}</T>
            <T s={9} c={C.mute}>UNIT</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 13, paddingHorizontal: 13, borderWidth: 1, borderColor: C.line }}>
          <IconSearch size={18} color={C.mute} />
          <TextInput value={q} onChangeText={setQ} placeholder="Cari nama produk atau SKU..." placeholderTextColor={C.mute} accessibilityLabel="Cari produk" returnKeyType="search" style={{ flex: 1, padding: 13, color: C.text, fontSize: 14 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T s={11} c={C.mute}>{list.length} dari {items.length} produk</T>
          <T s={11} c={C.mute}>Harga dalam mata uang toko</T>
        </View>
        {!!notice && <View style={{ backgroundColor: notice.includes('berhasil') ? '#064E3B' : '#422006', borderRadius: 10, padding: 10 }}><T s={11} c={notice.includes('berhasil') ? '#A7F3D0' : '#FDE68A'}>{notice}</T></View>}
      </View>
      <FlatList data={list} keyExtractor={(p) => String(p.id)} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 130, gap: 9 }} renderItem={renderItem} extraData={cart}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: 40 }}><T c={C.mute}>{q ? 'Produk tidak ditemukan' : 'Belum ada produk'}</T></View>} />
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 10, backgroundColor: count > 0 ? C.green : C.card, borderWidth: count > 0 ? 0 : 1, borderColor: C.line, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T s={10} c={count > 0 ? '#D1FAE5' : C.mute} w="700">{count > 0 ? `KERANJANG · ${count} UNIT` : 'KERANJANG KOSONG'}</T>
          <T s={19} w="800" c={count > 0 ? '#06281F' : C.text}>{money(total)}</T>
        </View>
        <TouchableOpacity onPress={() => { setNotice(''); setCartOpen(true); }} disabled={paying || count === 0}
          style={{ backgroundColor: count > 0 ? '#FFFFFF' : C.line, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 11, opacity: count > 0 && !paying ? 1 : 0.65, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T w="700" c={count > 0 ? C.green : C.mute}>{count > 0 ? 'Periksa pesanan' : 'Pilih produk'}</T>
          <IconArrowRight size={15} color={count > 0 ? C.green : C.mute} />
        </TouchableOpacity>
      </View>
      <Modal visible={cartOpen} transparent animationType="slide" onRequestClose={() => setCartOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, gap: 14, borderWidth: 1, borderColor: C.line, maxHeight: '82%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View><T s={20} w="800">Keranjang</T><T s={11} c={C.mute}>{count} unit · Periksa pesanan sebelum bayar</T></View>
              <TouchableOpacity onPress={() => setCartOpen(false)}><T c={C.mute}>Tutup</T></TouchableOpacity>
            </View>
            <FlatList data={lines} keyExtractor={(item) => String(item.id)} style={{ flexGrow: 0 }} renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <View style={{ flex: 1, gap: 3 }}><T w="700">{item.name}</T><T s={11} c={C.mute}>{money(item.price)} per unit</T></View>
                <TouchableOpacity onPress={() => sub(item)} accessibilityLabel={`Kurangi ${item.name}`} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><IconMinus color={C.text} size={16}/></TouchableOpacity>
                <T w="800">{cart[item.id]}</T>
                <TouchableOpacity onPress={() => add(item)} accessibilityLabel={`Tambah ${item.name}`} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><IconPlus color={C.green} size={16}/></TouchableOpacity>
              </View>
            )} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}><T s={14} w="700">Total pesanan</T><T s={22} w="800" c={C.green}>{money(total)}</T></View>
            <TouchableOpacity disabled={!count} onPress={() => { setCartOpen(false); setPaymentOpen(true); }} style={{ backgroundColor: C.green, borderRadius: 14, padding: 15, alignItems: 'center', opacity: count ? 1 : 0.5 }}><T w="800" c="#06281F">Lanjut ke pembayaran</T></TouchableOpacity>
          </View>
        </View>
      </Modal>
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
