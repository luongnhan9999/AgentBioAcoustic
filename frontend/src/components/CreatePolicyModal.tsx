import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Trees,
  Sliders,
  Clock,
  Sparkles,
  Info,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { parseGenToWei } from '../utils/formatters';

interface CreatePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rangerStation: string, reserveId: string, minNdsi: number, durationBlocks: number, amountGen: string) => Promise<void>;
  isSubmitting: boolean;
}

const PRESET_RESERVES = [
  { id: 'TAM-DAO-NATIONAL-PARK-Z4', name: 'Tam Dao National Park (Zone 4, Vietnam)', ndsi: 65 },
  { id: 'YASUNI-BIOSPHERE-ZONE-1', name: 'Yasuní Biosphere Reserve (Ecuador)', ndsi: 70 },
  { id: 'AMAZON-TAPAJOS-CORRIDOR', name: 'Tapajós Rainforest Corridor (Brazil)', ndsi: 65 },
  { id: 'CONGO-BASIN-TRANSECT-B', name: 'Congo Basin Primary Rainforest (Gabon)', ndsi: 75 },
];

export const CreatePolicyModal: React.FC<CreatePolicyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [rangerStation, setRangerStation] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [reserveId, setReserveId] = useState('TAM-DAO-NATIONAL-PARK-Z4');
  const [minNdsi, setMinNdsi] = useState(65);
  const [durationDays, setDurationDays] = useState(30);
  const [amountGen, setAmountGen] = useState('0.1');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanRanger = rangerStation.trim();
    if (!cleanRanger.startsWith('0x') || cleanRanger.length !== 42) {
      setError('Please provide a valid 42-character hex address for the Ranger Station.');
      return;
    }

    const cleanReserve = reserveId.trim();
    if (cleanReserve.length < 4) {
      setError('Forest reserve identifier must be at least 4 characters.');
      return;
    }

    const wei = parseGenToWei(amountGen);
    if (wei <= 0n) {
      setError('Conservation escrow deposit must be greater than 0 GEN.');
      return;
    }

    // 3 seconds per block
    const durationBlocks = Math.floor((durationDays * 86400) / 3);

    try {
      await onSubmit(cleanRanger, cleanReserve, minNdsi, durationBlocks, amountGen);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create conservation policy escrow.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-canopy-850 border border-canopy-700 p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Top Glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bio-thriving via-bio-lime to-bio-cyan" />

        <div className="flex items-center justify-between pb-4 border-b border-canopy-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-bio-thriving/15 border border-bio-thriving/30 text-bio-thriving">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-white">Create Conservation Policy</h2>
              <p className="text-xs font-mono text-bio-muted">Fund Autonomous Bioacoustic Escrow with GEN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-canopy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-bio-crisis/15 border border-bio-crisis/40 text-bio-crisis text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-mono text-bio-muted uppercase tracking-wider mb-2">
              Quick Presets (Accredited Reserves):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_RESERVES.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => {
                    setReserveId(preset.id);
                    setMinNdsi(preset.ndsi);
                  }}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                    reserveId === preset.id
                      ? 'bg-bio-thriving/15 border-bio-thriving text-bio-lime font-medium'
                      : 'bg-canopy-900 border-canopy-700 text-slate-300 hover:border-canopy-600'
                  }`}
                >
                  <span className="truncate">{preset.id}</span>
                  <span className="font-mono text-[10px] text-bio-muted shrink-0 ml-1">NDSI ≥{preset.ndsi}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Forest Reserve Identifier */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Forest Reserve Identifier / GPS Polygon ID:
            </label>
            <div className="relative">
              <Trees className="w-4 h-4 absolute left-3 top-3 text-bio-muted" />
              <input
                type="text"
                value={reserveId}
                onChange={(e) => setReserveId(e.target.value)}
                placeholder="e.g. TAM-DAO-NATIONAL-PARK-Z4"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-canopy-950 border border-canopy-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-bio-thriving"
                required
              />
            </div>
          </div>

          {/* Ranger Station Address */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Indigenous Ranger Station / Conservator Address:
            </label>
            <input
              type="text"
              value={rangerStation}
              onChange={(e) => setRangerStation(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2.5 rounded-xl bg-canopy-950 border border-canopy-700 text-sm font-mono text-bio-lime placeholder-slate-500 focus:outline-none focus:border-bio-thriving"
              required
            />
            <p className="mt-1 text-[11px] text-bio-muted">
              Recipient of the 100% conservation subsidy upon verified biophony.
            </p>
          </div>

          {/* Target NDSI Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-bio-thriving" />
                Target Soundscape Index (NDSI Score):
              </label>
              <span className="font-mono text-sm font-bold text-bio-lime">
                {minNdsi} <span className="text-[11px] text-bio-muted">/ 100 (Threshold)</span>
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="95"
              step="1"
              value={minNdsi}
              onChange={(e) => setMinNdsi(Number(e.target.value))}
              className="w-full h-2 bg-canopy-950 rounded-lg appearance-none cursor-pointer accent-bio-thriving"
            />
            <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400">
              <span>30 (Degraded Anthrophony)</span>
              <span className="text-bio-thriving font-bold">60+ (Dense Biophony Standard)</span>
              <span>95 (Virgin Jungle)</span>
            </div>
          </div>

          {/* Amount GEN & Duration in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Escrow Subsidy Deposit (GEN):
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountGen}
                  onChange={(e) => setAmountGen(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-canopy-950 border border-canopy-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-bio-thriving"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-bio-thriving">
                  GEN
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Coverage Duration (Days):
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-3 text-bio-muted" />
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-canopy-950 border border-canopy-700 text-sm font-mono text-white focus:outline-none focus:border-bio-thriving"
                  required
                />
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="p-3.5 rounded-xl bg-canopy-900 border border-canopy-700 flex items-start gap-3 text-xs text-slate-300">
            <Info className="w-4 h-4 text-bio-cyan shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Upon creation, funds are locked in the smart contract. DePIN microphones or rangers submit audio spectrogram streams from accredited sources (RFCx, Arbimon, GBIF). The GenLayer AI Jury evaluates biophony density, gunshot acoustic peaks, and chainsaw engine drone minutes before disbursing rewards.
            </p>
          </div>

          {/* Submit button */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-canopy-800 hover:bg-canopy-750 text-slate-300 font-heading font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-bio-thriving to-emerald-600 hover:from-bio-lime hover:to-bio-thriving text-canopy-950 font-heading font-bold text-sm tracking-wide shadow-bio-glow transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-canopy-950" />
                  <span>Locking Escrow on StudioNet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-canopy-950" />
                  <span>Deposit {amountGen} GEN & Launch Policy</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
