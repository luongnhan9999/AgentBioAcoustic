import React from 'react';
import {
  Vault,
  Trees,
  CheckCircle2,
  Radio,
  PlusCircle,
  Volume2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ProtocolStats } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface StatsOverviewProps {
  stats: ProtocolStats | null;
  policyCount: number;
  onOpenCreatePolicy: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  policyCount,
  onOpenCreatePolicy,
}) => {
  const lockedGen = stats ? formatGen(stats.total_conservation_locked, 2) : '0.00';
  const settledCount = stats ? stats.total_policies_settled : 0;
  const totalPolicies = stats ? Math.max(stats.total_policies, policyCount) : policyCount;

  return (
    <div className="space-y-6">
      {/* Top Banner Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-canopy-850 via-canopy-900 to-canopy-850 border border-canopy-700 p-6 sm:p-8 shadow-2xl">
        {/* Decorative background grid and soundwaves */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.08),transparent_70%)]" />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1.5 opacity-25">
          <span className="sound-bar h-12" />
          <span className="sound-bar h-24" />
          <span className="sound-bar h-40" />
          <span className="sound-bar h-28" />
          <span className="sound-bar h-16" />
          <span className="sound-bar h-36" />
          <span className="sound-bar h-20" />
          <span className="sound-bar h-48" />
          <span className="sound-bar h-32" />
          <span className="sound-bar h-16" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bio-thriving/15 border border-bio-thriving/30 text-bio-thriving font-mono text-xs uppercase tracking-wider mb-4">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Autonomous Bioacoustic Oracles on GenLayer StudioNet</span>
          </div>

          <h1 className="font-heading font-extrabold text-2xl sm:text-4xl text-white tracking-tight leading-tight">
            Protect Rainforest Canopy with <span className="text-bio-thriving">Bioacoustic Oracles</span>
          </h1>

          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
            Pre-fund indigenous ranger escrows with GEN. OpenSoundscape & Arbimon acoustic sensors stream audio telemetry directly on-chain. GenLayer multi-validator AI consensus cross-examines biophony density (NDSI), chainsaw drones, and gunshot signatures to disburse grants or freeze poaching crises.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCreatePolicy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-bio-thriving to-emerald-600 hover:from-bio-lime hover:to-bio-thriving text-canopy-950 font-heading font-bold text-sm tracking-wide shadow-bio-glow transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-canopy-950" />
              <span>Create Conservation Escrow</span>
            </button>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-canopy-950/80 border border-canopy-700 text-xs font-mono text-bio-muted">
              <ShieldCheck className="w-4 h-4 text-bio-cyan" />
              <span>Accredited RFCx / GBIF / Xeno-Canto Streams</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-xl bg-canopy-850 border border-canopy-700 p-5 shadow-lg relative overflow-hidden group hover:border-bio-thriving/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-bio-muted uppercase tracking-wider">Total Escrow Locked</span>
            <div className="p-2 rounded-lg bg-bio-thriving/10 text-bio-thriving">
              <Vault className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-white tracking-tight">{lockedGen}</span>
            <span className="font-mono text-xs text-bio-thriving font-bold">GEN</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Locked in non-custodial conservation escrows</p>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl bg-canopy-850 border border-canopy-700 p-5 shadow-lg relative overflow-hidden group hover:border-bio-cyan/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-bio-muted uppercase tracking-wider">Protected Reserves</span>
            <div className="p-2 rounded-lg bg-bio-cyan/10 text-bio-cyan">
              <Trees className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-white tracking-tight">{totalPolicies}</span>
            <span className="font-mono text-xs text-bio-cyan font-bold">Habitats</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Rainforest canopy sectors actively listening</p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl bg-canopy-850 border border-canopy-700 p-5 shadow-lg relative overflow-hidden group hover:border-bio-lime/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-bio-muted uppercase tracking-wider">Settled Grants</span>
            <div className="p-2 rounded-lg bg-bio-lime/10 text-bio-lime">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-white tracking-tight">{settledCount}</span>
            <span className="font-mono text-xs text-bio-lime font-bold">Adjudicated</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Verdicts finalized after 24-block challenge window</p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl bg-canopy-850 border border-canopy-700 p-5 shadow-lg relative overflow-hidden group hover:border-bio-amber/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-bio-muted uppercase tracking-wider">Cooling-off Period</span>
            <div className="p-2 rounded-lg bg-bio-amber/10 text-bio-amber">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-white tracking-tight">24</span>
            <span className="font-mono text-xs text-bio-amber font-bold">Blocks (~72s)</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">10% staked bond required for appellate challenge</p>
        </div>
      </div>
    </div>
  );
};
