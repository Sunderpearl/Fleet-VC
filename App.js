import React, { useState } from 'react';
import { View, TouchableOpacity, StatusBar, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';
import { AuthProvider, useAuth } from './src/auth';
import { C } from './src/theme';
import { T } from './src/ui';
import Login from './src/screens/Login';
import Dashboard from './src/screens/Dashboard';
import POS from './src/screens/POS';
import Inventory from './src/screens/Inventory';
import Transactions from './src/screens/Transactions';
import Account from './src/screens/Account';
import { IconDashboard, IconPOS, IconInventory, IconAccount, IconPlus } from './src/icons';

const TABS = [
  ['dash', IconDashboard, 'Dashboard', Dashboard],
  ['pos', IconPOS, 'POS', POS],
  null,
  ['inv', IconInventory, 'Inventory', Inventory],
  ['history', IconPOS, 'Riwayat', Transactions],
  ['acc', IconAccount, 'Akun', Account],
];

function Shell() {
  const { user, ready } = useAuth();
  const [tab, setTab] = useState('dash');
  if (!ready) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!user) return <Login />;
  const found = TABS.find((t) => t && t[0] === tab);
  const Screen = found ? found[3] : Dashboard;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}><Screen /></View>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.card,
        paddingVertical: 8,
        paddingBottom: Platform.OS === 'android' ? 8 : 4,
      }}>
        {TABS.map((t, i) => {
          if (!t) {
            return (
              <TouchableOpacity
                key={`action-${i}`}
                onPress={() => setTab('pos')}
                accessibilityRole="button"
                accessibilityLabel="Transaksi Baru"
                style={{
                  flex: 1,
                  height: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -20,
                }}
              >
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  backgroundColor: C.green,
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 8,
                  shadowColor: C.green,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                }}>
                  <IconPlus size={26} color="#FFFFFF" strokeWidth={3} />
                </View>
              </TouchableOpacity>
            );
          }
          const IconComp = t[1];
          const active = tab === t[0];
          return (
            <TouchableOpacity
              key={t[0]}
              onPress={() => setTab(t[0])}
              accessibilityRole="tab"
              accessibilityLabel={t[2]}
              accessibilityState={{ selected: active }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 46 }}
            >
              <IconComp size={20} color={active ? C.green : C.mute} strokeWidth={active ? 2.5 : 2} />
              <T s={10} w={active ? '700' : '500'} c={active ? C.green : C.mute} style={{ marginTop: 4 }}>{t[2]}</T>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
function IPhoneFrame({ children }) {
  const { width, height } = useWindowDimensions();
  if (!(Platform.OS === 'web' && width > 500)) return <View style={{ flex: 1, backgroundColor: C.bg }}>{children}</View>;
  const frameWidth = 440, frameHeight = Math.min(956, Math.max(680, height - 36));
  return <View style={{ flex: 1, minHeight: '100%', backgroundColor: '#090D1A', alignItems: 'center', justifyContent: 'center', paddingVertical: 18 }}>
    <View style={{ width: frameWidth, height: frameHeight, borderRadius: 52, backgroundColor: C.bg, borderWidth: 8, borderColor: '#1E293B', overflow: 'hidden', position: 'relative' }}>
      <View style={{ position: 'absolute', top: 10, left: '50%', transform: [{ translateX: -60 }], width: 120, height: 30, backgroundColor: '#000', borderRadius: 20, zIndex: 9999, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0F172A' }} /><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#064E3B' }} /></View>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26, paddingTop: 8, zIndex: 999 }}><T s={13} w="700">9:41</T><T s={10} w="700">5G ▰</T></View>
      <View style={{ flex: 1 }}>{children}</View>
      <View style={{ height: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card }}><View style={{ width: 135, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' }} /></View>
    </View>
  </View>;
}
export default function App() {
  return <SafeAreaProvider><StatusBar barStyle="light-content" backgroundColor={C.bg} /><AuthProvider><IPhoneFrame><Shell /></IPhoneFrame></AuthProvider></SafeAreaProvider>;
}
registerRootComponent(App);
