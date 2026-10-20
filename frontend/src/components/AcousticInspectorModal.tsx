import React from 'react';
import {
  X,
  Radio,
  Activity,
  ShieldCheck,
  Volume2,
  AlertOctagon,
  Wrench,
  Hash,
  ExternalLink,
  Cpu,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ConservationPolicyData } from '../config/genlayer';
import { getStatusMeta, formatDate, formatGen, truncateAddress } from '../utils/formatters';

interface AcousticInspectorModalProps {
  policy: ConservationPolicyData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AcousticInspectorModal: React.FC<AcousticInspectorModalProps> = ({
  policy,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !policy) return null;

  const statusMeta = getStatusMeta(policy.status);
  const ndsi = policy.measured_ndsi_score || 0;
  const target = policy.min_ndsi_threshold || 60;
  const gunshots = policy.gunshot_events_detected || 0;
  const chainsaws = policy.chainsaw_minutes_detected || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-canopy-850 border border-canopy-700 p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bio-thriving via-bio-cyan to-bio-lime" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-canopy-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-bio-thriving/15 border border-bio-thriving/30 text-bio-thriving">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-xl text-white">Bioacoustic Forensic Audit</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-bio-cyan/15 text-bio-cyan border border-bio-cyan/30">
                  GenVM Consensus
                </span>
              </div>
              <p className="text-xs font-mono text-bio-muted">
                Policy #{policy.policy_id} — {policy.forest_reserve_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-canopy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-6 space-y-6">
          {/* Verdict Banner */}
          <div className="p-4 rounded-xl bg-canopy-900 border border-canopy-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono text-bio-muted uppercase">Consensus Verdict:</span>
              <div className="mt-1 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border ${statusMeta.badgeClass}`}>
                  {policy.verdict || 'PENDING EVALUATION'}
                </span>
                {policy.confidence > 0 && (
                  <span className="text-xs font-mono text-bio-lime">
                    {policy.confidence}% Confidence
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono text-bio-muted uppercase">Audit Timestamp:</span>
              <p className="font-mono text-xs text-slate-300 mt-1">
                {policy.audit_completed_time && policy.audit_completed_time !== '0'
                  ? formatDate(policy.audit_completed_time)
                  : 'Pending Completion'}
              </p>
            </div>
          </div>

          {/* Bioacoustic Spectrum Analyzer Simulation */}
          <div className="rounded-xl bg-canopy-950 border border-canopy-700 p-5 shadow-hud">
            <div className="flex items-center justify-between pb-3 border-b border-canopy-800 mb-4">
              <span className="text-xs font-mono text-bio-cyan flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" /> Real-time Spectrogram Harmonic Distribution
              </span>
              <span className="text-[11px] font-mono text-slate-400">100 Hz – 16 kHz</span>
            </div>

            {/* Sound bars animation */}
            <div className="h-28 flex items-end justify-between px-4 py-2 bg-canopy-900/60 rounded-lg border border-canopy-800/80">
              {Array.from({ length: 32 }).map((_, i) => {
                const heightPercent =
                  policy.verdict === 'POACHING_CRISIS_TERMINATED'
                    ? [20, 95, 30, 85, 25, 90, 15, 20, 15, 10][i % 10]
                    : policy.verdict === 'ANTHROPOGENIC_DISTURBANCE_PENALTY'
                    ? [70, 75, 80, 72, 68, 30, 25, 20, 22, 28][i % 10]
                    : [35, 60, 85, 95, 80, 90, 75, 82, 65, 50][i % 10];
                return (
                  <div
                    key={i}
                    className="w-1.5 sm:w-2 rounded-t transition-all duration-500"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor:
                        policy.verdict === 'POACHING_CRISIS_TERMINATED'
                          ? '#EF4444'
                          : policy.verdict === 'ANTHROPOGENIC_DISTURBANCE_PENALTY'
                          ? '#F59E0B'
                          : '#10B981',
                      opacity: 0.85,
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-mono text-bio-muted">
              <span>Anthrophony Bands (100–500Hz)</span>
              <span>Gibbon & Avian Calls (1–4kHz)</span>
              <span>Cicadas & Orthoptera (6–16kHz)</span>
            </div>
          </div>

          {/* 3 Metric Gauges in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* NDSI Score */}
            <div className="rounded-xl bg-canopy-900 border border-canopy-700 p-4">
              <span className="text-[11px] font-mono text-bio-muted uppercase">Measured NDSI Score:</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`font-mono text-3xl font-extrabold ${ndsi >= target ? 'text-bio-thriving' : 'text-bio-amber'}`}>
                  {ndsi}
                </span>
                <span className="text-xs font-mono text-bio-muted">/ Target ≥{target}</span>
              </div>
              <div className="mt-2 w-full h-1.5 rounded-full bg-canopy-950 overflow-hidden">
                <div
                  className={`h-full rounded-full ${ndsi >= target ? 'bg-bio-thriving' : 'bg-bio-amber'}`}
                  style={{ width: `${Math.min(100, ndsi)}%` }}
                />
              </div>
            </div>

            {/* Gunshot anomalies */}
            <div className="rounded-xl bg-canopy-900 border border-canopy-700 p-4">
              <span className="text-[11px] font-mono text-bio-muted uppercase">Gunshots Detected:</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`font-mono text-3xl font-extrabold ${gunshots > 0 ? 'text-bio-crisis' : 'text-bio-thriving'}`}>
                  {gunshots}
                </span>
                <span className="text-xs font-mono text-bio-muted">Impulses</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {gunshots > 0 ? 'Emergency poaching alert triggered' : 'Zero ballistic acoustic signatures'}
              </p>
            </div>

            {/* Chainsaw Minutes */}
            <div className="rounded-xl bg-canopy-900 border border-canopy-700 p-4">
              <span className="text-[11px] font-mono text-bio-muted uppercase">Chainsaw Activity:</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`font-mono text-3xl font-extrabold ${chainsaws >= 5 ? 'text-bio-amber' : 'text-bio-thriving'}`}>
                  {chainsaws}
                </span>
                <span className="text-xs font-mono text-bio-muted">Minutes</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {chainsaws >= 5 ? 'Anthropogenic logging penalty' : 'Within pristine ambient levels'}
              </p>
            </div>
          </div>

          {/* AI Tribunal Rationale */}
          <div className="p-4 rounded-xl bg-canopy-900 border border-canopy-700">
            <span className="text-[11px] font-mono text-bio-lime flex items-center gap-1.5 uppercase font-bold">
              <Cpu className="w-3.5 h-3.5" /> AI Chief Ecologist Rationale:
            </span>
            <p className="mt-2 text-sm text-slate-200 leading-relaxed font-sans italic bg-canopy-950 p-3 rounded-lg border border-canopy-800">
              "{policy.reason || 'Telemetry awaiting jury consensus run.'}"
            </p>
          </div>

          {/* Cryptographic SHA-256 Evidence Hash */}
          <div className="p-4 rounded-xl bg-canopy-900 border border-canopy-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-bio-muted uppercase flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> SHA-256 Telemetry Digest:
              </span>
              <span className="text-[10px] font-mono text-bio-cyan">Sealed on-chain</span>
            </div>
            <p className="font-mono text-xs text-bio-lime bg-canopy-950 p-2.5 rounded-lg border border-canopy-800 break-all select-all">
              {policy.evidence_hash || 'Pending stream ingestion'}
            </p>
          </div>

          {/* Audio Feed URL */}
          {policy.soundscape_feed_url && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-canopy-950 border border-canopy-700 text-xs">
              <span className="text-bio-muted font-mono truncate mr-2">
                Source: {policy.soundscape_feed_url}
              </span>
              <a
                href={policy.soundscape_feed_url}
                target="_blank"
                rel="noreferrer"
                className="text-bio-cyan hover:underline flex items-center gap-1 shrink-0 font-mono text-[11px]"
              >
                Inspect Feed <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
