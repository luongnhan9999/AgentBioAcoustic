import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Navbar,
} from './components/Navbar';
import {
  StatsOverview,
} from './components/StatsOverview';
import {
  PolicyCard,
} from './components/PolicyCard';
import {
  SoundscapeNavigator,
} from './components/SoundscapeNavigator';
import {
  BioacousticCommandStage,
} from './components/BioacousticCommandStage';
import {
  PoliciesTable,
} from './components/PoliciesTable';
import {
  CreatePolicyModal,
} from './components/CreatePolicyModal';
import {
  SubmitTelemetryModal,
} from './components/SubmitTelemetryModal';
import {
  AcousticInspectorModal,
} from './components/AcousticInspectorModal';
import {
  AppealModal,
} from './components/AppealModal';
import {
  PullPayoutButton,
} from './components/PullPayoutButton';
import {
  DEFAULT_CONTRACT_ADDRESS,
  getSavedContractAddress,
  STUDIONET_CHAIN_ID_HEX,
  fetchStudionetBalance,
  callContractView,
  writeContract,
  switchToStudionet,
  ConservationPolicyData,
  ProtocolStats,
  STATUS_POLICY_OPEN,
  STATUS_TELEMETRY_SUBMITTED,
  STATUS_AWAITING_PAYOUT,
  STATUS_SETTLED_THRIVING,
  STATUS_SETTLED_PARTIAL,
  STATUS_SETTLED_TERMINATED,
  STATUS_DISPUTED,
} from './config/genlayer';
import {
  Radio,
  Trees,
  LayoutDashboard,
  Table as TableIcon,
  Grid,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { parseGenToWei } from './utils/formatters';

type ViewMode = 'observatory' | 'grid' | 'table';

export function App() {
  const [contractAddress, setContractAddress] = useState<string>(getSavedContractAddress());
  const [userAddress, setUserAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.000');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);

  const [policies, setPolicies] = useState<ConservationPolicyData[]>([]);
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Selected policy for Observatory War Room
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);

  // View mode switcher: 'observatory' (default high-tech command center), 'grid', 'table'
  const [viewMode, setViewMode] = useState<ViewMode>('observatory');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(false);
  const [isInspectOpen, setIsInspectOpen] = useState<boolean>(false);
  const [isAppealOpen, setIsAppealOpen] = useState<boolean>(false);
  const [modalPolicy, setModalPolicy] = useState<ConservationPolicyData | null>(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  /* -------------------------------------------------------------------------- */
  /*                          Wallet & Network Connection                       */
  /* -------------------------------------------------------------------------- */

  const checkNetwork = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
        setIsCorrectNetwork(String(chainId).toLowerCase() === STUDIONET_CHAIN_ID_HEX.toLowerCase());
      } catch (err) {
        console.warn('Network check error:', err);
      }
    }
  };

  const handleConnectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('MetaMask is not installed. Please install MetaMask to interact with GenLayer.');
      return;
    }

    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setUserAddress(accounts[0]);
        setIsConnected(true);
        await checkNetwork();
        const bal = await fetchStudionetBalance(accounts[0]);
        setBalance(bal);
      }
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
    }
  };

  const handleSwitchNetwork = async () => {
    const ok = await switchToStudionet();
    if (ok) {
      setIsCorrectNetwork(true);
      if (userAddress) {
        const bal = await fetchStudionetBalance(userAddress);
        setBalance(bal);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setUserAddress(accounts[0]);
          setIsConnected(true);
          fetchStudionetBalance(accounts[0]).then(setBalance);
        } else {
          setUserAddress('');
          setIsConnected(false);
        }
      });

      (window as any).ethereum.on('chainChanged', (chainId: string) => {
        setIsCorrectNetwork(String(chainId).toLowerCase() === STUDIONET_CHAIN_ID_HEX.toLowerCase());
        if (userAddress) {
          fetchStudionetBalance(userAddress).then(setBalance);
        }
      });

      // Auto check if already authorized
      (window as any).ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setUserAddress(accounts[0]);
          setIsConnected(true);
          checkNetwork();
          fetchStudionetBalance(accounts[0]).then(setBalance);
        }
      });
    }
  }, [userAddress]);

  /* -------------------------------------------------------------------------- */
  /*                            Fetch Contract Data                             */
  /* -------------------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    if (!contractAddress) return;
    try {
      setIsLoading(true);
      const [policiesRes, statsRes] = await Promise.all([
        callContractView(contractAddress, 'get_all_policies', []),
        callContractView(contractAddress, 'get_stats', []),
      ]);

      if (policiesRes) {
        const parsedPolicies: ConservationPolicyData[] = Array.isArray(policiesRes)
          ? policiesRes
          : typeof policiesRes === 'string'
          ? JSON.parse(policiesRes)
          : [];
        setPolicies(parsedPolicies);

        // Auto select first policy if none selected
        if (parsedPolicies.length > 0 && !selectedPolicyId) {
          setSelectedPolicyId(parsedPolicies[0].policy_id);
        }
      }

      if (statsRes) {
        const parsedStats: ProtocolStats =
          typeof statsRes === 'string' ? JSON.parse(statsRes) : statsRes;
        setStats(parsedStats);
      }

      if (userAddress) {
        const bal = await fetchStudionetBalance(userAddress);
        setBalance(bal);
      }
    } catch (err) {
      console.warn('Error fetching contract state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, userAddress, selectedPolicyId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Find active selected policy
  const activeSelectedPolicy = useMemo(() => {
    if (!selectedPolicyId && policies.length > 0) {
      return policies[0];
    }
    return policies.find((p) => p.policy_id === selectedPolicyId) || policies[0] || null;
  }, [policies, selectedPolicyId]);

  /* -------------------------------------------------------------------------- */
  /*                            Contract Write Actions                          */
  /* -------------------------------------------------------------------------- */

  const handleCreatePolicy = async (
    rangerStation: string,
    reserveId: string,
    minNdsi: number,
    durationBlocks: number,
    amountGen: string
  ) => {
    if (!isConnected || !userAddress) {
      await handleConnectWallet();
      return;
    }
    const wei = parseGenToWei(amountGen);
    showToast(`Submitting create_conservation_policy for ${reserveId}...`, 'info');
    await writeContract(
      contractAddress,
      userAddress,
      'create_conservation_policy',
      [rangerStation, reserveId, minNdsi, durationBlocks],
      wei
    );
    showToast(`Conservation policy created for ${reserveId}!`, 'success');
    await fetchData();
  };

  const handleSubmitTelemetry = async (policyId: string, feedUrl: string) => {
    if (!isConnected || !userAddress) {
      await handleConnectWallet();
      return;
    }
    showToast(`Uploading bioacoustic telemetry for Policy #${policyId}...`, 'info');
    await writeContract(
      contractAddress,
      userAddress,
      'submit_soundscape_telemetry',
      [policyId, feedUrl]
    );
    showToast(`Telemetry successfully registered! Ready for AI adjudication.`, 'success');
    await fetchData();
  };

  const handleAdjudicate = async (policyId: string) => {
    if (!isConnected || !userAddress) {
      await handleConnectWallet();
      return;
    }
    try {
      setActionLoadingId(policyId);
      showToast(`AI Bioacoustic Jury adjudicating soundscape health...`, 'info');
      await writeContract(
        contractAddress,
        userAddress,
        'adjudicate_soundscape_health',
        [policyId]
      );
      showToast(`Adjudication completed! Verdict rendered on-chain.`, 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err?.message || 'Adjudication failed.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAppeal = async (
    policyId: string,
    reason: string,
    supplementalUrl: string,
    bondWei: bigint
  ) => {
    if (!isConnected || !userAddress) {
      await handleConnectWallet();
      return;
    }
    showToast(`Staking 10% bond and filing appeal on Policy #${policyId}...`, 'info');
    await writeContract(
      contractAddress,
      userAddress,
      'appeal_verdict',
      [policyId, reason, supplementalUrl],
      bondWei
    );
    showToast(`Appeal filed! Policy moved to DISPUTED status.`, 'success');
    await fetchData();
  };

  const handleAdjudicateAppeal = async (policyId: string) => {
    if (!isConnected || !userAddress) {
      await handleConnectWallet();
      return;
    }
    try {
      setActionLoadingId(policyId);
      showToast(`Supreme Bioacoustic Appellate Court evaluating appeal...`, 'info');
      await writeContract(
        contractAddress,
        userAddress,
        'adjudicate_appeal',
        [policyId]
      );
      showToast(`Appellate adjudication concluded!`, 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err?.message || 'Appellate adjudication failed.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFinalize = async (policyId: string) => {
    if (!isConnected || !userAddress) {
      await handleConnectWallet();
      return;
    }
    try {
      setActionLoadingId(policyId);
      showToast(`Finalizing uncontested settlement for Policy #${policyId}...`, 'info');
      await writeContract(
        contractAddress,
        userAddress,
        'finalize_settlement',
        [policyId]
      );
      showToast(`Settlement finalized! Funds disbursed.`, 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err?.message || 'Finalization failed.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReclaim = async (policyId: string) => {
    if (!isConnected || !userAddress) {
      await handleConnectWallet();
      return;
    }
    try {
      setActionLoadingId(policyId);
      showToast(`Reclaiming expired escrow for Policy #${policyId}...`, 'info');
      await writeContract(
        contractAddress,
        userAddress,
        'cancel_or_reclaim',
        [policyId]
      );
      showToast(`Escrow reclaimed by sponsor!`, 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err?.message || 'Reclaim failed.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                            Filtering & Search                              */
  /* -------------------------------------------------------------------------- */

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
      const matchVerdict = (p.verdict || '').toLowerCase().includes(q);
      return matchId || matchReserve || matchSponsor || matchRangers || matchVerdict;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-canopy-900 text-slate-100 flex flex-col font-sans">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div
            className={`px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-xs font-mono font-medium ${
              toastMessage.type === 'success'
                ? 'bg-bio-thriving/20 border-bio-thriving text-bio-lime'
                : toastMessage.type === 'error'
                ? 'bg-bio-crisis/20 border-bio-crisis text-bio-crisis'
                : 'bg-bio-cyan/20 border-bio-cyan text-bio-cyan'
            }`}
          >
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        userAddress={userAddress}
        balance={balance}
        contractAddress={contractAddress}
        isConnected={isConnected}
        isCorrectNetwork={isCorrectNetwork}
        onConnect={handleConnectWallet}
        onSwitchNetwork={handleSwitchNetwork}
        onContractAddressChange={setContractAddress}
        onOpenCreatePolicy={() => setIsCreateOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Pull Payment Claim Widget */}
        <PullPayoutButton
          contractAddress={contractAddress}
          userAddress={userAddress}
          isConnected={isConnected}
          onPayoutClaimed={fetchData}
        />

        {/* Stats Overview */}
        <StatsOverview
          stats={stats}
          policyCount={policies.length}
          onOpenCreatePolicy={() => setIsCreateOpen(true)}
        />

        {/* Layout Mode Navigation & Refresh Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-canopy-850 border border-canopy-700/80 shadow-lg">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-bio-cyan animate-pulse" />
            <div>
              <h2 className="font-heading font-extrabold text-lg text-white">
                Bioacoustic Surveillance Observatory & Forensic War Room
              </h2>
              <p className="text-[11px] font-mono text-bio-muted">
                Non-deterministic acoustic telemetry oracle for autonomous rainforest conservation grants
              </p>
            </div>
          </div>

          {/* View Mode Switcher Pills */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-canopy-950 border border-canopy-700 text-xs font-mono">
              <button
                onClick={() => setViewMode('observatory')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'observatory'
                    ? 'bg-bio-thriving text-canopy-950 font-bold shadow-sm'
                    : 'text-bio-muted hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Observatory</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-bio-thriving text-canopy-950 font-bold shadow-sm'
                    : 'text-bio-muted hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Ledger</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-bio-thriving text-canopy-950 font-bold shadow-sm'
                    : 'text-bio-muted hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Card Grid</span>
              </button>
            </div>

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-canopy-800 hover:bg-canopy-750 border border-canopy-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh State"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-bio-thriving' : ''}`} />
            </button>
          </div>
        </div>

        {/* VIEW 1: OBSERVATORY MASTER-DETAIL (COMMAND STAGE + SOUNDSCAPE NAVIGATOR) */}
        {viewMode === 'observatory' && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left Column: Soundscape Station Navigator */}
            <SoundscapeNavigator
              policies={policies}
              selectedPolicyId={activeSelectedPolicy?.policy_id || null}
              onSelectPolicy={(p) => setSelectedPolicyId(p.policy_id)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onOpenCreatePolicy={() => setIsCreateOpen(true)}
            />

            {/* Right/Center Column: Bioacoustic Command Stage */}
            {activeSelectedPolicy ? (
              <BioacousticCommandStage
                policy={activeSelectedPolicy}
                userAddress={userAddress}
                isConnected={isConnected}
                onSubmitTelemetry={(p) => {
                  setModalPolicy(p);
                  setIsTelemetryOpen(true);
                }}
                onAdjudicate={handleAdjudicate}
                onInspect={(p) => {
                  setModalPolicy(p);
                  setIsInspectOpen(true);
                }}
                onOpenAppeal={(p) => {
                  setModalPolicy(p);
                  setIsAppealOpen(true);
                }}
                onAdjudicateAppeal={handleAdjudicateAppeal}
                onFinalize={handleFinalize}
                onReclaim={handleReclaim}
                actionLoadingId={actionLoadingId}
              />
            ) : (
              <div className="flex-1 p-12 text-center rounded-2xl bg-canopy-850 border border-canopy-700 space-y-4">
                <Trees className="w-12 h-12 mx-auto text-bio-muted" />
                <h3 className="font-heading font-bold text-lg text-white">No Reserve Selected</h3>
                <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
                  Deploy your first habitat escrow to initiate continuous acoustic canopy monitoring.
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-bio-thriving text-canopy-950 font-heading font-bold text-xs uppercase"
                >
                  Deploy First Escrow
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: HIGH-DENSITY AUDIT TABLE */}
        {viewMode === 'table' && (
          <PoliciesTable
            policies={filteredPolicies}
            onSelectPolicy={(p) => {
              setSelectedPolicyId(p.policy_id);
              setViewMode('observatory');
            }}
            onInspect={(p) => {
              setModalPolicy(p);
              setIsInspectOpen(true);
            }}
            selectedPolicyId={activeSelectedPolicy?.policy_id || null}
          />
        )}

        {/* VIEW 3: CLASSIC CARD GRID */}
        {viewMode === 'grid' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-bio-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Reserve name, Policy ID, Sponsor, or Rangers..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-canopy-850 border border-canopy-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-bio-thriving"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-canopy-850 border border-canopy-700 text-xs font-mono overflow-x-auto w-full sm:w-auto">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Listening' },
                  { id: 'awaiting', label: 'Cooling' },
                  { id: 'disputed', label: 'Appeals' },
                  { id: 'settled', label: 'Settled' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                      statusFilter === tab.id
                        ? 'bg-bio-thriving text-canopy-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredPolicies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPolicies.map((policy) => (
                  <PolicyCard
                    key={policy.policy_id}
                    policy={policy}
                    userAddress={userAddress}
                    isConnected={isConnected}
                    onSubmitTelemetry={(p) => {
                      setModalPolicy(p);
                      setIsTelemetryOpen(true);
                    }}
                    onAdjudicate={handleAdjudicate}
                    onInspect={(p) => {
                      setModalPolicy(p);
                      setIsInspectOpen(true);
                    }}
                    onOpenAppeal={(p) => {
                      setModalPolicy(p);
                      setIsAppealOpen(true);
                    }}
                    onAdjudicateAppeal={handleAdjudicateAppeal}
                    onFinalize={handleFinalize}
                    onReclaim={handleReclaim}
                    actionLoadingId={actionLoadingId}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-canopy-850 border border-canopy-700 space-y-4">
                <Trees className="w-12 h-12 mx-auto text-bio-muted" />
                <h3 className="font-heading font-bold text-lg text-white">No Policies Found</h3>
                <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
                  No policies match active filters.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-canopy-700/80 bg-canopy-950 py-6 text-xs text-bio-muted font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-bio-thriving animate-pulse" />
            <span>AgentBioAcoustic • Powered by GenLayer StudioNet (Chain ID: 61999)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-bio-thriving transition-colors"
            >
              Studio Explorer
            </a>
            <span>•</span>
            <a
              href="https://arbimon.rfcx.org"
              target="_blank"
              rel="noreferrer"
              className="hover:text-bio-cyan transition-colors"
            >
              Rainforest Connection Arbimon
            </a>
            <span>•</span>
            <a
              href="https://gbif.org"
              target="_blank"
              rel="noreferrer"
              className="hover:text-bio-lime transition-colors"
            >
              GBIF Bioacoustics
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreatePolicyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreatePolicy}
        isSubmitting={isLoading}
      />

      <SubmitTelemetryModal
        policy={modalPolicy}
        isOpen={isTelemetryOpen}
        onClose={() => {
          setIsTelemetryOpen(false);
          setModalPolicy(null);
        }}
        onSubmit={handleSubmitTelemetry}
        isSubmitting={isLoading}
      />

      <AcousticInspectorModal
        policy={modalPolicy}
        isOpen={isInspectOpen}
        onClose={() => {
          setIsInspectOpen(false);
          setModalPolicy(null);
        }}
      />

      <AppealModal
        policy={modalPolicy}
        isOpen={isAppealOpen}
        onClose={() => {
          setIsAppealOpen(false);
          setModalPolicy(null);
        }}
        onSubmit={handleAppeal}
        isSubmitting={isLoading}
      />
    </div>
  );
}
