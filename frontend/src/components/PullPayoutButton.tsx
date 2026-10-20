import React, { useState, useEffect } from 'react';
import { Coins, Loader2, ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import { callContractView, writeContract } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface PullPayoutButtonProps {
  contractAddress: string;
  userAddress: string;
  isConnected: boolean;
  onPayoutClaimed: () => void;
}

export const PullPayoutButton: React.FC<PullPayoutButtonProps> = ({
  contractAddress,
  userAddress,
  isConnected,
  onPayoutClaimed,
}) => {
  const [claimableBalance, setClaimableBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const fetchBalance = async () => {
    if (!isConnected || !userAddress || !contractAddress) return;
    try {
      setIsLoading(true);
      const balStr = await callContractView(contractAddress, 'get_claimable_balance', [userAddress]);
      setClaimableBalance(balStr || '0');
    } catch (err) {
      console.warn('Failed to fetch claimable balance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [contractAddress, userAddress, isConnected]);

  const handleClaim = async () => {
    if (!isConnected || !userAddress || !contractAddress) return;
    try {
      setIsClaiming(true);
      await writeContract(contractAddress, userAddress, 'claim_payout', []);
      setSuccess(true);
      await fetchBalance();
      onPayoutClaimed();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to claim buffered payout.');
    } finally {
      setIsClaiming(false);
    }
  };

  const hasFunds = BigInt(claimableBalance) > 0n;
  if (!isConnected || (!hasFunds && !success)) return null;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-bio-lime/15 via-bio-thriving/15 to-bio-cyan/15 border border-bio-thriving/40 shadow-bio-glow flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-bio-thriving/20 text-bio-thriving">
          <Coins className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <span className="text-xs font-mono text-bio-muted uppercase tracking-wider">
            Buffered Pull-Payment Balance Available:
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mono text-xl font-bold text-white">{formatGen(claimableBalance, 4)}</span>
            <span className="font-mono text-xs text-bio-thriving font-bold">GEN</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={isClaiming || !hasFunds}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-bio-thriving to-emerald-600 hover:from-bio-lime hover:to-bio-thriving text-canopy-950 font-heading font-bold text-sm tracking-wide shadow-lg active:scale-95 disabled:opacity-50 transition-all"
      >
        {isClaiming ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-canopy-950" />
            <span>Withdrawing to Wallet...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-canopy-950" />
            <span>Funds Transferred!</span>
          </>
        ) : (
          <>
            <ArrowDownCircle className="w-4 h-4 text-canopy-950" />
            <span>Claim Payout</span>
          </>
        )}
      </button>
    </div>
  );
};
