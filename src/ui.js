import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { C } from './theme';

export const T = ({ s = 14, w = '400', c = C.text, style, accessibilityLabel, ...p }) => (
  <Text
    style={[{ fontSize: s, fontWeight: w, color: c }, style]}
    accessibilityLabel={accessibilityLabel}
    {...p}
  />
);

export const Card = ({ style, ...p }) => (
  <View
    style={[{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.line }, style]}
    {...p}
  />
);

export const Btn = ({ title, onPress, ghost, disabled, style }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={title}
    style={[
      {
        backgroundColor: ghost ? C.card : C.green,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        borderWidth: ghost ? 1 : 0,
        borderColor: C.line,
        shadowColor: C.green,
        shadowOpacity: ghost ? 0 : 0.18,
        shadowRadius: 8,
        elevation: ghost ? 0 : 3,
        opacity: disabled ? 0.5 : 1,
        minHeight: 48,
      },
      style,
    ]}
  >
    <T w="700" c={ghost ? C.text : "#06281F"}>{title}</T>
  </TouchableOpacity>
);
