import React, { createContext, useContext, useEffect, useState } from 'react';
import * as LocalAuth from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setTokens, API_URL, MOCK } from './api';
import { storage } from './storage';

WebBrowser.maybeCompleteAuthSession();
const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

const bioOk = async () => (await LocalAuth.hasHardwareAsync()) && (await LocalAuth.isEnrolledAsync());
const unlock = async () => (await LocalAuth.authenticateAsync({ promptMessage: 'Buka Fleet' })).success;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const save = async (s) => {
    setTokens(s);
    await storage.setItem('session', JSON.stringify(s));
    setUser(s.user);
  };
  const restore = async () => {
    const raw = await storage.getItem('session');
    if (!raw) throw new Error('Belum ada sesi tersimpan. Masuk dengan email dulu.');
    if ((await bioOk()) && !(await unlock())) throw new Error('Verifikasi biometrik gagal');
    const s = JSON.parse(raw); setTokens(s); setUser(s.user);
  };

  useEffect(() => { restore().catch(() => {}).finally(() => setReady(true)); }, []);

  const value = {
    user, ready, biometric: restore,
    signIn: async (b) => save(await api.login(b)),
    google: async () => {
      if (MOCK) return save(await api.login({}));
      const r = await WebBrowser.openAuthSessionAsync(`${API_URL}/auth/google`, Linking.createURL('auth'));
      if (r.type !== 'success') return;
      const p = new URLSearchParams(r.url.split('#')[1] || '');
      setTokens({ access: p.get('access'), refresh: p.get('refresh') });
      await save({ user: await api.me(), access: p.get('access'), refresh: p.get('refresh') });
    },
    logout: async () => {
      await storage.deleteItem('session');
      await AsyncStorage.removeItem('queue');
      setTokens(null);
      setUser(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
