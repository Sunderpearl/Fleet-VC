import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme';
import { Btn, T } from '../ui';
import { useAuth } from '../auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { signIn, google, biometric } = useAuth();
  const [role, setRole] = useState('OWNER');
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
    if (!trimmed) return Alert.alert('Validasi', 'Masukkan email.');
    if (!EMAIL_RE.test(trimmed)) return Alert.alert('Validasi', 'Format email tidak valid.');
    if (!pw) return Alert.alert('Validasi', 'Masukkan password.');
    run(() => signIn({ email: trimmed, password: pw, role }))();
  };

  const input = { backgroundColor: C.card, borderRadius: 14, padding: 15, color: C.text, borderWidth: 1, borderColor: C.line, fontSize: 15 };
  const label = (t) => <T s={11} w="700" c={C.mute} style={{ marginTop: 6, letterSpacing: 1 }}>{t}</T>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: 24 }}><T s={28}>⚡</T></View>
        <T s={30} w="800">Welcome Back</T>
        <T c={C.mute}>Masuk untuk mengelola penjualan & analitik</T>

        {label('ACCESS ROLE')}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {['OWNER', 'CASHIER'].map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              accessibilityRole="button"
              accessibilityLabel={`Pilih role ${r}`}
              accessibilityState={{ selected: role === r }}
              style={{ flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: C.card, borderWidth: 1.5, borderColor: role === r ? C.green : C.line, minHeight: 48 }}
            >
              <T w="600" c={role === r ? C.text : C.mute}>{r === 'OWNER' ? '👑 Owner' : '🧾 Cashier'}</T>
            </TouchableOpacity>
          ))}
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
          <TouchableOpacity onPress={() => Alert.alert('Lupa password', 'Hubungkan ke endpoint reset password backend Anda.')} style={{ minHeight: 44, justifyContent: 'center' }}>
            <T s={12} w="700" c={C.green}>Forgot Password?</T>
          </TouchableOpacity>
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
            <T>{show ? '🙈' : '👁'}</T>
          </TouchableOpacity>
        </View>

        <Btn
          title={busy ? 'Memproses…' : 'Sign In'}
          onPress={handleSignIn}
          disabled={busy}
          style={{ marginTop: 8 }}
        />
        <T s={11} c={C.mute} style={{ textAlign: 'center', marginVertical: 6 }}>ATAU LANJUTKAN DENGAN</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn ghost title="Google" onPress={run(google)} disabled={busy} style={{ flex: 1 }} />
          <Btn ghost title="FaceID / TouchID" onPress={run(biometric)} disabled={busy} style={{ flex: 1 }} />
        </View>
        <T c={C.mute} style={{ textAlign: 'center', marginTop: 16 }}>Toko baru? <T w="700" c={C.green}>Hubungi Sales</T></T>
        <T s={10} c={C.line} style={{ textAlign: 'center' }}>SYSTEM VERSION 1.0.0 • ENTERPRISE CLOUD</T>
      </ScrollView>
    </SafeAreaView>
  );
}
