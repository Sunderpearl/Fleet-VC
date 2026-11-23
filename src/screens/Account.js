import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { C } from '../theme';
import { Card, T, Btn } from '../ui';
import { useAuth } from '../auth';
import { api } from '../api';
import { storage } from '../storage';
import { IconStore, IconAccount, IconAlert } from '../icons';
import { DEFAULT_USD_RATE } from '../money';

function SectionHeader({ icon, title, subtitle }) {
  const Icon = icon;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 }}>
    <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: '#064E3B', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={17} color={C.green} />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <T s={15} w="800">{title}</T>
      {!!subtitle && <T s={10} c={C.mute}>{subtitle}</T>}
    </View>
  </View>;
}

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
    if (!Number.isFinite(rate) || rate <= 0 || rate > 100000000) {
      setMessage('Kurs USD harus berupa angka lebih besar dari 0.'); setMessageError(true); return;
    }
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
      setMessage('Pengaturan berhasil disimpan di perangkat ini.');
      setMessageError(false);
    } catch (e) {
      setMessage(e.message || 'Gagal menyimpan perubahan.');
      setMessageError(true);
    } finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;

  const input = { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 13, color: C.text, borderWidth: 1, borderColor: C.line, fontSize: 14 };
  const label = (text) => <T s={10} w="800" c={C.mute}>{text}</T>;
  const initials = (name || user?.email || 'U').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
  const currencyChoice = (value, description) => {
    const active = currency === value;
    return <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: active }}
      onPress={() => { setCurrency(value); setMessage(''); }}
      style={{ flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: active ? C.green : C.line, backgroundColor: active ? '#064E3B' : C.bg, gap: 5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T s={15} w="800" c={active ? '#FFFFFF' : C.text}>{value}</T>
        {active && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green }} />}
      </View>
      <T s={9} c={active ? '#A7F3D0' : C.mute}>{description}</T>
    </TouchableOpacity>;
  };
  const thresholdOptions = ['5', '10', '20'];

  return <ScrollView contentContainerStyle={{ padding: 16, gap: 13, paddingBottom: 42 }} keyboardShouldPersistTaps="handled">
    <View style={{ gap: 4 }}>
      <T s={10} w="800" c={C.mute}>PREFERENSI DAN AKUN</T>
      <T s={24} w="800">Akun</T>
      <T s={11} c={C.mute}>Kelola profil, informasi toko, dan pengaturan operasional.</T>
    </View>

    <Card style={{ padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: '#064E3B', borderWidth: 1, borderColor: '#047857', alignItems: 'center', justifyContent: 'center' }}>
        <T s={19} w="800" c="#A7F3D0">{initials || 'U'}</T>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <T s={16} w="800">{name || 'Pengguna Fleet-VC'}</T>
        <T s={11} c={C.mute}>{user?.email || 'Email tidak tersedia'}</T>
        <View style={{ alignSelf: 'flex-start', backgroundColor: C.bg, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 }}>
          <T s={9} w="800" c={C.green}>{user?.role || 'OWNER'}</T>
        </View>
      </View>
    </Card>

    <Card style={{ gap: 12, padding: 15 }}>
      <SectionHeader icon={IconAccount} title="Profil pengguna" subtitle="Informasi akun yang sedang masuk." />
      {label('NAMA LENGKAP')}
      <TextInput value={name} onChangeText={(value) => { setName(value); setMessage(''); }} style={input} placeholder="Masukkan nama pengguna" placeholderTextColor={C.mute} returnKeyType="done" />
      {label('EMAIL')}
      <View style={{ ...input, justifyContent: 'center' }}><T s={13}>{user?.email || 'Email lokal'}</T></View>
      <T s={10} c={C.mute}>Email dan peran akun ditampilkan sebagai informasi. Perubahan nama disimpan ke profil akun lokal.</T>
    </Card>

    <Card style={{ gap: 12, padding: 15 }}>
      <SectionHeader icon={IconStore} title="Informasi toko" subtitle="Nama toko yang ditampilkan di dashboard." />
      {label('NAMA TOKO')}
      <TextInput value={storeName} onChangeText={(value) => { setStoreName(value); setMessage(''); }} style={input} placeholder="Contoh: Ambatukam Store" placeholderTextColor={C.mute} returnKeyType="done" />
      <View style={{ height: 1, backgroundColor: C.line, marginVertical: 2 }} />
      <View style={{ gap: 4 }}>
        <T s={12} w="800">Mata uang tampilan</T>
        <T s={10} c={C.mute}>Pilih mata uang untuk menampilkan harga dan laporan.</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        {currencyChoice('IDR', 'Rupiah Indonesia')}
        {currencyChoice('USD', 'Dolar AS')}
      </View>
      {currency === 'USD' && <View style={{ gap: 8, backgroundColor: C.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.line }}>
        {label('KURS KONVERSI MANUAL')}
        <T s={11} c={C.mute}>1 USD setara dengan berapa rupiah?</T>
        <TextInput value={exchangeRate} onChangeText={(value) => { setExchangeRate(value); setMessage(''); }} keyboardType="numeric" style={input} placeholder={String(DEFAULT_USD_RATE)} placeholderTextColor={C.mute} />
        <T s={10} c={C.mute}>Contoh: 16000 berarti US$1 = Rp16.000. Kurs ini tidak diperbarui otomatis dari pasar.</T>
      </View>}
    </Card>

    <Card style={{ gap: 12, padding: 15 }}>
      <SectionHeader icon={IconAlert} title="Peringatan stok" subtitle="Tentukan kapan produk ditandai sebagai stok menipis." />
      {label('BATAS STOK RENDAH')}
      <TextInput value={threshold} onChangeText={(value) => { setThreshold(value); setMessage(''); }} keyboardType="number-pad" style={input} placeholder="10" placeholderTextColor={C.mute} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T s={10} c={C.mute}>Pilih nilai cepat</T>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {thresholdOptions.map((value) => <TouchableOpacity key={value} onPress={() => { setThreshold(value); setMessage(''); }}
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: threshold === value ? '#064E3B' : C.bg, borderWidth: 1, borderColor: threshold === value ? C.green : C.line }}>
            <T s={10} w="700" c={threshold === value ? '#A7F3D0' : C.mute}>{value}</T>
          </TouchableOpacity>)}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: C.bg, borderRadius: 10, padding: 10 }}>
        <IconAlert size={13} color={C.amber} />
        <T s={10} c={C.mute} style={{ flex: 1 }}>Produk dengan jumlah stok pada atau di bawah batas ini akan ditandai untuk diperiksa.</T>
      </View>
    </Card>

    {!!message && <View style={{ backgroundColor: messageError ? '#451A1A' : '#064E3B', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: messageError ? '#7F1D1D' : '#047857' }}>
      <T s={12} w="700" c={messageError ? '#FCA5A5' : '#A7F3D0'}>{message}</T>
    </View>}
    <Btn title={saving ? 'Menyimpan perubahan…' : 'Simpan semua perubahan'} disabled={saving} onPress={save} />
    {!confirmLogout ? <Btn ghost title="Keluar dari akun" onPress={() => setConfirmLogout(true)} /> :
      <Card style={{ gap: 10, borderColor: C.red }}>
        <T w="800">Keluar dari Fleet-VC?</T>
        <T s={11} c={C.mute}>Anda perlu masuk kembali untuk mengakses toko ini.</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Btn ghost title="Tetap masuk" onPress={() => setConfirmLogout(false)} /></View>
          <View style={{ flex: 1 }}><Btn title="Ya, keluar" onPress={logout} /></View>
        </View>
      </Card>}
    <T s={10} c={C.mute} style={{ textAlign: 'center' }}>Pengaturan disimpan secara lokal di perangkat ini. Kurs USD merupakan nilai manual untuk prototipe.</T>
  </ScrollView>;
}
