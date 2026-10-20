import React, { useState, useEffect } from 'react';
import {
  Radio,
  Volume2,
  Trees,
  ShieldCheck,
  Scale,
  Clock,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  AlertOctagon,
  Wrench,
  Loader2,
  Activity,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ConservationPolicyData,
  STATUS_POLICY_OPEN,
  STATUS_TELEMETRY_SUBMITTED,
  STATUS_AWAITING_PAYOUT,
  STATUS_SETTLED_THRIVING,
  STATUS_SETTLED_PARTIAL,
  STATUS_SETTLED_TERMINATED,
  STATUS_DISPUTED,
  STATUS_EXPIRED_RECLAIMED,
  STATUS_UNRESOLVED,
} from '../config/genlayer';
import { getStatusMeta, formatGen, formatDate, truncateAddress } from '../utils/formatters';

interface PolicyCardProps {
  policy: ConservationPolicyData;
  userAddress: string;
  isConnected: boolean;
  onSubmitTelemetry: (policy: ConservationPolicyData) => void;
  onAdjudicate: (policyId: string) => Promise<void>;
  onInspect: (policy: ConservationPolicyData) => void;
  onOpenAppeal: (policy: ConservationPolicyData) => void;
  onAdjudicateAppeal: (policyId: string) => Promise<void>;
  onFinalize: (policyId: string) => Promise<void>;
  onReclaim: (policyId: string) => Promise<void>;
  actionLoadingId: string | null;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({
  policy,
  userAddress,
  isConnected,
  onSubmitTelemetry,
  onAdjudicate,
  onInspect,
  onOpenAppeal,
  onAdjudicateAppeal,
  onFinalize,
  onReclaim,
  actionLoadingId,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const statusMeta = getStatusMeta(policy.status);
  const isActionLoading = actionLoadingId === policy.policy_id;

  const userLower = userAddress?.toLowerCase() || '';
  const isSponsor = userLower === policy.sponsor?.toLowerCase();
  const isRanger = userLower === policy.ranger_station?.toLowerCase();

  // Cooling-off countdown calculation (72s from audit_completed_time)
  useEffect(() => {
    if (policy.status === STATUS_AWAITING_PAYOUT && policy.audit_completed_time && policy.audit_completed_time !== '0') {
      const auditSec = Number(policy.audit_completed_time);
      const updateTimer = () => {
        const nowSec = Math.floor(Date.now() / 1000);
        const diff = (auditSec + 72) - nowSec;
        setSecondsLeft(Math.max(0, diff));
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setSecondsLeft(0);
    }
  }, [policy.status, policy.audit_completed_time]);

  const ndsi = policy.measured_ndsi_score || 0;
  const targetNdsi = policy.min_ndsi_threshold || 60;
  const gunshots = policy.gunshot_events_detected || 0;
  const chainsaws = policy.chainsaw_minutes_detected || 0;

  return (
    <div className="rounded-2xl bg-canopy-850 border border-canopy-700 hover:border-canopy-600 transition-all shadow-xl overflow-hidden flex flex-col justify-between group">
      <div>
        {/* Card Header */}
        <div className="p-5 border-b border-canopy-700/80 bg-canopy-900/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-bio-muted">#{policy.policy_id}</span>
                <h3 className="font-heading font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                  <Trees className="w-4 h-4 text-bio-thriving shrink-0" />
                  <span className="truncate max-w-[220px] sm:max-w-xs">{policy.forest_reserve_id}</span>
                </h3>
              </div>
              <p className="mt-1 text-[11px] font-mono text-slate-400">
                Sponsor: <span className="text-bio-lime">{truncateAddress(policy.sponsor)}</span> • Rangers:{' '}
                <span className="text-bio-cyan">{truncateAddress(policy.ranger_station)}</span>
              </p>
            </div>

            {/* Status Badge */}
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase font-bold border shrink-0 ${statusMeta.badgeClass}`}>
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          {/* Escrow subsidy amount */}
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-mono text-bio-muted uppercase">Conservation Subsidy:</span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold text-white">{formatGen(policy.escrow_amount, 2)}</span>
              <span className="font-mono text-xs text-bio-thriving font-bold">GEN</span>
            </div>
          </div>

          {/* NDSI Soundscape Gauge */}
          <div className="p-3.5 rounded-xl bg-canopy-950 border border-canopy-750 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-bio-muted font-mono flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-bio-cyan" />
                NDSI Index:
              </span>
              <div className="font-mono text-xs font-bold">
                {policy.measured_ndsi_score > 0 ? (
                  <span className={ndsi >= targetNdsi ? 'text-bio-thriving' : 'text-bio-amber'}>
                    {ndsi} <span className="text-bio-muted text-[10px]">/ Target ≥{targetNdsi}</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Target ≥{targetNdsi} (Pending)</span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-canopy-800 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  ndsi >= targetNdsi
                    ? 'bg-gradient-to-r from-bio-lime to-bio-thriving'
                    : ndsi > 0
                    ? 'bg-bio-amber'
                    : 'bg-slate-700'
                }`}
                style={{ width: `${policy.measured_ndsi_score > 0 ? Math.min(100, ndsi) : targetNdsi}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-bio-muted">
              <span>0 (Anthrophony)</span>
              <span>50 (Balanced)</span>
              <span>100 (Virgin Biophony)</span>
            </div>
          </div>

          {/* Gunshots & Chainsaws badges */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-canopy-900 border border-canopy-750 flex items-center justify-between">
              <span className="text-bio-muted flex items-center gap-1 text-[11px]">
                <AlertOctagon className="w-3.5 h-3.5 text-bio-crisis" /> Gunshots:
              </span>
              <span className={`font-bold ${gunshots > 0 ? 'text-bio-crisis' : 'text-slate-300'}`}>
                {gunshots}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-canopy-900 border border-canopy-750 flex items-center justify-between">
              <span className="text-bio-muted flex items-center gap-1 text-[11px]">
                <Wrench className="w-3.5 h-3.5 text-bio-amber" /> Chainsaw:
              </span>
              <span className={`font-bold ${chainsaws >= 5 ? 'text-bio-amber' : 'text-slate-300'}`}>
                {chainsaws}m
              </span>
            </div>
          </div>

          {/* Reason Quote if Adjudicated */}
          {policy.reason && (
            <div className="p-3 rounded-xl bg-canopy-900/60 border border-canopy-750 text-xs">
              <span className="text-[10px] font-mono text-bio-lime uppercase font-bold block mb-1">
                Jury Evaluation Log:
              </span>
              <p className="text-slate-300 italic line-clamp-2">
                "{policy.reason}"
              </p>
            </div>
          )}

          {/* 72s Cooling-Off Warning Alert */}
          {policy.status === STATUS_AWAITING_PAYOUT && secondsLeft > 0 && (
            <div className="p-3 rounded-xl bg-bio-amber/15 border border-bio-amber/40 text-bio-amber text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin text-bio-amber" />
                <span>Challenge Window: <strong>{secondsLeft}s</strong> remaining</span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-bio-amber/20 px-1.5 py-0.5 rounded">
                Appealable
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="p-5 pt-0 space-y-2">
        {/* If Open: Submit Telemetry */}
        {(policy.status === STATUS_POLICY_OPEN || policy.status === STATUS_UNRESOLVED) && (
          <button
            onClick={() => onSubmitTelemetry(policy)}
            disabled={isActionLoading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-bio-cyan/20 border border-bio-cyan/40 hover:bg-bio-cyan/30 text-bio-cyan font-heading font-bold text-xs tracking-wider uppercase transition-colors"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Submit Audio Telemetry</span>
          </button>
        )}

        {/* If Telemetry Submitted: Adjudicate */}
        {policy.status === STATUS_TELEMETRY_SUBMITTED && (
          <button
            onClick={() => onAdjudicate(policy.policy_id)}
            disabled={isActionLoading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-bio-thriving to-emerald-600 hover:from-bio-lime hover:to-bio-thriving text-canopy-950 font-heading font-bold text-xs tracking-wider uppercase shadow-bio-glow transition-all active:scale-95 disabled:opacity-50"
          >
            {isActionLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-canopy-950" />
                <span>AI Jury Adjudicating...</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5 text-canopy-950" />
                <span>Run AI Bioacoustic Jury</span>
              </>
            )}
          </button>
        )}

        {/* If Awaiting Payout */}
        {policy.status === STATUS_AWAITING_PAYOUT && (
          <div className="grid grid-cols-2 gap-2">
            {/* Appeal button (Active within 72s cooling-off) */}
            <button
              onClick={() => onOpenAppeal(policy)}
              disabled={isActionLoading || secondsLeft === 0}
              className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-colors ${
                secondsLeft > 0
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30'
                  : 'bg-canopy-900 border-canopy-750 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Appeal (10%)</span>
            </button>

            {/* Finalize button (Active after 72s cooling-off) */}
            <button
              onClick={() => onFinalize(policy.policy_id)}
              disabled={isActionLoading || secondsLeft > 0}
              className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-heading font-bold text-xs tracking-wider uppercase transition-all active:scale-95 ${
                secondsLeft === 0
                  ? 'bg-bio-thriving text-canopy-950 hover:bg-bio-lime shadow-bio-glow'
                  : 'bg-canopy-900 border border-canopy-750 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isActionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Finalize Payout</span>
              )}
            </button>
          </div>
        )}

        {/* If Disputed: Supreme Tribunal Adjudication */}
        {policy.status === STATUS_DISPUTED && (
          <button
            onClick={() => onAdjudicateAppeal(policy.policy_id)}
            disabled={isActionLoading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-heading font-bold text-xs tracking-wider uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            {isActionLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Adjudicating Appeal...</span>
              </>
            ) : (
              <>
                <Scale className="w-3.5 h-3.5" />
                <span>Supreme Appellate Adjudication</span>
              </>
            )}
          </button>
        )}

        {/* Inspect Forensic Digest Modal trigger */}
        <button
          onClick={() => onInspect(policy)}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-canopy-900 hover:bg-canopy-750 border border-canopy-750 text-slate-300 font-mono text-xs transition-colors"
        >
          <span>Inspect Spectrogram Audit</span>
          <ChevronRight className="w-3.5 h-3.5 text-bio-muted" />
        </button>
      </div>
    </div>
  );
};
