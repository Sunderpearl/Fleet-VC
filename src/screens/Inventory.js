import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View, Alert, ActivityIndicator, RefreshControl, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { C } from '../theme';
import { useStoreSettings } from '../money';
import { Card, T, Btn } from '../ui';
import { api } from '../api';
import { IconInventory, IconAlert } from '../icons';

const emptyForm = { name: '', sku: '', price: '', stock: '' };
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
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const { money, lowStockThreshold } = useStoreSettings();

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
    setForm({ name: product.name || '', sku: product.sku || '', price: String(product.price ?? ''), stock: String(product.stock ?? '') });
    setModalOpen(true);
  };
  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    const name = form.name.trim();
    const sku = form.sku.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!name || !sku || form.price === '' || form.stock === '') return Alert.alert('Data belum lengkap', 'Nama, SKU, harga, dan stok wajib diisi.');
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      return Alert.alert('Data tidak valid', 'Harga harus angka positif dan stok harus bilangan bulat ≥ 0.');
    }
    if (items.some((p) => String(p.sku).toLowerCase() === sku.toLowerCase() && p.id !== editingId)) {
      return Alert.alert('SKU sudah digunakan', 'Gunakan SKU yang berbeda untuk setiap produk.');
    }
    setSaving(true);
    try {
      const next = editingId
        ? items.map((p) => p.id === editingId ? { ...p, name, sku, price, stock } : p)
        : [{ id: `prd-${Date.now()}`, name, sku, price, stock }, ...items];
      await api.saveProducts(next);
      setItems(next);
      setModalOpen(false);
      setForm(emptyForm);
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Perubahan produk tidak dapat disimpan.');
    } finally { setSaving(false); }
  };

  const remove = (product) => {
    setFeedback('');
    setDeleteTarget(product);
  };

  const confirmRemove = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setFeedback('');
    try {
      const next = items.filter((p) => String(p.id) !== String(deleteTarget.id));
      await api.saveProducts(next);
      setItems(next);
      setDeleteTarget(null);
      setFeedback(`Produk "${deleteTarget.name}" berhasil dihapus.`);
    } catch (e) {
      setFeedback(e.message || 'Produk gagal dihapus. Coba lagi.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const adjustStock = async (product, delta) => {
    const stock = Math.max(0, Number(product.stock || 0) + delta);
    const next = items.map((p) => p.id === product.id ? { ...p, stock } : p);
    try { await api.saveProducts(next); setItems(next); }
    catch (e) { Alert.alert('Gagal memperbarui stok', e.message || 'Coba lagi.'); }
  };

  const filtered = items
    .filter((p) => {
      const stock = Number(p.stock || 0);
      const lowAt = Number(lowStockThreshold);
      const matchesQuery = `${p.name} ${p.sku}`.toLowerCase().includes(query.trim().toLowerCase());
      const matchesStock = stockFilter === 'all' || (stockFilter === 'low' && stock > 0 && stock <= lowAt) || (stockFilter === 'out' && stock <= 0);
      return matchesQuery && matchesStock;
    })
    .sort((a, b) => {
      if (sortBy === 'stock') return Number(a.stock || 0) - Number(b.stock || 0);
      if (sortBy === 'price') return Number(b.price || 0) - Number(a.price || 0);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  const lowCount = items.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(lowStockThreshold)).length;
  const outCount = items.filter((p) => Number(p.stock || 0) <= 0).length;
  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <>
      <FlatList
        data={filtered}
        keyExtractor={(p) => String(p.id)}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.green} colors={[C.green]} />}
        ListHeaderComponent={<View style={{ gap: 13, marginBottom: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconInventory size={25} color={C.green} />
            <View style={{ flex: 1, gap: 2 }}>
              <T s={23} w="800">Inventaris</T>
              <T s={11} c={C.mute}>Kelola produk dan ketersediaan stok.</T>
            </View>
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, alignItems: 'center' }}>
              <T s={16} w="800" c={C.green}>{items.length}</T><T s={9} c={C.mute}>PRODUK</T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 10 }}>
              <T s={10} c={C.mute}>Stok menipis</T><T s={18} w="800" c={C.amber}>{lowCount}</T>
            </View>
            <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 10 }}>
              <T s={10} c={C.mute}>Stok habis</T><T s={18} w="800" c={outCount > 0 ? C.red : C.green}>{outCount}</T>
            </View>
          </View>
          <TextInput value={query} onChangeText={setQuery} placeholder="Cari nama produk atau SKU..." placeholderTextColor={C.mute} returnKeyType="search" style={fieldStyle} />
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {[['all', 'Semua'], ['low', `Menipis (${lowCount})`], ['out', `Habis (${outCount})`]].map(([key, label]) => (
              <TouchableOpacity key={key} onPress={() => setStockFilter(key)} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', backgroundColor: stockFilter === key ? C.green : C.card, borderWidth: 1, borderColor: stockFilter === key ? C.green : C.line }}>
                <T s={11} w="700" c={stockFilter === key ? '#06281F' : C.mute}>{label}</T>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T s={11} c={C.mute}>Urutkan:</T>
            {[['name', 'Nama'], ['stock', 'Stok'], ['price', 'Harga']].map(([key, label]) => (
              <TouchableOpacity key={key} onPress={() => setSortBy(key)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: sortBy === key ? C.line : 'transparent' }}>
                <T s={11} w={sortBy === key ? '800' : '500'} c={sortBy === key ? C.text : C.mute}>{label}</T>
              </TouchableOpacity>
            ))}
            <View style={{ flex: 1 }} />
            <T s={10} c={C.mute}>{filtered.length} hasil</T>
          </View>
          <Btn title="+ Tambah Produk" onPress={openNew} />
          {!!feedback && <View style={{ backgroundColor: feedback.includes('berhasil') ? '#064E3B' : '#451A1A', borderRadius: 10, padding: 11 }}>
            <T s={11} w="700" c={feedback.includes('berhasil') ? '#A7F3D0' : '#FCA5A5'}>{feedback}</T>
          </View>}
          {!!error && <T c={C.red}>{error}</T>}
        </View>}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, gap: 9, paddingBottom: 32 }}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: 40 }}><T c={C.mute}>{query || stockFilter !== 'all' ? 'Tidak ada produk yang cocok. Coba ubah pencarian atau filter.' : 'Belum ada produk. Tambahkan produk pertama untuk mulai berjualan.'}</T></View>}
        renderItem={({ item: product }) => {
          const stock = Number(product.stock || 0);
          const low = stock > 0 && stock <= Number(lowStockThreshold);
          const out = stock <= 0;
          return <Card style={{ padding: 13, gap: 10, borderLeftWidth: low || out ? 4 : 1, borderLeftColor: out ? C.red : low ? C.amber : C.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <T s={14} w="800">{product.name}</T>
                <T s={10} c={C.mute}>{product.sku}</T>
                <T s={13} w="700" c={C.green}>{money(Number(product.price || 0))}</T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <T s={17} w="800" c={out ? C.red : low ? C.amber : C.text}>{stock} <T s={10} c={C.mute}>unit</T></T>
                <T s={10} w="700" c={out ? C.red : low ? C.amber : C.green}>{out ? 'STOK HABIS' : low ? 'STOK MENIPIS' : 'TERSEDIA'}</T>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Kurangi stok ${product.name}`} onPress={() => adjustStock(product, -1)} disabled={stock <= 0}
                  style={{ width: 34, height: 32, borderRadius: 9, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', opacity: stock <= 0 ? 0.4 : 1 }}><T s={17} w="700">−</T></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Tambah stok ${product.name}`} onPress={() => adjustStock(product, 1)}
                  style={{ width: 34, height: 32, borderRadius: 9, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}><T s={17} w="800" c="#06281F">+</T></TouchableOpacity>
                <T s={10} c={C.mute}>Atur stok</T>
              </View>
              <View style={{ flexDirection: 'row', gap: 7 }}>
                <TouchableOpacity onPress={() => openEdit(product)} style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line }}><T s={11} w="700" c={C.green}>Ubah</T></TouchableOpacity>
                <TouchableOpacity onPress={() => remove(product)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line }}><T s={11} w="700" c={C.red}>Hapus</T></TouchableOpacity>
              </View>
            </View>
          </Card>;
        }}
      />
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => !deleteBusy && setDeleteTarget(null)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.72)' }}>
          <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 20, gap: 13 }}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: '#451A1A', alignItems: 'center', justifyContent: 'center' }}>
              <IconAlert size={20} color={C.red} />
            </View>
            <View style={{ gap: 5 }}>
              <T s={19} w="800">Hapus produk?</T>
              <T s={12} c={C.mute}>Produk <T s={12} w="800">{deleteTarget?.name || ''}</T> akan dihapus dari inventaris. Tindakan ini tidak bisa dibatalkan.</T>
            </View>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <TouchableOpacity disabled={deleteBusy} onPress={() => setDeleteTarget(null)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, opacity: deleteBusy ? 0.5 : 1 }}>
                <T s={12} w="700">Batal</T>
              </TouchableOpacity>
              <TouchableOpacity disabled={deleteBusy} onPress={confirmRemove}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center', backgroundColor: C.red, opacity: deleteBusy ? 0.6 : 1 }}>
                <T s={12} w="800" c="#FFFFFF">{deleteBusy ? 'Menghapus...' : 'Ya, hapus produk'}</T>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, gap: 3 }}><T s={20} w="800">{editingId ? 'Ubah Produk' : 'Tambah Produk'}</T><T s={11} c={C.mute}>Lengkapi informasi produk dan jumlah stoknya.</T></View>
              <TouchableOpacity onPress={() => setModalOpen(false)}><T s={14} c={C.mute}>Tutup</T></TouchableOpacity>
            </View>
            {[
              ['name', 'Nama produk', 'Contoh: Kopi Susu'],
              ['sku', 'SKU', 'Contoh: SKU-0001'],
              ['price', 'Harga jual', 'Contoh: 25000'],
              ['stock', 'Jumlah stok awal', 'Contoh: 20'],
            ].map(([key, label, placeholder]) => <View key={key}>
              <T s={12} w="700" c={C.mute}>{label}</T>
              <TextInput value={form[key]} onChangeText={(v) => updateField(key, v)} placeholder={placeholder} placeholderTextColor={C.mute}
                keyboardType={['price', 'stock'].includes(key) ? 'numeric' : 'default'}
                autoCapitalize={key === 'sku' ? 'characters' : 'sentences'} style={fieldStyle} />
            </View>)}
            <Btn title={saving ? 'Menyimpan...' : 'Simpan Produk'} onPress={save} disabled={saving} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
