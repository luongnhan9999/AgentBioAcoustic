import React, { useState } from 'react';
import {
  X,
  Scale,
  AlertTriangle,
  Loader2,
  FileAudio,
  ShieldAlert,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { ConservationPolicyData } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface AppealModalProps {
  policy: ConservationPolicyData | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (policyId: string, reason: string, supplementalUrl: string, bondWei: bigint) => Promise<void>;
  isSubmitting: boolean;
}

const ACCREDITED_DOMAINS = [
  'rfcx.org',
  'arbimon.rfcx.org',
  'gbif.org',
  'xeno-canto.org',
  'macaulaylibrary.org',
  'cornell.edu',
  'wildlabs.net',
  'opensoundscape.org',
];

export const AppealModal: React.FC<AppealModalProps> = ({
  policy,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [disputeReason, setDisputeReason] = useState(
    'Supplemental high-definition spectrogram proves broadband noise was natural river waterfall torrent, not industrial chainsaw.'
  );
  const [supplementalUrl, setSupplementalUrl] = useState(
    'https://arbimon.rfcx.org/api/v1/calibration/high_res_tamdao_stream.json'
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !policy) return null;

  // 10% dispute bond calculation
  const escrowWei = BigInt(policy.escrow_amount || '0');
  const requiredBondWei = (escrowWei * 10n) / 100n || 1n;
  const requiredBondGen = formatGen(requiredBondWei, 4);

  const isAccredited = (url: string): boolean => {
    try {
      const clean = url.trim().toLowerCase();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
      const host = clean.split('://')[1].split('/')[0].split(':')[0];
      return ACCREDITED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
    } catch {
      return false;
    }
  };

  const accreditedValid = isAccredited(supplementalUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanReason = disputeReason.trim();
    if (cleanReason.length < 10) {
      setError('Dispute justification must be at least 10 characters.');
      return;
    }

    if (!accreditedValid) {
      setError(
        'Supplemental audio telemetry must originate strictly from an accredited bioacoustic source: RFCx, Arbimon, GBIF, Xeno-Canto, Macaulay Library, Cornell, or WildLabs.'
      );
      return;
    }

    try {
      await onSubmit(policy.policy_id, cleanReason, supplementalUrl.trim(), requiredBondWei);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to file appeal.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-canopy-850 border border-canopy-700 p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-bio-crisis" />

        <div className="flex items-center justify-between pb-4 border-b border-canopy-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Scale className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-white">Supreme Bioacoustic Appeal</h2>
              <p className="text-xs font-mono text-bio-muted">
                Challenge Verdict on Policy #{policy.policy_id}
              </p>
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
          {/* Staked Bond Required Alert */}
          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-purple-300 uppercase">10% Dispute Bond Required:</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-xl font-bold text-white">{requiredBondGen}</span>
                <span className="text-xs font-mono text-purple-400 font-bold">GEN</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          {/* Current Verdict Info */}
          <div className="p-3 rounded-xl bg-canopy-900 border border-canopy-700 text-xs">
            <span className="text-bio-muted font-mono">Current Verdict Under Appeal:</span>
            <p className="font-mono text-bio-amber font-bold mt-0.5">{policy.verdict}</p>
          </div>

          {/* Dispute Reason */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Dispute Justification & Forensic Argument:
            </label>
            <textarea
              rows={3}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="State clear ecological or acoustic evidence refuting the initial verdict..."
              className="w-full px-3 py-2 rounded-xl bg-canopy-950 border border-canopy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {/* Supplemental Audio Feed */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Supplemental High-Definition Audio / Spectrogram URL:
            </label>
            <div className="relative">
              <FileAudio className="w-4 h-4 absolute left-3 top-3 text-bio-muted" />
              <input
                type="url"
                value={supplementalUrl}
                onChange={(e) => setSupplementalUrl(e.target.value)}
                placeholder="https://arbimon.rfcx.org/..."
                className="w-full pl-9 pr-24 py-2.5 rounded-xl bg-canopy-950 border border-canopy-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                required
              />
              <div className="absolute right-2.5 top-2.5">
                {accreditedValid ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bio-thriving/20 text-bio-thriving border border-bio-thriving/40">
                    <ShieldCheck className="w-3 h-3" /> Accredited
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bio-crisis/20 text-bio-crisis border border-bio-crisis/40">
                    Invalid Domain
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-bio-muted">
              Must originate strictly from an accredited bioacoustic repository.
            </p>
          </div>

          {/* Warning disclaimer */}
          <div className="p-3.5 rounded-xl bg-canopy-950 border border-canopy-700 text-xs text-slate-400">
            <p>
              ⚠️ <strong className="text-purple-300">Bond Forfeiture Rule:</strong> If the Supreme Bioacoustic Tribunal dismisses this appeal, your {requiredBondGen} GEN bond will be forfeited to the counterparty. If upheld, 100% of your bond is returned.
            </p>
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || !accreditedValid}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-purple-500 text-white font-heading font-bold text-sm tracking-wide shadow-2xl transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Staking Bond & Filing...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Stake {requiredBondGen} GEN & Submit Appeal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
