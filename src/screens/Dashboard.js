import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { C, rp } from '../theme';
import { Card, T, Btn } from '../ui';
import { api, syncQueue } from '../api';

import { IconStore, IconChevronDown, IconSnowflake, IconAlert } from '../icons';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [holiday, setHoliday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      syncQueue().catch(() => {}); // fire-and-forget queue sync
      const data = await api.summary();
      setD(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  // Loading state
  if (loading && !d) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;

  // Error state
  if (error && !d) return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <T s={18} w="700" style={{ marginBottom: 8 }}>Gagal memuat data</T>
      <T c={C.mute} style={{ textAlign: 'center', marginBottom: 16 }}>{error}</T>
      <Btn title="Coba Lagi" onPress={() => { setLoading(true); load(); }} />
    </View>
  );

  const hrs = d.hourly.slice(8, 23);
  const max = Math.max(...hrs, 1); // ,1 prevents divide-by-zero when all hourly are 0
  const peak = hrs.indexOf(Math.max(...hrs));

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, gap: 14 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} colors={[C.green]} />}
    >
      <T s={11} c={C.mute} w="700">CURRENT BRANCH</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconStore size={20} color={C.green} />
        <T s={18} w="700">Flagship Store</T>
        <IconChevronDown size={14} color={C.mute} />
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4 }}>
        <TouchableOpacity
          onPress={() => setHoliday(false)}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: !holiday ? C.line : 'transparent',
          }}
        >
          <T w="600" c={!holiday ? C.text : C.mute}>Regular</T>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setHoliday(true)}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: holiday ? C.line : 'transparent',
          }}
        >
          <IconSnowflake size={14} color={holiday ? C.text : C.mute} />
          <T w="600" c={holiday ? C.text : C.mute}>Holiday Peak</T>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: C.green, borderRadius: 24, padding: 20 }}>
        <T c="#D1FAE5">Today's Revenue</T>
        <T s={32} w="800" style={{ marginTop: 6 }}>{rp(d.revenue)}</T>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}><T c={C.mute}>Orders</T><T s={22} w="700">{d.orders}</T></Card>
        <Card style={{ flex: 1 }}><T c={C.mute}>AOV</T><T s={22} w="700">{rp(d.aov)}</T></Card>
      </View>

      <Card>
        <T w="700" s={16}>Sales Activity</T>
        <T s={12} c={C.mute}>Real-time performance • per jam</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 4, marginTop: 14 }}>
          {hrs.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              {holiday && i === peak && <T s={8} c={C.amber} w="700">SPIKE</T>}
              <View style={{ width: '100%', height: Math.max((v / max) * 100, 2), borderRadius: 4, backgroundColor: holiday && i === peak ? C.amber : C.green }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {['08:00', '12:00', '16:00', '20:00', '22:00'].map((h) => <T key={h} s={10} c={C.mute}>{h}</T>)}
        </View>
      </Card>

      <T s={16} w="700">Top Performance SKU</T>
      {(!d.topSkus || d.topSkus.length === 0) ? (
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <T c={C.mute}>Belum ada data SKU</T>
        </Card>
      ) : d.topSkus.map((p) => {
        const low = p.stock <= 10;
        return (
          <Card key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', borderLeftWidth: low ? 4 : 1, borderLeftColor: low ? C.amber : C.line }}>
            <View>
              <T w="700">{p.name}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                {low && <IconAlert size={12} color={C.amber} />}
                <T s={11} c={low ? C.amber : C.green}>{low ? 'Low Stock' : 'In Stock'} • {p.sku}</T>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}><T w="700">{p.sold} Sold</T><T s={11} c={C.green}>{rp(p.revenue)}</T></View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
