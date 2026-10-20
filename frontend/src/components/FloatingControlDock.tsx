import React from 'react';
import {
  Compass,
  Sliders,
  Table as TableIcon,
  Plus,
  RefreshCw,
  Wallet,
  ShieldCheck,
  Radio,
} from 'lucide-react';

interface FloatingControlDockProps {
  viewMode: 'radar' | 'daw' | 'ledger';
  onViewChange: (mode: 'radar' | 'daw' | 'ledger') => void;
  onOpenCreatePolicy: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  activeReserveCount: number;
  totalGenLocked: string;
}

export const FloatingControlDock: React.FC<FloatingControlDockProps> = ({
  viewMode,
  onViewChange,
  onOpenCreatePolicy,
  onRefresh,
  isLoading,
  activeReserveCount,
  totalGenLocked,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[94%] sm:w-auto">
      <div className="p-2 rounded-3xl bg-canopy-950/90 border border-canopy-700/90 backdrop-blur-xl shadow-2xl flex items-center justify-between sm:justify-center gap-1.5 sm:gap-2">
        {/* Dock Item 1: 360° Radar Dome */}
        <button
          onClick={() => onViewChange('radar')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all ${
            viewMode === 'radar'
              ? 'bg-bio-thriving text-canopy-950 shadow-bio-glow'
              : 'text-bio-muted hover:text-white hover:bg-canopy-850'
          }`}
        >
          <Compass className={`w-4 h-4 ${viewMode === 'radar' ? 'animate-spin' : ''}`} style={{ animationDuration: '16s' }} />
          <span className="hidden sm:inline">Canopy Radar</span>
        </button>

        {/* Dock Item 2: Spectral DAW */}
        <button
          onClick={() => onViewChange('daw')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all ${
            viewMode === 'daw'
              ? 'bg-bio-cyan text-canopy-950 shadow-sonar-glow'
              : 'text-bio-muted hover:text-white hover:bg-canopy-850'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span className="hidden sm:inline">Spectral DAW</span>
        </button>

        {/* Dock Item 3: Forensic Ledger */}
        <button
          onClick={() => onViewChange('ledger')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all ${
            viewMode === 'ledger'
              ? 'bg-bio-lime text-canopy-950 shadow-bio-glow'
              : 'text-bio-muted hover:text-white hover:bg-canopy-850'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Audit Ledger</span>
        </button>

        {/* Separator */}
        <div className="h-6 w-[1px] bg-canopy-750 mx-1 hidden sm:block" />

        {/* Action: Deploy Escrow */}
        <button
          onClick={onOpenCreatePolicy}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-bio-thriving/20 hover:bg-bio-thriving text-bio-lime hover:text-canopy-950 border border-bio-thriving/60 text-xs font-mono font-bold transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Deploy Escrow</span>
        </button>

        {/* Refresh State */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2.5 rounded-2xl bg-canopy-850 hover:bg-canopy-800 text-slate-300 hover:text-white border border-canopy-700 transition-colors"
          title="Refresh On-Chain State"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-bio-thriving' : ''}`} />
        </button>
      </div>
    </div>
  );
};
