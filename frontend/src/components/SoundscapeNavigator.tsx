import React from 'react';
import {
  Radio,
  Search,
  Filter,
  Trees,
  Plus,
  Volume2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Scale,
  Clock,
  ChevronRight,
  Flame,
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
import { getStatusMeta, formatGen, truncateAddress } from '../utils/formatters';

interface SoundscapeNavigatorProps {
  policies: ConservationPolicyData[];
  selectedPolicyId: string | null;
  onSelectPolicy: (policy: ConservationPolicyData) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onOpenCreatePolicy: () => void;
}

export const SoundscapeNavigator: React.FC<SoundscapeNavigatorProps> = ({
  policies,
  selectedPolicyId,
  onSelectPolicy,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenCreatePolicy,
}) => {
  const filteredPolicies = policies.filter((p) => {
    if (statusFilter === 'active' && p.status !== STATUS_POLICY_OPEN && p.status !== STATUS_TELEMETRY_SUBMITTED) {
      return false;
    }
    if (statusFilter === 'awaiting' && p.status !== STATUS_AWAITING_PAYOUT) {
      return false;
    }
    if (
      statusFilter === 'settled' &&
      p.status !== STATUS_SETTLED_THRIVING &&
      p.status !== STATUS_SETTLED_PARTIAL &&
      p.status !== STATUS_SETTLED_TERMINATED
    ) {
      return false;
    }
    if (statusFilter === 'disputed' && p.status !== STATUS_DISPUTED) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = String(p.policy_id).toLowerCase().includes(q);
      const matchReserve = (p.forest_reserve_id || '').toLowerCase().includes(q);
      const matchSponsor = (p.sponsor || '').toLowerCase().includes(q);
      const matchRangers = (p.ranger_station || '').toLowerCase().includes(q);
      return matchId || matchReserve || matchSponsor || matchRangers;
    }
    return true;
  });

  return (
    <aside className="w-full lg:w-96 flex flex-col bg-canopy-900 border border-canopy-700/80 rounded-2xl shadow-xl overflow-hidden shrink-0">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-canopy-700/80 bg-canopy-950/60">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-bio-thriving animate-pulse" />
            <h2 className="font-heading font-bold text-sm tracking-wide text-white uppercase flex items-center gap-1.5">
              <span>Canopy Station Mesh</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-canopy-800 text-bio-lime border border-canopy-700">
                {policies.length}
              </span>
            </h2>
          </div>
          <button
            onClick={onOpenCreatePolicy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bio-thriving/20 hover:bg-bio-thriving border border-bio-thriving text-bio-lime hover:text-canopy-950 font-mono text-[11px] font-bold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Escrow</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full mb-3">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-bio-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reserve, ID, station..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-canopy-850 border border-canopy-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-bio-thriving"
          />
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-mono">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Listening' },
            { id: 'awaiting', label: 'Cooling' },
            { id: 'disputed', label: 'Appeals' },
            { id: 'settled', label: 'Settled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusFilterChange(tab.id)}
              className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-bio-thriving text-canopy-950 font-bold'
                  : 'bg-canopy-850 text-bio-muted hover:text-white border border-canopy-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reserves List */}
      <div className="flex-1 overflow-y-auto divide-y divide-canopy-750/50 max-h-[calc(100vh-320px)] lg:max-h-[680px]">
        {filteredPolicies.length > 0 ? (
          filteredPolicies.map((policy) => {
            const isSelected = selectedPolicyId === policy.policy_id;
            const meta = getStatusMeta(policy.status);
            const hasGunshot = (policy.gunshot_events_detected || 0) > 0;
            const hasChainsaw = (policy.chainsaw_minutes_detected || 0) > 0;
            const ndsi = policy.measured_ndsi_score || 0;

            return (
              <div
                key={policy.policy_id}
                onClick={() => onSelectPolicy(policy)}
                className={`p-3.5 cursor-pointer transition-all flex flex-col gap-2 relative ${
                  isSelected
                    ? 'bg-canopy-800/90 border-l-4 border-l-bio-thriving shadow-hud'
                    : 'bg-canopy-900 hover:bg-canopy-850/80 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-bio-muted">
                      #{policy.policy_id}
                    </span>
                    <h4 className="font-heading font-bold text-xs text-white truncate max-w-[170px]">
                      {policy.forest_reserve_id || `Reserve-${policy.policy_id}`}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${meta.bgColor} ${meta.color} ${meta.borderColor}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{meta.label}</span>
                  </span>
                </div>

                {/* Subtitle / Metrics */}
                <div className="flex items-center justify-between text-[11px] font-mono text-bio-muted">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{formatGen(policy.escrow_amount)} GEN</span>
                    <span>•</span>
                    <span className={ndsi >= (policy.min_ndsi_threshold || 60) ? 'text-bio-thriving' : 'text-bio-amber'}>
                      NDSI: {ndsi}%
                    </span>
                  </div>

                  {/* Threat tags */}
                  <div className="flex items-center gap-1">
                    {hasGunshot && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-bio-crisis/20 text-bio-crisis border border-bio-crisis/40">
                        POACHING
                      </span>
                    )}
                    {hasChainsaw && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-bio-amber/20 text-bio-amber border border-bio-amber/40">
                        CHAINSAW
                      </span>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-bio-thriving translate-x-0.5' : 'text-slate-600'}`} />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-bio-muted font-mono text-xs space-y-2">
            <Trees className="w-8 h-8 mx-auto text-canopy-700" />
            <p>No reserves match your search criteria.</p>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 bg-canopy-950/80 border-t border-canopy-700/80 flex items-center justify-between text-[11px] font-mono text-bio-muted">
        <span>Verified AI Soundscape Mesh</span>
        <span className="text-bio-thriving font-bold">100% On-Chain</span>
      </div>
    </aside>
  );
};
