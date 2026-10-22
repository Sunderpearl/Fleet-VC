export const C = { bg: '#0F172A', card: '#1E293B', line: '#334155', green: '#10B981', amber: '#FACC15', text: '#F8FAFC', mute: '#94A3B8', red: '#EF4444' };

// Hermes engine does NOT support toLocaleString('id-ID').
// Manual formatter: 450000 → "Rp450.000"
export const rp = (n) => {
  const s = String(Math.round(n));
  let out = '';
  for (let i = s.length - 1, c = 0; i >= 0; i--, c++) {
    if (c > 0 && c % 3 === 0) out = '.' + out;
    out = s[i] + out;
  }
  return 'Rp' + out;
};
