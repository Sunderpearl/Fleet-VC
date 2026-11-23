import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View, Alert, ActivityIndicator, RefreshControl, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { C } from '../theme';
import { useStoreSettings } from '../money';
import { Card, T, Btn } from '../ui';
import { api } from '../api';
import { IconInventory, IconAlert } from '../icons';

const emptyForm = { name: '', sku: '', price: '', stock: '', lowStockAt: '10' };
const fieldStyle = { backgroundColor: C.bg, color: C.text, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, marginTop: 6 };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const { money } = useStoreSettings();

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await api.products();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Gagal memuat produk.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (product) => {
    setEditingId(product.id);
    setForm({ name: product.name || '', sku: product.sku || '', price: String(product.price ?? ''), stock: String(product.stock ?? ''), lowStockAt: String(product.lowStockAt ?? 10) });
    setModalOpen(true);
  };
  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    const name = form.name.trim();
    const sku = form.sku.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);
    const lowStockAt = Number(form.lowStockAt);
    if (!name || !sku || form.price === '' || form.stock === '') return Alert.alert('Data belum lengkap', 'Nama, SKU, harga, dan stok wajib diisi.');
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(lowStockAt) || lowStockAt < 0) {
      return Alert.alert('Data tidak valid', 'Harga harus angka positif. Stok dan batas stok minimum harus bilangan bulat ≥ 0.');
    }
    if (items.some((p) => String(p.sku).toLowerCase() === sku.toLowerCase() && p.id !== editingId)) {
      return Alert.alert('SKU sudah digunakan', 'Gunakan SKU yang berbeda untuk setiap produk.');
    }
    setSaving(true);
    try {
      const next = editingId
        ? items.map((p) => p.id === editingId ? { ...p, name, sku, price, stock, lowStockAt } : p)
        : [{ id: `prd-${Date.now()}`, name, sku, price, stock, lowStockAt }, ...items];
      await api.saveProducts(next);
      setItems(next);
      setModalOpen(false);
      setForm(emptyForm);
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Perubahan produk tidak dapat disimpan.');
    } finally { setSaving(false); }
  };

  const remove = (product) => Alert.alert('Hapus produk?', `Produk "${product.name}" akan dihapus dari inventaris.`, [
    { text: 'Batal', style: 'cancel' },
    { text: 'Hapus', style: 'destructive', onPress: async () => {
      try {
        const next = items.filter((p) => p.id !== product.id);
        await api.saveProducts(next);
        setItems(next);
      } catch (e) { Alert.alert('Gagal menghapus', e.message || 'Coba lagi.'); }
    }},
  ]);

  const adjustStock = async (product, delta) => {
    const stock = Math.max(0, Number(product.stock || 0) + delta);
    const next = items.map((p) => p.id === product.id ? { ...p, stock } : p);
    try { await api.saveProducts(next); setItems(next); }
    catch (e) { Alert.alert('Gagal memperbarui stok', e.message || 'Coba lagi.'); }
  };

  const filtered = items.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <>
      <FlatList
        data={filtered}
        keyExtractor={(p) => String(p.id)}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.green} colors={[C.green]} />}
        ListHeaderComponent={<View style={{ gap: 12, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconInventory size={26} color={C.green} /><T s={24} w="800">Inventory</T>
            <View style={{ flex: 1 }} /><T s={12} c={C.mute}>{items.length} produk</T>
          </View>
          <TextInput value={query} onChangeText={setQuery} placeholder="Cari nama produk atau SKU..." placeholderTextColor={C.mute} style={fieldStyle} />
          <Btn title="+ Tambah Produk" onPress={openNew} />
          {!!error && <T c={C.red}>{error}</T>}
        </View>}
        contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 28 }}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: 40 }}><T c={C.mute}>{query ? 'Produk tidak ditemukan.' : 'Belum ada produk.'}</T></View>}
        renderItem={({ item: product }) => {
          const low = Number(product.stock) <= Number(product.lowStockAt ?? 10);
          return <Card style={{ gap: 12, borderLeftWidth: low ? 4 : 1, borderLeftColor: low ? C.amber : C.line }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <T w="700">{product.name}</T><T s={11} c={C.mute}>{product.sku} • {money(Number(product.price || 0))}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  {low && <IconAlert size={14} color={C.amber} />}<T w="800" c={low ? C.amber : C.green}>{product.stock} pcs</T>
                  {low && <T s={11} c={C.amber}>Stok menipis</T>}
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <TouchableOpacity onPress={() => adjustStock(product, -1)} style={{ backgroundColor: C.bg, borderColor: C.line, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 }}><T w="800">−</T></TouchableOpacity>
                <TouchableOpacity onPress={() => adjustStock(product, 1)} style={{ backgroundColor: C.bg, borderColor: C.line, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 }}><T w="800">+</T></TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => openEdit(product)} style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center' }}><T s={12} w="700" c={C.green}>Edit</T></TouchableOpacity>
              <TouchableOpacity onPress={() => remove(product)} style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center' }}><T s={12} w="700" c={C.red}>Hapus</T></TouchableOpacity>
            </View>
          </Card>;
        }}
      />
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T s={20} w="800">{editingId ? 'Edit Produk' : 'Tambah Produk'}</T>
              <TouchableOpacity onPress={() => setModalOpen(false)}><T s={14} c={C.mute}>Tutup</T></TouchableOpacity>
            </View>
            {[
              ['name', 'Nama produk', 'Contoh: Kopi Susu'],
              ['sku', 'SKU', 'Contoh: SKU-0001'],
              ['price', 'Harga (Rupiah)', 'Contoh: 25000'],
              ['stock', 'Jumlah stok', 'Contoh: 20'],
              ['lowStockAt', 'Batas peringatan stok', 'Default: 10'],
            ].map(([key, label, placeholder]) => <View key={key}>
              <T s={12} w="700" c={C.mute}>{label}</T>
              <TextInput value={form[key]} onChangeText={(v) => updateField(key, v)} placeholder={placeholder} placeholderTextColor={C.mute}
                keyboardType={['price', 'stock', 'lowStockAt'].includes(key) ? 'numeric' : 'default'}
                autoCapitalize={key === 'sku' ? 'characters' : 'sentences'} style={fieldStyle} />
            </View>)}
            <Btn title={saving ? 'Menyimpan...' : 'Simpan Produk'} onPress={save} disabled={saving} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
