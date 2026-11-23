import React, { useEffect, useState } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { C } from '../theme';
import { Card, T, Btn } from '../ui';
import { useAuth } from '../auth';
import { api } from '../api';
import { storage } from '../storage';
import { IconStore, IconAccount, IconAlert } from '../icons';
import { DEFAULT_USD_RATE } from '../money';

export default function Account() {
  const { user, logout, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [storeName, setStoreName] = useState('Fleet Demo Store');
  const [currency, setCurrency] = useState('IDR');
  const [exchangeRate, setExchangeRate] = useState(String(DEFAULT_USD_RATE));
  const [threshold, setThreshold] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stores = await api.stores();
        const store = stores?.[0];
        const settingsRaw = await storage.getItem('fleet_settings');
        const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
        if (!active) return;
        if (store) {
          setStoreName(store.name || 'Fleet Demo Store');
          setCurrency(store.currency || 'IDR');
          setExchangeRate(String(store.exchangeRate || DEFAULT_USD_RATE));
        }
        if (settings.lowStockThreshold != null) setThreshold(String(settings.lowStockThreshold));
      } catch (e) {
        if (active) { setMessage(e.message || 'Gagal memuat pengaturan.'); setMessageError(true); }
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const save = async () => {
    const parsed = Number(threshold);
    if (!name.trim() || !storeName.trim()) {
      setMessage('Nama pengguna dan nama toko wajib diisi.'); setMessageError(true); return;
    }
    const rate = Number(exchangeRate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 100000000) { setMessage('Kurs USD harus berupa angka lebih besar dari 0.'); setMessageError(true); return; }
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 9999) {
      setMessage('Batas stok harus berupa angka 0–9999.'); setMessageError(true); return;
    }
    setSaving(true); setMessage('');
    try {
      await updateProfile({ name: name.trim() });
      const stores = await api.stores();
      const first = stores?.[0] || { id: 's1' };
      if (typeof api.saveStores !== 'function') throw new Error('Penyimpanan toko hanya tersedia pada mode lokal.');
      await api.saveStores([{ ...first, name: storeName.trim(), currency, exchangeRate: rate }]);
      await storage.setItem('fleet_settings', JSON.stringify({ lowStockThreshold: parsed }));
      setMessage('Perubahan berhasil disimpan di perangkat ini.'); setMessageError(false);
    } catch (e) {
      setMessage(e.message || 'Gagal menyimpan perubahan.'); setMessageError(true);
    } finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;

  const input = { backgroundColor: C.bg, borderRadius: 12, padding: 13, color: C.text, borderWidth: 1, borderColor: C.line, fontSize: 14 };
  const label = (text) => <T s={11} w="700" c={C.mute}>{text}</T>;
  const currencyChoice = (value) => {
    const active = currency === value;
    return <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { setCurrency(value); setMessage(''); }} style={{ flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: active ? C.green : C.line, backgroundColor: active ? '#064E3B' : C.bg, alignItems: 'center' }}><T w="700" c={active ? '#FFFFFF' : C.mute}>{value}</T></TouchableOpacity>;
  };

  return <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><IconAccount size={24} color={C.green} /><T s={24} w="800">Akun & Pengaturan</T></View>
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><IconAccount size={18} color={C.green} /><T s={16} w="800">Profil Pengguna</T></View>
      {label('NAMA PENGGUNA')}
      <TextInput value={name} onChangeText={setName} style={input} placeholder="Nama pengguna" placeholderTextColor={C.mute} />
      {label('EMAIL')}
      <View style={{ ...input, justifyContent: 'center' }}><T>{user?.email || 'Email lokal'}</T></View>
      {label('ROLE')}
      <View style={{ ...input, justifyContent: 'center' }}><T>{user?.role || 'OWNER'}</T></View>
    </Card>
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><IconStore size={18} color={C.green} /><T s={16} w="800">Informasi Toko</T></View>
      {label('NAMA TOKO')}
      <TextInput value={storeName} onChangeText={setStoreName} style={input} placeholder="Nama toko" placeholderTextColor={C.mute} />
      {label('MATA UANG')}
      <View style={{ flexDirection: 'row', gap: 8 }}>{['IDR', 'USD'].map(currencyChoice)}</View>
      {currency === 'USD' && <>
        {label('KURS KONVERSI USD (1 USD = BERAPA IDR)')}
        <TextInput value={exchangeRate} onChangeText={setExchangeRate} keyboardType="numeric" style={input} placeholder={String(DEFAULT_USD_RATE)} placeholderTextColor={C.mute} />
        <T s={10} c={C.mute}>Kurs manual untuk prototipe. Contoh: 16000 berarti US$1 = Rp16.000. Bukan kurs pasar real-time.</T>
      </>}
      {label('BATAS PERINGATAN STOK RENDAH')}
      <TextInput value={threshold} onChangeText={setThreshold} keyboardType="number-pad" style={input} placeholder="10" placeholderTextColor={C.mute} />
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><IconAlert size={14} color={C.amber} /><T s={10} c={C.mute}>Produk dengan stok pada atau di bawah angka ini dianggap stok rendah.</T></View>
    </Card>
    {!!message && <View style={{ backgroundColor: messageError ? '#451A1A' : '#064E3B', borderRadius: 12, padding: 12 }}><T s={12} c={messageError ? '#FCA5A5' : '#A7F3D0'}>{message}</T></View>}
    <Btn title={saving ? 'Menyimpan…' : 'Simpan Pengaturan'} disabled={saving} onPress={save} />
    {!confirmLogout ? <Btn ghost title="Keluar dari Akun" onPress={() => setConfirmLogout(true)} /> :
      <Card style={{ gap: 10 }}><T w="700">Yakin ingin keluar dari Fleet-VC?</T><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Btn ghost title="Batal" onPress={() => setConfirmLogout(false)} /></View><View style={{ flex: 1 }}><Btn title="Ya, Keluar" onPress={logout} /></View></View></Card>}
    <T s={10} c={C.mute} style={{ textAlign: 'center' }}>Pengaturan disimpan secara lokal di perangkat ini. Kurs USD adalah kurs manual yang dapat Anda ubah kapan saja.</T>
  </ScrollView>;
}
