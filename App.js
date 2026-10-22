import React, { useState } from 'react';
import { View, TouchableOpacity, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';
import { AuthProvider, useAuth } from './src/auth';
import { C } from './src/theme';
import { T, Btn } from './src/ui';
import Login from './src/screens/Login';
import Dashboard from './src/screens/Dashboard';
import POS from './src/screens/POS';
import Inventory from './src/screens/Inventory';

function Account() {
  const { user, logout } = useAuth();
  return (
    <View style={{ padding: 20, gap: 12 }}>
      <T s={24} w="800">Akun</T>
      <T>{user?.name}</T><T c={C.mute}>Role: {user?.role}</T>
      <Btn ghost title="Keluar" onPress={logout} />
    </View>
  );
}

const TABS = [['dash', '📊', 'Dashboard', Dashboard], ['pos', '🧾', 'POS', POS], null, ['inv', '📦', 'Inventory', Inventory], ['acc', '⚙️', 'Akun', Account]];

function Shell() {
  const { user, ready } = useAuth();
  const [tab, setTab] = useState('dash');
  if (!ready) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!user) return <Login />;

  // Fallback: jika tab state corrupt, kembali ke 'dash'
  const found = TABS.find((t) => t && t[0] === tab);
  const Screen = found ? found[3] : Dashboard;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}><Screen /></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, paddingVertical: 8, paddingBottom: Platform.OS === 'android' ? 8 : 4 }}>
        {TABS.map((t, i) => t ? (
          <TouchableOpacity
            key={t[0]}
            onPress={() => setTab(t[0])}
            accessibilityRole="tab"
            accessibilityLabel={t[2]}
            accessibilityState={{ selected: tab === t[0] }}
            style={{ flex: 1, alignItems: 'center', minHeight: 44 }}
          >
            <T s={18}>{t[1]}</T><T s={10} c={tab === t[0] ? C.green : C.mute}>{t[2]}</T>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            key={i}
            onPress={() => setTab('pos')}
            accessibilityRole="button"
            accessibilityLabel="Transaksi Baru"
            style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: -24, elevation: 8, shadowColor: C.green, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
          >
            <T s={28} w="700">+</T>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <AuthProvider><Shell /></AuthProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
