import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { C, rp } from '../theme';
import { Card, T } from '../ui';
import { api } from '../api';

import { IconInventory, IconAlert } from '../icons';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.products();
      setItems(data);
    } catch (e) {
      setError(e.message);
      if (!refreshing) Alert.alert('Gagal', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(p) => p.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} colors={[C.green]} />}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <IconInventory size={26} color={C.green} />
          <T s={24} w="800">Inventory</T>
        </View>
      }
      contentContainerStyle={{ padding: 20, gap: 10 }}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <T c={C.mute}>{error ? error : 'Belum ada produk'}</T>
        </View>
      }
      renderItem={({ item: p }) => {
        const low = p.stock <= (p.lowStockAt ?? 10);
        return (
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', borderLeftWidth: low ? 4 : 1, borderLeftColor: low ? C.amber : C.line }}>
            <View><T w="700">{p.name}</T><T s={11} c={C.mute}>{p.sku} • {rp(p.price)}</T></View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {low && <IconAlert size={14} color={C.amber} />}
                <T w="800" c={low ? C.amber : C.green}>{p.stock} pcs</T>
              </View>
            </View>
          </Card>
        );
      }}
    />
  );
}
