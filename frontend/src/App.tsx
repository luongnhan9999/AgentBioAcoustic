import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Navbar,
} from './components/Navbar';
import {
  CanopyRadarMatrix,
} from './components/CanopyRadarMatrix';
import {
  SpectralWorkstation,
} from './components/SpectralWorkstation';
import {
  EscrowTribunalTerminal,
} from './components/EscrowTribunalTerminal';
import {
  PoliciesTable,
} from './components/PoliciesTable';
import {
  FloatingControlDock,
} from './components/FloatingControlDock';
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
  Compass,
  Sliders,
  Table as TableIcon,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatGen, parseGenToWei, truncateAddress } from './utils/formatters';

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

  // Selected policy
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);

  // View Mode: 'radar' (Canopy 360 Sonar), 'daw' (Spectral Audio Workstation), 'ledger' (Forensic Audit Table)
  const [viewMode, setViewMode] = useState<'radar' | 'daw' | 'ledger'>('radar');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(false);
  const [isInspectOpen, setIsInspectOpen] = useState<boolean>(false);
  const [isAppealOpen, setIsAppealOpen] = useState<boolean>(false);
  const [modalPolicy, setModalPolicy] = useState<ConservationPolicyData | null>(null);

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

      // Auto check authorization
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
  /*                            Fetch Contract State                            */
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

  // Active selected policy
  const activePolicy = useMemo(() => {
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

  return (
    <div className="min-h-screen bg-canopy-950 text-slate-100 flex flex-col font-sans pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-24 right-5 z-50 animate-in fade-in slide-in-from-top-5">
          <div
            className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 text-xs font-mono font-medium backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-bio-thriving/20 border-bio-thriving text-bio-lime shadow-bio-glow'
                : toastMessage.type === 'error'
                ? 'bg-bio-crisis/20 border-bio-crisis text-bio-crisis shadow-crisis-glow'
                : 'bg-bio-cyan/20 border-bio-cyan text-bio-cyan shadow-sonar-glow'
            }`}
          >
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Modern High-Tech Navbar */}
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

      {/* Cyberpunk Bio-Telemetry Live Strip */}
      <div className="w-full bg-canopy-900/80 border-b border-canopy-750 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-bio-thriving font-bold">
            <span className="w-2 h-2 rounded-full bg-bio-thriving animate-pulse" />
            <span>DEPIN CANOPY MESH: ONLINE</span>
          </div>
          <span className="hidden sm:inline text-canopy-700">|</span>
          <span className="hidden sm:inline text-bio-muted">UPLINK: 48kHz 24-bit PCM</span>
          <span className="hidden sm:inline text-canopy-700">|</span>
          <span className="text-bio-cyan">CHAIN ID: 61999 (STUDIONET)</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-bio-muted">
            GLOBAL TREASURY:{' '}
            <strong className="text-white">
              {stats ? formatGen(stats.total_conservation_locked, 2) : '0.00'} GEN
            </strong>
          </span>
          <span className="text-canopy-700">|</span>
          <span className="text-bio-lime">
            RESERVES ACTIVE: <strong className="text-white">{policies.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Observatory Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Pull Payment Claim Alert Bar */}
        <PullPayoutButton
          contractAddress={contractAddress}
          userAddress={userAddress}
          isConnected={isConnected}
          onPayoutClaimed={fetchData}
        />

        {/* VIEW 1: PANORAMIC 360° CANOPY RADAR & TRIBUNAL */}
        {viewMode === 'radar' && (
          <div className="space-y-6">
            <CanopyRadarMatrix
              policies={policies}
              selectedPolicyId={activePolicy?.policy_id || null}
              onSelectPolicy={(p) => setSelectedPolicyId(p.policy_id)}
              onOpenCreatePolicy={() => setIsCreateOpen(true)}
            />

            {activePolicy ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <SpectralWorkstation
                  policy={activePolicy}
                  onInspect={(p) => {
                    setModalPolicy(p);
                    setIsInspectOpen(true);
                  }}
                />

                <EscrowTribunalTerminal
                  policy={activePolicy}
                  userAddress={userAddress}
                  isConnected={isConnected}
                  onSubmitTelemetry={(p) => {
                    setModalPolicy(p);
                    setIsTelemetryOpen(true);
                  }}
                  onAdjudicate={handleAdjudicate}
                  onOpenAppeal={(p) => {
                    setModalPolicy(p);
                    setIsAppealOpen(true);
                  }}
                  onAdjudicateAppeal={handleAdjudicateAppeal}
                  onFinalize={handleFinalize}
                  onReclaim={handleReclaim}
                  actionLoadingId={actionLoadingId}
                />
              </div>
            ) : null}
          </div>
        )}

        {/* VIEW 2: FULL-SCREEN SPECTRAL DAW WORKSTATION */}
        {viewMode === 'daw' && activePolicy && (
          <div className="space-y-6">
            <SpectralWorkstation
              policy={activePolicy}
              onInspect={(p) => {
                setModalPolicy(p);
                setIsInspectOpen(true);
              }}
            />

            <EscrowTribunalTerminal
              policy={activePolicy}
              userAddress={userAddress}
              isConnected={isConnected}
              onSubmitTelemetry={(p) => {
                setModalPolicy(p);
                setIsTelemetryOpen(true);
              }}
              onAdjudicate={handleAdjudicate}
              onOpenAppeal={(p) => {
                setModalPolicy(p);
                setIsAppealOpen(true);
              }}
              onAdjudicateAppeal={handleAdjudicateAppeal}
              onFinalize={handleFinalize}
              onReclaim={handleReclaim}
              actionLoadingId={actionLoadingId}
            />
          </div>
        )}

        {/* VIEW 3: HIGH-DENSITY FORENSIC AUDIT LEDGER */}
        {viewMode === 'ledger' && (
          <div className="space-y-6">
            <PoliciesTable
              policies={policies}
              onSelectPolicy={(p) => {
                setSelectedPolicyId(p.policy_id);
                setViewMode('daw');
              }}
              onInspect={(p) => {
                setModalPolicy(p);
                setIsInspectOpen(true);
              }}
              selectedPolicyId={activePolicy?.policy_id || null}
            />
          </div>
        )}
      </main>

      {/* Floating Cyberpunk Bioacoustic Dock */}
      <FloatingControlDock
        viewMode={viewMode}
        onViewChange={setViewMode}
        onOpenCreatePolicy={() => setIsCreateOpen(true)}
        onRefresh={fetchData}
        isLoading={isLoading}
        activeReserveCount={policies.length}
        totalGenLocked={stats ? formatGen(stats.total_conservation_locked, 1) : '0'}
      />

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
