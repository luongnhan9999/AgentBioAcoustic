export function formatGen(val: string | number | bigint, decimals: number = 3): string {
  try {
    let bigVal: bigint;
    if (typeof val === 'string') {
      bigVal = BigInt(val.startsWith('0x') ? val : val);
    } else if (typeof val === 'number') {
      bigVal = BigInt(Math.floor(val));
    } else {
      bigVal = val;
    }

    const whole = bigVal / 1000000000000000000n;
    const rem = bigVal % 1000000000000000000n;
    const remStr = rem.toString().padStart(18, '0').slice(0, decimals);
    return `${whole.toString()}.${remStr}`;
  } catch (err) {
    return '0.000';
  }
}

export function parseGenToWei(genStr: string | number): bigint {
  try {
    const s = String(genStr).trim();
    if (!s) return 0n;
    const parts = s.split('.');
    const whole = BigInt(parts[0] || '0') * 1000000000000000000n;
    if (parts.length > 1) {
      const frac = parts[1].padEnd(18, '0').slice(0, 18);
      return whole + BigInt(frac);
    }
    return whole;
  } catch (e) {
    return 0n;
  }
}

export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return '';
  const clean = address.trim();
  if (clean.length <= startChars + endChars) return clean;
  return `${clean.slice(0, startChars)}...${clean.slice(-endChars)}`;
}

export function formatDate(timestamp: string | number | bigint): string {
  try {
    const num = Number(timestamp);
    if (!num || num === 0) return 'N/A';
    const ms = num < 10000000000 ? num * 1000 : num;
    return new Date(ms).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (err) {
    return 'N/A';
  }
}

export interface StatusMeta {
  code: number;
  label: string;
  badgeClass: string;
  borderClass: string;
  accentClass: string;
  description: string;
}

export function getStatusMeta(status: number): StatusMeta {
  switch (status) {
    case 0:
      return {
        code: 0,
        label: 'MONITORING ACTIVE',
        badgeClass: 'bg-bio-cyan/15 text-bio-cyan border-bio-cyan/30',
        borderClass: 'border-bio-cyan/30',
        accentClass: 'text-bio-cyan',
        description: 'Sponsor locked conservation escrow. Acoustic microphone array listening.',
      };
    case 1:
      return {
        code: 1,
        label: 'TELEMETRY QUEUED',
        badgeClass: 'bg-bio-lime/20 text-bio-lime border-bio-lime/40 animate-pulse',
        borderClass: 'border-bio-lime/40',
        accentClass: 'text-bio-lime',
        description: 'Ranger submitted audio spectrogram. Queued for GenLayer AI jury audit.',
      };
    case 2:
      return {
        code: 2,
        label: 'AWAITING PAYOUT',
        badgeClass: 'bg-bio-amber/20 text-bio-amber border-bio-amber/40',
        borderClass: 'border-bio-amber/40',
        accentClass: 'text-bio-amber',
        description: 'AI bioacoustic verdict rendered. 24-block (~72s) challenge window active.',
      };
    case 3:
      return {
        code: 3,
        label: 'SETTLED: THRIVING (100%)',
        badgeClass: 'bg-bio-thriving/20 text-bio-thriving border-bio-thriving/50',
        borderClass: 'border-bio-thriving/50',
        accentClass: 'text-bio-thriving',
        description: 'Vibrant soundscape verified. 100% conservation grant disbursed to rangers.',
      };
    case 4:
      return {
        code: 4,
        label: 'DISTURBANCE PENALTY (50%)',
        badgeClass: 'bg-bio-amber/20 text-bio-amber border-bio-amber/50',
        borderClass: 'border-bio-amber/50',
        accentClass: 'text-bio-amber',
        description: 'Chainsaw drone or degraded NDSI detected. 50% penalty applied.',
      };
    case 5:
      return {
        code: 5,
        label: 'POACHING CRISIS (0%)',
        badgeClass: 'bg-bio-crisis/20 text-bio-crisis border-bio-crisis/50',
        borderClass: 'border-bio-crisis/50',
        accentClass: 'text-bio-crisis',
        description: 'Gunshots or acoustic collapse detected. 100% escrow refunded to sponsor.',
      };
    case 6:
      return {
        code: 6,
        label: 'UNDER APPEAL (STAKED)',
        badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse',
        borderClass: 'border-purple-500/40',
        accentClass: 'text-purple-400',
        description: 'Under Supreme Bioacoustic Tribunal review with 10% staked dispute bond.',
      };
    case 7:
      return {
        code: 7,
        label: 'EXPIRED / RECLAIMED',
        badgeClass: 'bg-slate-700/30 text-slate-400 border-slate-600/40',
        borderClass: 'border-slate-700/40',
        accentClass: 'text-slate-400',
        description: 'Policy coverage expired with zero telemetry. Escrow reclaimed by sponsor.',
      };
    case 8:
      return {
        code: 8,
        label: 'UNRESOLVED / PROTECTED',
        badgeClass: 'bg-rose-900/30 text-rose-300 border-rose-500/40',
        borderClass: 'border-rose-500/40',
        accentClass: 'text-rose-400',
        description: 'Feed unreachable or canary parse failure. Non-settling safety halt.',
      };
    default:
      return {
        code: status,
        label: `STATUS ${status}`,
        badgeClass: 'bg-slate-700/30 text-slate-400 border-slate-600/40',
        borderClass: 'border-slate-700/40',
        accentClass: 'text-slate-400',
        description: 'Status code pending recognition.',
      };
  }
}
