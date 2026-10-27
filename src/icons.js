import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Package,
  User,
  Plus,
  Minus,
  Zap,
  Crown,
  UserCheck,
  Eye,
  EyeOff,
  Store,
  ChevronDown,
  Snowflake,
  AlertTriangle,
  Search,
  ArrowRight,
  Fingerprint,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { C } from './theme';

export const IconDashboard = ({ size = 20, color = C.text, strokeWidth = 2, ...p }) => (
  <LayoutDashboard size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconPOS = ({ size = 20, color = C.text, strokeWidth = 2, ...p }) => (
  <Receipt size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconInventory = ({ size = 20, color = C.text, strokeWidth = 2, ...p }) => (
  <Package size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconAccount = ({ size = 20, color = C.text, strokeWidth = 2, ...p }) => (
  <User size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconPlus = ({ size = 20, color = C.text, strokeWidth = 2.5, ...p }) => (
  <Plus size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconMinus = ({ size = 20, color = C.text, strokeWidth = 2.5, ...p }) => (
  <Minus size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconZap = ({ size = 24, color = C.text, strokeWidth = 2, fill = 'none', ...p }) => (
  <Zap size={size} color={color} strokeWidth={strokeWidth} fill={fill} {...p} />
);

export const IconCrown = ({ size = 18, color = C.amber, strokeWidth = 2, ...p }) => (
  <Crown size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconCashier = ({ size = 18, color = C.text, strokeWidth = 2, ...p }) => (
  <UserCheck size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconEye = ({ size = 18, color = C.mute, strokeWidth = 2, ...p }) => (
  <Eye size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconEyeOff = ({ size = 18, color = C.mute, strokeWidth = 2, ...p }) => (
  <EyeOff size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconStore = ({ size = 16, color = C.text, strokeWidth = 2, ...p }) => (
  <Store size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconChevronDown = ({ size = 14, color = C.mute, strokeWidth = 2.5, ...p }) => (
  <ChevronDown size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconSnowflake = ({ size = 16, color = C.text, strokeWidth = 2, ...p }) => (
  <Snowflake size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconAlert = ({ size = 14, color = C.amber, strokeWidth = 2.5, ...p }) => (
  <AlertTriangle size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconSearch = ({ size = 18, color = C.mute, strokeWidth = 2, ...p }) => (
  <Search size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconArrowRight = ({ size = 18, color = C.green, strokeWidth = 2.5, ...p }) => (
  <ArrowRight size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

export const IconFingerprint = ({ size = 18, color = C.text, strokeWidth = 2, ...p }) => (
  <Fingerprint size={size} color={color} strokeWidth={strokeWidth} {...p} />
);

// High-fidelity Google G Logo SVG
export const IconGoogle = ({ size = 18, ...p }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" {...p}>
    <Path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
    />
    <Path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </Svg>
);
