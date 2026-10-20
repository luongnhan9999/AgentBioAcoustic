import React from 'react';
import {
  Trees,
  Radio,
  FileSearch,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Scale,
  Eye,
  Check,
  Copy,
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
import { getStatusMeta, formatGen, formatDate, truncateAddress } from '../utils/formatters';

interface PoliciesTableProps {
  policies: ConservationPolicyData[];
  onSelectPolicy: (policy: ConservationPolicyData) => void;
  onInspect: (policy: ConservationPolicyData) => void;
  selectedPolicyId: string | null;
}

export const PoliciesTable: React.FC<PoliciesTableProps> = ({
  policies,
  onSelectPolicy,
  onInspect,
  selectedPolicyId,
}) => {
  return (
    <div className="rounded-2xl bg-canopy-900 border border-canopy-700/80 shadow-xl overflow-hidden">
      <div className="p-4 bg-canopy-950/70 border-b border-canopy-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trees className="w-5 h-5 text-bio-thriving" />
          <h3 className="font-heading font-bold text-sm text-white uppercase tracking-wider">
            All Rainforest Escrow Ledgers
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-canopy-800 text-bio-lime border border-canopy-700">
            {policies.length} Total
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-canopy-950 text-bio-muted uppercase tracking-wider text-[11px] border-b border-canopy-750">
            <tr>
              <th className="py-3.5 px-4 font-semibold">ID</th>
              <th className="py-3.5 px-4 font-semibold">Reserve & Station</th>
              <th className="py-3.5 px-4 font-semibold">Escrow (GEN)</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold">NDSI Ratio</th>
              <th className="py-3.5 px-4 font-semibold">Acoustic Threats</th>
              <th className="py-3.5 px-4 font-semibold">AI Verdict</th>
              <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-canopy-750/60">
            {policies.map((p) => {
              const meta = getStatusMeta(p.status);
              const isSelected = selectedPolicyId === p.policy_id;
              const gunshots = p.gunshot_events_detected || 0;
              const chainsaws = p.chainsaw_minutes_detected || 0;
              const ndsi = p.measured_ndsi_score || 0;

              return (
                <tr
                  key={p.policy_id}
                  className={`hover:bg-canopy-850/80 transition-colors ${
                    isSelected ? 'bg-canopy-800/80 font-bold' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-bio-muted">
                    #{p.policy_id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-white font-heading font-bold">{p.forest_reserve_id}</div>
                    <div className="text-[11px] text-bio-muted">{truncateAddress(p.ranger_station)}</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-bio-thriving">
                    {formatGen(p.escrow_amount)} GEN
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${meta.bgColor} ${meta.color} ${meta.borderColor}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{meta.label}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={ndsi >= (p.min_ndsi_threshold || 60) ? 'text-bio-thriving' : 'text-bio-amber'}>
                      {ndsi}% (Target: {p.min_ndsi_threshold}%)
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {gunshots === 0 && chainsaws === 0 ? (
                      <span className="text-bio-thriving text-[11px]">✓ Pristine Canopy</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {gunshots > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-bio-crisis/20 text-bio-crisis border border-bio-crisis/40 text-[10px]">
                            {gunshots} Gunshots
                          </span>
                        )}
                        {chainsaws > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-bio-amber/20 text-bio-amber border border-bio-amber/40 text-[10px]">
                            {chainsaws}m Saws
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {p.verdict || 'AWAITING_AUDIT'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectPolicy(p)}
                        className="px-2.5 py-1 rounded-lg bg-bio-thriving/20 hover:bg-bio-thriving text-bio-lime hover:text-canopy-950 font-mono text-[11px] transition-colors"
                      >
                        Observatory
                      </button>
                      <button
                        onClick={() => onInspect(p)}
                        className="p-1 rounded-lg bg-canopy-850 hover:bg-canopy-800 text-slate-300 hover:text-white"
                        title="Forensic Details"
                      >
                        <FileSearch className="w-4 h-4 text-bio-cyan" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
