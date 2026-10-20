import React, { useState } from 'react';
import {
  X,
  Radio,
  FileAudio,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { ConservationPolicyData } from '../config/genlayer';

interface SubmitTelemetryModalProps {
  policy: ConservationPolicyData | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (policyId: string, feedUrl: string) => Promise<void>;
  isSubmitting: boolean;
}

const SAMPLE_FEEDS = [
  {
    name: 'Tam Dao National Park Arbimon Mic Sensor 01 (Dense Biophony)',
    url: 'https://arbimon.rfcx.org/api/v1/soundscapes/tamdao_ridge_sensor01.json',
    expected: 'BIODIVERSITY_THRIVING_FULL',
  },
  {
    name: 'Congo Basin Primary Forest Transect B (GBIF Audio Telemetry)',
    url: 'https://gbif.org/dataset/congo_audio_telemetry_jan.json',
    expected: 'ANTHROPOGENIC_DISTURBANCE_PENALTY (Chainsaw detected)',
  },
  {
    name: 'Sumatra Elephant Corridor RFCx Stream 09 (Poaching Crisis)',
    url: 'https://rfcx.org/streams/sumatra_ridge_sensor09.json',
    expected: 'POACHING_CRISIS_TERMINATED (Gunshot signatures)',
  },
  {
    name: 'Madagascar Lemur Habitat Sensor 02 (Xeno-Canto Repository)',
    url: 'https://xeno-canto.org/sounds/madagascar_station_2.json',
    expected: 'BIODIVERSITY_THRIVING_FULL',
  },
];

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

export const SubmitTelemetryModal: React.FC<SubmitTelemetryModalProps> = ({
  policy,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [feedUrl, setFeedUrl] = useState(
    'https://arbimon.rfcx.org/api/v1/soundscapes/tamdao_ridge_sensor01.json'
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !policy) return null;

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

  const accreditedValid = isAccredited(feedUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accreditedValid) {
      setError(
        'Telemetry must originate strictly from an accredited bioacoustic source: RFCx, Arbimon, GBIF, Xeno-Canto, Macaulay Library, Cornell, WildLabs, or OpenSoundscape.'
      );
      return;
    }

    try {
      await onSubmit(policy.policy_id, feedUrl.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit bioacoustic telemetry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-canopy-850 border border-canopy-700 p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bio-cyan via-bio-lime to-bio-thriving" />

        <div className="flex items-center justify-between pb-4 border-b border-canopy-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-bio-cyan/15 border border-bio-cyan/30 text-bio-cyan">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-white">Submit Bioacoustic Telemetry</h2>
              <p className="text-xs font-mono text-bio-muted">
                Policy #{policy.policy_id} — {policy.forest_reserve_id}
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
          {/* Quick Preset Feeds */}
          <div>
            <label className="block text-xs font-mono text-bio-muted uppercase tracking-wider mb-2">
              Select Accredited Bioacoustic Feed:
            </label>
            <div className="space-y-2">
              {SAMPLE_FEEDS.map((sample, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setFeedUrl(sample.url)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors flex flex-col gap-1 ${
                    feedUrl === sample.url
                      ? 'bg-bio-cyan/15 border-bio-cyan text-white font-medium'
                      : 'bg-canopy-900 border-canopy-700 text-slate-300 hover:border-canopy-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">{sample.name}</span>
                    <span className="text-[10px] font-mono text-bio-cyan uppercase">Accredited</span>
                  </div>
                  <span className="font-mono text-[11px] text-bio-muted truncate">{sample.url}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feed URL input */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Live Spectrogram / Audio Stream Endpoint (JSON/Audio):
            </label>
            <div className="relative">
              <FileAudio className="w-4 h-4 absolute left-3 top-3 text-bio-muted" />
              <input
                type="url"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://arbimon.rfcx.org/api/v1/..."
                className="w-full pl-9 pr-24 py-2.5 rounded-xl bg-canopy-950 border border-canopy-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-bio-cyan"
                required
              />
              <div className="absolute right-2.5 top-2.5">
                {accreditedValid ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bio-thriving/20 text-bio-thriving border border-bio-thriving/40">
                    <ShieldCheck className="w-3 h-3" /> Valid Domain
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bio-crisis/20 text-bio-crisis border border-bio-crisis/40">
                    Unauthorized
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-bio-muted">
              Must originate strictly from: rfcx.org, gbif.org, xeno-canto.org, macaulaylibrary.org, opensoundscape.org
            </p>
          </div>

          {/* Submit CTA */}
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
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-bio-cyan to-blue-600 hover:from-bio-lime hover:to-bio-cyan text-canopy-950 font-heading font-bold text-sm tracking-wide shadow-sonar-glow transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-canopy-950" />
                  <span>Submitting Telemetry...</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-canopy-950" />
                  <span>Upload Stream Telemetry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
