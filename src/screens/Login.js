import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme';
import { Btn, T } from '../ui';
import { useAuth } from '../auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

import { IconZap, IconCrown, IconCashier, IconEye, IconEyeOff, IconGoogle, IconFingerprint } from '../icons';

export default function Login() {
  const { signIn, signUp, google, biometric } = useAuth();
  const [role, setRole] = useState('OWNER');
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = (fn) => async () => {
    if (busy) return; // guard double-tap
    setBusy(true);
    try { await fn(); }
    catch (e) { Alert.alert('Gagal', e.message); }
    finally { setBusy(false); }
  };

  const handleSignIn = () => {
    const trimmed = email.trim();
    if (registering && !name.trim()) return Alert.alert('Validasi', 'Masukkan nama.');
    if (!trimmed) return Alert.alert('Validasi', 'Masukkan email.');
    if (!EMAIL_RE.test(trimmed)) return Alert.alert('Validasi', 'Format email tidak valid.');
    if (!pw) return Alert.alert('Validasi', 'Masukkan password.');
    if (registering && pw.length < 6) return Alert.alert('Validasi', 'Password minimal 6 karakter.');
    run(() => registering ? signUp({ name, email: trimmed, password: pw, role }) : signIn({ email: trimmed, password: pw, role }))();
  };

  const input = { backgroundColor: C.card, borderRadius: 14, padding: 15, color: C.text, borderWidth: 1, borderColor: C.line, fontSize: 15 };
  const label = (t) => <T s={11} w="700" c={C.mute} style={{ marginTop: 6, letterSpacing: 1 }}>{t}</T>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
          <IconZap size={28} color="#FFFFFF" fill="#FFFFFF" />
        </View>
        <T s={30} w="800">{registering ? 'Buat Akun' : 'Selamat Datang'}</T>
        <T c={C.mute}>{registering ? 'Buat akun lokal untuk mulai menggunakan Fleet-VC' : 'Masuk untuk mengelola toko dan penjualan'}</T>

        {registering && <><T s={11} w="700" c={C.mute}>NAMA LENGKAP</T><TextInput style={input} value={name} onChangeText={setName} placeholder="Nama Anda" placeholderTextColor={C.line} autoCapitalize="words" /></>}

        {label('JENIS AKUN')}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {['OWNER', 'CASHIER'].map((r) => {
            const isOwner = r === 'OWNER';
            const selected = role === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                accessibilityRole="button"
                accessibilityLabel={`Pilih role ${r}`}
                accessibilityState={{ selected }}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: C.card,
                  borderWidth: 1.5,
                  borderColor: selected ? C.green : C.line,
                  minHeight: 48,
                }}
              >
                {isOwner ? (
                  <IconCrown size={18} color={selected ? C.amber : C.mute} />
                ) : (
                  <IconCashier size={18} color={selected ? C.green : C.mute} />
                )}
                <T w="600" c={selected ? C.text : C.mute}>{isOwner ? 'Owner' : 'Cashier'}</T>
              </TouchableOpacity>
            );
          })}
        </View>

        {label('EMAIL')}
        <TextInput
          style={input}
          value={email}
          onChangeText={setEmail}
          placeholder="name@company.com"
          placeholderTextColor={C.line}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          accessibilityLabel="Email"
          returnKeyType="next"
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {label('PASSWORD')}
          {!registering && <TouchableOpacity onPress={() => Alert.alert('Lupa password', 'Hubungkan ke endpoint reset password backend Anda.')} style={{ minHeight: 44, justifyContent: 'center' }}>
            <T s={12} w="700" c={C.green}>Lupa password?</T>
          </TouchableOpacity>}
        </View>
        <View>
          <TextInput
            style={input}
            value={pw}
            onChangeText={setPw}
            secureTextEntry={!show}
            placeholder="••••••••"
            placeholderTextColor={C.line}
            autoComplete="password"
            textContentType="password"
            accessibilityLabel="Password"
            returnKeyType="go"
            onSubmitEditing={handleSignIn}
          />
          <TouchableOpacity
            onPress={() => setShow(!show)}
            accessibilityLabel={show ? 'Sembunyikan password' : 'Tampilkan password'}
            style={{ position: 'absolute', right: 14, top: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            {show ? <IconEyeOff size={20} color={C.mute} /> : <IconEye size={20} color={C.mute} />}
          </TouchableOpacity>
        </View>

        <Btn
          title={busy ? 'Memproses…' : registering ? 'Buat Akun' : 'Masuk'}
          onPress={handleSignIn}
          disabled={busy}
          style={{ marginTop: 8 }}
        />
        <TouchableOpacity onPress={() => setRegistering(!registering)} style={{ padding: 12, alignItems: 'center' }}><T c={C.green} w="700">{registering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Buat Akun'}</T></TouchableOpacity>
        {!registering && <T s={11} c={C.mute} style={{ textAlign: 'center', marginVertical: 6 }}>ATAU MASUK DENGAN</T>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {!registering && <TouchableOpacity
            onPress={run(google)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Masuk dengan Google"
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: C.card,
              borderRadius: 14,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: C.line,
              minHeight: 48,
            }}
          >
            <IconGoogle size={18} />
            <T w="700" c={C.text}>Google</T>
          </TouchableOpacity>}

          {!registering && <TouchableOpacity
            onPress={run(biometric)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Masuk dengan Biometrik"
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: C.card,
              borderRadius: 14,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: C.line,
              minHeight: 48,
            }}
          >
            <IconFingerprint size={18} color={C.text} />
            <T w="700" c={C.text}>Biometrik</T>
          </TouchableOpacity>}
        </View>
        {!registering && <T c={C.mute} style={{ textAlign: 'center', marginTop: 16 }}>Toko baru? <T w="700" c={C.green}>Hubungi Sales</T></T>}
        <T s={10} c={C.line} style={{ textAlign: 'center' }}>FLEET-VC • POINT OF SALE</T>
      </ScrollView>
    </SafeAreaView>
  );
}
