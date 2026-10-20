import React, { useState, useEffect } from 'react';
import {
  Scale,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Trees,
  Loader2,
  Award,
  ChevronRight,
  UserCheck,
  Lock,
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
} from '../config/genlayer';
import { formatGen, formatDate, truncateAddress, getStatusMeta } from '../utils/formatters';

interface EscrowTribunalTerminalProps {
  policy: ConservationPolicyData;
  userAddress: string;
  isConnected: boolean;
  onSubmitTelemetry: (policy: ConservationPolicyData) => void;
  onAdjudicate: (policyId: string) => Promise<void>;
  onOpenAppeal: (policy: ConservationPolicyData) => void;
  onAdjudicateAppeal: (policyId: string) => Promise<void>;
  onFinalize: (policyId: string) => Promise<void>;
  onReclaim: (policyId: string) => Promise<void>;
  actionLoadingId: string | null;
}

export const EscrowTribunalTerminal: React.FC<EscrowTribunalTerminalProps> = ({
  policy,
  userAddress,
  isConnected,
  onSubmitTelemetry,
  onAdjudicate,
  onOpenAppeal,
  onAdjudicateAppeal,
  onFinalize,
  onReclaim,
  actionLoadingId,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const statusMeta = getStatusMeta(policy.status);
  const isActionLoading = actionLoadingId === policy.policy_id;

  // Role-Based Access Control (RBAC) Detection
  const userLower = userAddress?.toLowerCase() || '';
  const isSponsor = Boolean(userLower && userLower === policy.sponsor?.toLowerCase());
  const isRanger = Boolean(userLower && userLower === policy.ranger_station?.toLowerCase());

  // 72s Cooling-Off countdown
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

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const coolingProgress = Math.min(100, Math.max(0, ((72 - secondsLeft) / 72) * 100));

  return (
    <div className="rounded-3xl bg-canopy-950 border border-canopy-700/80 shadow-2xl p-6 flex flex-col justify-between gap-5">
      {/* Header */}
      <div className="border-b border-canopy-750 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-bio-thriving/10 text-bio-thriving border border-bio-thriving/30 shadow-bio-glow">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-base text-white uppercase tracking-wider">
              On-Chain AI Bioacoustic Jury & Escrow
            </h3>
            <p className="text-xs font-mono text-bio-muted">
              Non-deterministic LLM consensus oracle enforcing conservation disbursements
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${statusMeta.badgeClass}`}>
          {statusMeta.label}
        </span>
      </div>

      {/* RBAC Role Indicator Chip */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-canopy-900 border border-canopy-750 text-xs font-mono">
        <span className="text-bio-muted flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-bio-cyan" />
          <span>Connected Role:</span>
        </span>
        {isSponsor ? (
          <span className="px-2.5 py-0.5 rounded-full bg-bio-lime/20 text-bio-lime border border-bio-lime/50 font-bold">
            SPONSOR (ESCROW DONOR)
          </span>
        ) : isRanger ? (
          <span className="px-2.5 py-0.5 rounded-full bg-bio-cyan/20 text-bio-cyan border border-bio-cyan/50 font-bold">
            RANGER STATION (RESERVE PATROL)
          </span>
        ) : isConnected ? (
          <span className="px-2.5 py-0.5 rounded-full bg-canopy-800 text-slate-300 border border-canopy-700">
            PUBLIC AUDITOR / OBSERVER
          </span>
        ) : (
          <span className="text-slate-500 italic">Wallet Not Connected</span>
        )}
      </div>

      {/* 72-Second Challenge Window Countdown Widget (if active) */}
      {policy.status === STATUS_AWAITING_PAYOUT && (
        <div className="p-4 rounded-2xl bg-bio-amber/10 border border-bio-amber/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-bio-amber animate-spin" />
              <span className="font-bold text-white uppercase">72-Second Challenge Cooling Period</span>
            </div>
            <span className="font-bold text-bio-amber">{secondsLeft > 0 ? `${secondsLeft}s left` : 'Unlocked'}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-canopy-950 overflow-hidden border border-canopy-700">
            <div className="h-full bg-bio-amber transition-all duration-1000" style={{ width: `${coolingProgress}%` }} />
          </div>
          <p className="text-[11px] font-mono text-bio-muted">
            {secondsLeft > 0
              ? 'Appeals permitted with 10% staked dispute bond. Payout locked until timer expires.'
              : 'Challenge window passed! Stakeholders or owner can finalize payout.'}
          </p>
        </div>
      )}

      {/* AI Magistrate Rationale & Canary Token */}
      <div className="p-4 rounded-2xl bg-canopy-900 border border-canopy-750 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-bio-muted uppercase">Forensic Rationale</span>
          <span className="text-bio-thriving font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            CANARY_AGENT_BIO_ACOUSTIC_V1 [OK]
          </span>
        </div>
        <div className="p-3 rounded-xl bg-canopy-950/80 border border-canopy-700 font-mono text-xs text-slate-200 leading-relaxed italic">
          "{policy.reason || 'No telemetry uploaded yet. Awaiting DePIN AudioMoth audio spectrogram telemetry ingestion.'}"
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-bio-muted">
          <span>Verdict: <strong className="text-white">{policy.verdict || 'PENDING'}</strong></span>
          <span>Confidence: <strong className="text-bio-lime">{policy.confidence || 0}%</strong></span>
        </div>
      </div>

      {/* Financial Ledger Details */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-2xl bg-canopy-900 border border-canopy-750">
          <span className="text-bio-muted text-[11px]">Canopy Escrow</span>
          <div className="text-lg font-heading font-extrabold text-bio-thriving mt-0.5">
            {formatGen(policy.escrow_amount)} GEN
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-canopy-900 border border-canopy-750">
          <span className="text-bio-muted text-[11px]">Dispute Bond (10%)</span>
          <div className="text-lg font-heading font-extrabold text-bio-amber mt-0.5">
            {formatGen(policy.dispute_bond)} GEN
          </div>
        </div>
      </div>

      {/* Participants Addresses */}
      <div className="p-3.5 rounded-2xl bg-canopy-900/60 border border-canopy-750 space-y-1.5 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-bio-muted">Sponsor Donor:</span>
          <span className="text-white font-bold">{truncateAddress(policy.sponsor)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-bio-muted">Ranger Station:</span>
          <span className="text-bio-cyan font-bold">{truncateAddress(policy.ranger_station)}</span>
        </div>
      </div>

      {/* Smart Contract Actions Trigger Deck (Strict RBAC Enforcement) */}
      <div className="border-t border-canopy-750 pt-4 flex flex-wrap items-center gap-3">
        {policy.status === STATUS_POLICY_OPEN && (
          <div className="flex-1 flex flex-col gap-1">
            <button
              onClick={() => onSubmitTelemetry(policy)}
              disabled={isActionLoading || (!isRanger && isConnected)}
              className={`w-full py-3 px-4 rounded-2xl font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                isRanger || !isConnected
                  ? 'bg-bio-thriving hover:bg-bio-lime text-canopy-950 shadow-bio-glow'
                  : 'bg-canopy-800 text-slate-500 border border-canopy-700 cursor-not-allowed'
              }`}
            >
              {isRanger || !isConnected ? (
                <>
                  <Radio className="w-4 h-4" />
                  <span>Submit Soundscape Telemetry</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Only Ranger Station Can Submit Telemetry</span>
                </>
              )}
            </button>
          </div>
        )}

        {policy.status === STATUS_TELEMETRY_SUBMITTED && (
          <button
            onClick={() => onAdjudicate(policy.policy_id)}
            disabled={isActionLoading}
            className="flex-1 py-3 px-4 rounded-2xl bg-bio-cyan hover:bg-cyan-300 text-canopy-950 font-heading font-bold text-xs uppercase tracking-wider shadow-sonar-glow transition-all flex items-center justify-center gap-2"
          >
            {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
            <span>Adjudicate Soundscape Health</span>
          </button>
        )}

        {policy.status === STATUS_AWAITING_PAYOUT && (
          <>
            <button
              onClick={() => onOpenAppeal(policy)}
              disabled={isActionLoading || secondsLeft <= 0 || (!isSponsor && !isRanger && isConnected)}
              className={`py-3 px-4 rounded-2xl font-heading font-bold text-xs uppercase tracking-wider transition-all ${
                (isSponsor || isRanger || !isConnected) && secondsLeft > 0
                  ? 'bg-bio-amber/20 hover:bg-bio-amber/30 text-bio-amber border border-bio-amber'
                  : 'bg-canopy-800 text-slate-500 border border-canopy-700 cursor-not-allowed'
              }`}
              title={
                !isSponsor && !isRanger && isConnected
                  ? 'Only Sponsor or Ranger Station can file an appeal'
                  : secondsLeft <= 0
                  ? 'Cooling-off window has elapsed'
                  : 'Stake 10% bond to dispute verdict'
              }
            >
              Challenge (10% Bond)
            </button>

            <button
              onClick={() => onFinalize(policy.policy_id)}
              disabled={isActionLoading || secondsLeft > 0}
              className={`flex-1 py-3 px-4 rounded-2xl font-heading font-bold text-xs uppercase tracking-wider transition-all ${
                secondsLeft > 0
                  ? 'bg-canopy-800 text-slate-500 cursor-not-allowed border border-canopy-700'
                  : 'bg-bio-thriving hover:bg-bio-lime text-canopy-950 shadow-bio-glow'
              }`}
            >
              {isActionLoading ? 'Finalizing...' : `Finalize Settlement (${secondsLeft > 0 ? `${secondsLeft}s` : 'Unlock'})`}
            </button>
          </>
        )}

        {policy.status === STATUS_DISPUTED && (
          <button
            onClick={() => onAdjudicateAppeal(policy.policy_id)}
            disabled={isActionLoading}
            className="flex-1 py-3 px-4 rounded-2xl bg-bio-amber hover:bg-amber-400 text-canopy-950 font-heading font-bold text-xs uppercase tracking-wider shadow-warning-glow transition-all"
          >
            Convene Appellate Tribunal
          </button>
        )}

        {policy.status === STATUS_POLICY_OPEN && (
          <button
            onClick={() => onReclaim(policy.policy_id)}
            disabled={isActionLoading || (!isSponsor && isConnected)}
            className={`py-3 px-4 rounded-2xl font-mono text-xs transition-colors ${
              isSponsor || !isConnected
                ? 'bg-canopy-850 hover:bg-canopy-800 border border-canopy-700 text-slate-300 hover:text-white'
                : 'bg-canopy-900 border border-canopy-800 text-slate-600 cursor-not-allowed'
            }`}
            title={!isSponsor && isConnected ? 'Only Sponsor can reclaim expired escrow' : 'Reclaim if expired'}
          >
            Cancel / Reclaim
          </button>
        )}
      </div>
    </div>
  );
};
