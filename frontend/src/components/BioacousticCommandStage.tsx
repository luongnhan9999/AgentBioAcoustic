import React, { useState, useEffect } from 'react';
import {
  Trees,
  Radio,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Scale,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Activity,
  FileSearch,
  Sparkles,
  Award,
  ChevronRight,
  Loader2,
  RefreshCw,
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
import { BioacousticCanvas } from './BioacousticCanvas';
import { CanopyAudioPlayer } from './CanopyAudioPlayer';

interface BioacousticCommandStageProps {
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

export const BioacousticCommandStage: React.FC<BioacousticCommandStageProps> = ({
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const statusMeta = getStatusMeta(policy.status);
  const isActionLoading = actionLoadingId === policy.policy_id;

  const userLower = userAddress?.toLowerCase() || '';
  const isSponsor = userLower === policy.sponsor?.toLowerCase();
  const isRanger = userLower === policy.ranger_station?.toLowerCase();

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

  const ndsi = policy.measured_ndsi_score || 0;
  const targetNdsi = policy.min_ndsi_threshold || 60;
  const gunshots = policy.gunshot_events_detected || 0;
  const chainsaws = policy.chainsaw_minutes_detected || 0;

  // Cooling-off percentage
  const coolingProgress = Math.min(100, Math.max(0, ((72 - secondsLeft) / 72) * 100));

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-canopy-900 border border-canopy-700/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-canopy-750 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-bio-muted bg-canopy-950 px-2.5 py-0.5 rounded-md border border-canopy-700">
                ESCROW POLICY #{policy.policy_id}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-0.5 rounded-full border ${statusMeta.bgColor} ${statusMeta.color} ${statusMeta.borderColor}`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span>{statusMeta.label}</span>
              </span>
            </div>
            <h1 className="font-heading font-extrabold text-2xl text-white tracking-tight flex items-center gap-2">
              <Trees className="w-6 h-6 text-bio-thriving shrink-0" />
              <span>{policy.forest_reserve_id || `Rainforest Reserve #${policy.policy_id}`}</span>
            </h1>
            <p className="text-xs font-mono text-bio-muted mt-1 flex items-center gap-2">
              <span>Sponsor: {truncateAddress(policy.sponsor)}</span>
              <span>•</span>
              <span>Rangers: {truncateAddress(policy.ranger_station)}</span>
            </p>
          </div>

          {/* Audio Synthesizer & Inspector Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAudioPlaying(!isAudioPlaying)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border font-mono text-xs font-bold transition-all ${
                isAudioPlaying
                  ? 'bg-bio-thriving/20 border-bio-thriving text-bio-lime shadow-bio-glow'
                  : 'bg-canopy-850 hover:bg-canopy-800 border-canopy-700 text-slate-300'
              }`}
            >
              {isAudioPlaying ? (
                <>
                  <Volume2 className="w-4 h-4 text-bio-thriving animate-pulse" />
                  <span>Synthesizer Active</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Listen Soundscape</span>
                </>
              )}
            </button>

            <button
              onClick={() => onInspect(policy)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-canopy-850 hover:bg-canopy-800 border border-canopy-700 text-xs font-mono text-slate-200 hover:text-white transition-colors"
            >
              <FileSearch className="w-4 h-4 text-bio-cyan" />
              <span>Forensics</span>
            </button>
          </div>
        </div>

        {/* Hidden Audio Player for Web Audio Synthesis */}
        <CanopyAudioPlayer
          isPlaying={isAudioPlaying}
          onToggle={() => setIsAudioPlaying(!isAudioPlaying)}
          ndsiScore={ndsi}
          hasGunshot={gunshots > 0}
          hasChainsaw={chainsaws > 0}
        />

        {/* Real-time Waterfall Spectrogram Visualizer */}
        <BioacousticCanvas
          ndsiScore={ndsi}
          gunshots={gunshots}
          chainsaws={chainsaws}
          statusText={statusMeta.label}
          isAudioPlaying={isAudioPlaying}
        />

        {/* Telemetry Source & Evidence Digest Bar */}
        <div className="p-3 rounded-xl bg-canopy-950/80 border border-canopy-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-bio-muted truncate">
            <Radio className="w-4 h-4 text-bio-cyan shrink-0" />
            <span className="text-slate-400">Audio Telemetry Feed:</span>
            {policy.soundscape_feed_url ? (
              <a
                href={policy.soundscape_feed_url}
                target="_blank"
                rel="noreferrer"
                className="text-bio-cyan hover:underline truncate max-w-sm flex items-center gap-1"
              >
                <span>{policy.soundscape_feed_url}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span className="text-slate-500 italic">Awaiting Ranger Station deployment...</span>
            )}
          </div>

          {policy.evidence_hash && policy.evidence_hash !== '0x' && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-500">SHA-256 Digest:</span>
              <button
                onClick={() => copyToClipboard(policy.evidence_hash, 'hash')}
                className="text-bio-thriving hover:underline font-bold flex items-center gap-1"
              >
                <span>{policy.evidence_hash.slice(0, 10)}...{policy.evidence_hash.slice(-8)}</span>
                {copiedKey === 'hash' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forensic Bioacoustic Analysis & Escrow Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: NDSI Dominance Meter */}
        <div className="p-5 rounded-2xl bg-canopy-900 border border-canopy-700/80 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-bio-muted uppercase tracking-wider">Soundscape NDSI</span>
            <span className="font-bold text-white">Target: &ge; {targetNdsi}%</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-heading font-extrabold text-3xl ${
                ndsi >= targetNdsi ? 'text-bio-thriving' : 'text-bio-amber'
              }`}
            >
              {ndsi > 0 ? `${ndsi}%` : '---'}
            </span>
            <span className="text-xs font-mono text-bio-muted">Biophony Dominance</span>
          </div>
          {/* Progress track */}
          <div className="w-full h-2.5 rounded-full bg-canopy-950 overflow-hidden border border-canopy-750">
            <div
              className={`h-full transition-all duration-700 ${
                ndsi >= targetNdsi ? 'bg-bio-thriving' : 'bg-bio-amber'
              }`}
              style={{ width: `${Math.min(100, ndsi)}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            {ndsi >= targetNdsi
              ? '✓ Biological sounds (birds, primates, anurans) dominate the acoustic spectrum.'
              : '⚠ Insufficient biophony density or elevated anthrophony baseline.'}
          </p>
        </div>

        {/* Metric 2: Poaching Gunshot Impulse Detector */}
        <div
          className={`p-5 rounded-2xl border shadow-xl space-y-3 transition-colors ${
            gunshots > 0
              ? 'bg-bio-crisis/10 border-bio-crisis'
              : 'bg-canopy-900 border-canopy-700/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-bio-muted uppercase tracking-wider">Gunshot Impulses</span>
            <span className="font-bold text-bio-crisis">0 Tolerance</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-heading font-extrabold text-3xl ${
                gunshots > 0 ? 'text-bio-crisis animate-pulse' : 'text-bio-thriving'
              }`}
            >
              {gunshots}
            </span>
            <span className="text-xs font-mono text-bio-muted">Shockwaves Detected</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-canopy-950 overflow-hidden border border-canopy-750">
            <div
              className="h-full bg-bio-crisis transition-all duration-700"
              style={{ width: `${Math.min(100, gunshots * 25)}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            {gunshots > 0
              ? 'CRITICAL ALERT: Explosive acoustic transient verified. Poaching crisis protocol triggered.'
              : '✓ Acoustic array confirms zero firearm impulses in reserve boundaries.'}
          </p>
        </div>

        {/* Metric 3: Chainsaw / Logging Harmonic Scanner */}
        <div
          className={`p-5 rounded-2xl border shadow-xl space-y-3 transition-colors ${
            chainsaws > 0
              ? 'bg-bio-amber/10 border-bio-amber'
              : 'bg-canopy-900 border-canopy-700/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-bio-muted uppercase tracking-wider">Chainsaw Harmonics</span>
            <span className="font-bold text-bio-amber">100-500 Hz Band</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-heading font-extrabold text-3xl ${
                chainsaws > 0 ? 'text-bio-amber' : 'text-bio-thriving'
              }`}
            >
              {chainsaws}m
            </span>
            <span className="text-xs font-mono text-bio-muted">Logging Activity</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-canopy-950 overflow-hidden border border-canopy-750">
            <div
              className="h-full bg-bio-amber transition-all duration-700"
              style={{ width: `${Math.min(100, chainsaws * 10)}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            {chainsaws > 0
              ? `WARNING: ${chainsaws} minutes of anthropic motor logging detected. 50% escrow penalty applies.`
              : '✓ Motorized equipment and logging saws absent from canopy soundscape.'}
          </p>
        </div>
      </div>

      {/* 72-Second Cooling-Off Challenge Bar (if active) */}
      {policy.status === STATUS_AWAITING_PAYOUT && (
        <div className="p-5 rounded-2xl bg-bio-amber/10 border border-bio-amber/50 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-bio-amber animate-spin" />
              <span className="font-bold text-white uppercase tracking-wider">
                Active 72-Second Dispute & Challenge Cooling Window (24 Blocks)
              </span>
            </div>
            <span className="font-bold text-bio-amber text-sm font-mono">
              {secondsLeft > 0 ? `${secondsLeft}s remaining` : 'Cooling Elapsed'}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-canopy-950 overflow-hidden border border-canopy-700 p-0.5">
            <div
              className="h-full bg-bio-amber rounded-full transition-all duration-1000 ease-linear shadow-sm"
              style={{ width: `${coolingProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-bio-muted">
            <span>Audit Timestamp: {formatDate(policy.audit_completed_time)}</span>
            <span>
              {secondsLeft > 0
                ? 'Appeals permitted with 10% staked bond. Final payout locked.'
                : 'Challenge window passed. Ready for finalize_settlement payout!'}
            </span>
          </div>
        </div>
      )}

      {/* AI Bioacoustic Jury Verdict Card */}
      <div className="p-6 rounded-2xl bg-canopy-900 border border-canopy-700/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-canopy-750 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-bio-thriving/10 text-bio-thriving border border-bio-thriving/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">
                GenLayer Non-Deterministic AI Bioacoustic Jury
              </h3>
              <p className="text-xs font-mono text-bio-muted">
                Consensus verified across independent LLM validator nodes via gl.nondet.web.render
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-canopy-950 text-bio-lime border border-canopy-700 flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-bio-thriving" />
              CANARY TOKEN VERIFIED
            </span>
            {policy.confidence > 0 && (
              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-canopy-950 text-white border border-canopy-700 font-bold">
                Confidence: {policy.confidence}%
              </span>
            )}
          </div>
        </div>

        {/* Verdict Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-canopy-950/70 border border-canopy-750 space-y-2">
            <span className="text-[11px] font-mono text-bio-muted uppercase tracking-wider">
              On-Chain Forensic Verdict
            </span>
            <div className="font-heading font-extrabold text-base text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-bio-thriving animate-pulse" />
              <span>{policy.verdict || 'AWAITING_TELEMETRY_INGESTION'}</span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              {policy.status === STATUS_SETTLED_THRIVING || policy.verdict === 'BIODIVERSITY_THRIVING_FULL'
                ? 'Full 100% escrow grant released to indigenous ranger station.'
                : policy.status === STATUS_SETTLED_PARTIAL || policy.verdict === 'ANTHROPOGENIC_DISTURBANCE_PENALTY'
                ? '50% escrow disbursed to rangers, 50% refunded to sponsor as penalty.'
                : policy.status === STATUS_SETTLED_TERMINATED || policy.verdict === 'POACHING_CRISIS_TERMINATED'
                ? '100% escrow refunded to sponsor emergency reserve fund.'
                : 'Jury will analyze acoustic telemetry once uploaded.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-canopy-950/70 border border-canopy-750 space-y-2">
            <span className="text-[11px] font-mono text-bio-muted uppercase tracking-wider">
              AI Magistrate Rationale
            </span>
            <p className="text-xs font-mono text-slate-300 leading-relaxed italic">
              "{policy.reason || 'No telemetry processed yet. Waiting for DePIN acoustic sensor upload.'}"
            </p>
          </div>
        </div>
      </div>

      {/* Escrow Financial Ledger & Participants */}
      <div className="p-6 rounded-2xl bg-canopy-900 border border-canopy-700/80 shadow-xl space-y-4">
        <h3 className="font-heading font-bold text-sm text-white uppercase tracking-wider">
          Conservation Escrow Ledger
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-canopy-950 border border-canopy-750">
            <span className="text-[11px] font-mono text-bio-muted">Escrow Grant</span>
            <div className="text-lg font-heading font-extrabold text-bio-thriving mt-0.5">
              {formatGen(policy.escrow_amount)} GEN
            </div>
          </div>
          <div className="p-3 rounded-xl bg-canopy-950 border border-canopy-750">
            <span className="text-[11px] font-mono text-bio-muted">Dispute Bond (10%)</span>
            <div className="text-lg font-heading font-extrabold text-bio-amber mt-0.5">
              {formatGen(policy.dispute_bond)} GEN
            </div>
          </div>
          <div className="p-3 rounded-xl bg-canopy-950 border border-canopy-750">
            <span className="text-[11px] font-mono text-bio-muted">Created Date</span>
            <div className="text-xs font-mono font-bold text-white mt-1">
              {formatDate(policy.created_at_time)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-canopy-950 border border-canopy-750">
            <span className="text-[11px] font-mono text-bio-muted">Policy Expiry</span>
            <div className="text-xs font-mono font-bold text-white mt-1">
              {formatDate(policy.expires_at_time)}
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Action Deck */}
      <div className="p-5 rounded-2xl bg-canopy-900 border border-canopy-700/80 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-sm text-white uppercase tracking-wider">
            Smart Contract Actions
          </h3>
          <span className="text-xs font-mono text-bio-muted">
            {isConnected ? `Connected: ${truncateAddress(userAddress)}` : 'Connect Wallet to execute transactions'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Action 1: Submit Telemetry (STATUS_POLICY_OPEN) */}
          {policy.status === STATUS_POLICY_OPEN && (
            <button
              onClick={() => onSubmitTelemetry(policy)}
              disabled={isActionLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bio-thriving text-canopy-950 font-heading font-bold text-xs uppercase tracking-wider hover:bg-bio-lime shadow-bio-glow transition-all disabled:opacity-50"
            >
              <Radio className="w-4 h-4" />
              <span>Submit Soundscape Telemetry</span>
            </button>
          )}

          {/* Action 2: Run AI Adjudication (STATUS_TELEMETRY_SUBMITTED) */}
          {policy.status === STATUS_TELEMETRY_SUBMITTED && (
            <button
              onClick={() => onAdjudicate(policy.policy_id)}
              disabled={isActionLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bio-cyan text-canopy-950 font-heading font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 shadow-sonar-glow transition-all disabled:opacity-50"
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Jury Deliberating...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Adjudicate Soundscape Health</span>
                </>
              )}
            </button>
          )}

          {/* Action 3: Appeal Verdict during Cooling-Off (STATUS_AWAITING_PAYOUT) */}
          {policy.status === STATUS_AWAITING_PAYOUT && (
            <>
              <button
                onClick={() => onOpenAppeal(policy)}
                disabled={isActionLoading || secondsLeft <= 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bio-amber/20 hover:bg-bio-amber/30 border border-bio-amber text-bio-amber font-heading font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Challenge Verdict (10% Bond)</span>
              </button>

              <button
                onClick={() => onFinalize(policy.policy_id)}
                disabled={isActionLoading || secondsLeft > 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all ${
                  secondsLeft > 0
                    ? 'bg-canopy-800 text-slate-500 border border-canopy-700 cursor-not-allowed'
                    : 'bg-bio-thriving text-canopy-950 hover:bg-bio-lime shadow-bio-glow'
                }`}
              >
                {isActionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finalizing Escrow...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Finalize Settlement ({secondsLeft > 0 ? `${secondsLeft}s` : 'Unlock Payout'})</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Action 4: Adjudicate Appeal (STATUS_DISPUTED) */}
          {policy.status === STATUS_DISPUTED && (
            <button
              onClick={() => onAdjudicateAppeal(policy.policy_id)}
              disabled={isActionLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bio-amber text-canopy-950 font-heading font-bold text-xs uppercase tracking-wider hover:bg-amber-400 shadow-warning-glow transition-all disabled:opacity-50"
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Supreme Court Adjudicating...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Convene Appellate Tribunal</span>
                </>
              )}
            </button>
          )}

          {/* Action 5: Reclaim Expired Escrow */}
          {policy.status === STATUS_POLICY_OPEN && (
            <button
              onClick={() => onReclaim(policy.policy_id)}
              disabled={isActionLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-canopy-850 hover:bg-canopy-800 border border-canopy-700 text-slate-400 hover:text-white font-mono text-xs transition-colors"
            >
              <span>Cancel / Reclaim</span>
            </button>
          )}

          {/* Forensic Deep Dive button */}
          <button
            onClick={() => onInspect(policy)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-canopy-850 hover:bg-canopy-800 border border-canopy-700 text-bio-cyan font-mono text-xs transition-colors"
          >
            <FileSearch className="w-4 h-4" />
            <span>Open Forensic Inspector</span>
          </button>
        </div>
      </div>
    </div>
  );
};
