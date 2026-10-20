import React, { useState } from 'react';
import {
  ShieldAlert,
  Radio,
  Wallet,
  Settings,
  ExternalLink,
  ChevronDown,
  Activity,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import {
  STUDIONET_CHAIN_ID_HEX,
  STUDIO_URL,
  saveContractAddress,
} from '../config/genlayer';
import { truncateAddress } from '../utils/formatters';

interface NavbarProps {
  userAddress: string;
  balance: string;
  contractAddress: string;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  onConnect: () => void;
  onSwitchNetwork: () => void;
  onContractAddressChange: (newAddress: string) => void;
  onOpenCreatePolicy: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userAddress,
  balance,
  contractAddress,
  isConnected,
  isCorrectNetwork,
  onConnect,
  onSwitchNetwork,
  onContractAddressChange,
  onOpenCreatePolicy,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [customAddress, setCustomAddress] = useState(contractAddress);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAddress.trim().startsWith('0x') && customAddress.trim().length === 42) {
      saveContractAddress(customAddress.trim());
      onContractAddressChange(customAddress.trim());
      setShowSettings(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-canopy-950/90 backdrop-blur-md border-b border-canopy-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-bio-thriving/30 to-canopy-850 border border-bio-thriving/40 shadow-bio-glow">
              <Radio className="w-6 h-6 text-bio-thriving animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-bio-lime rounded-full ring-2 ring-canopy-950 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                  Agent<span className="text-bio-thriving">BioAcoustic</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold bg-bio-cyan/15 text-bio-cyan border border-bio-cyan/30">
                  StudioNet
                </span>
              </div>
              <p className="text-xs text-bio-muted font-mono tracking-tight hidden sm:block">
                Autonomous Rainforest Soundscape & Poaching Defense Oracle
              </p>
            </div>
          </div>

          {/* Actions & Wallet Area */}
          <div className="flex items-center gap-3">
            {/* Create Policy CTA */}
            <button
              onClick={onOpenCreatePolicy}
              className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-bio-thriving to-emerald-600 hover:from-bio-lime hover:to-bio-thriving text-canopy-950 font-heading font-bold text-sm tracking-wide shadow-bio-glow transition-all active:scale-95"
            >
              <ShieldAlert className="w-4 h-4 text-canopy-950" />
              <span>Lock Escrow</span>
            </button>

            {/* Network Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-canopy-850 border border-canopy-700 text-xs font-mono text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-bio-thriving animate-pulse' : 'bg-bio-crisis'}`} />
              <span>{isCorrectNetwork ? 'StudioNet 61999' : 'Wrong Network'}</span>
            </div>

            {/* Wallet Section */}
            {isConnected ? (
              <div className="flex items-center gap-2">
                {!isCorrectNetwork ? (
                  <button
                    onClick={onSwitchNetwork}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bio-crisis/20 border border-bio-crisis text-bio-crisis text-xs font-mono font-bold hover:bg-bio-crisis/30 transition-colors"
                  >
                    Switch to 0xF22F
                  </button>
                ) : (
                  <div className="flex items-center rounded-lg bg-canopy-850 border border-canopy-700 p-1">
                    <div className="px-3 py-1 font-mono text-xs text-bio-lime font-bold">
                      {balance} <span className="text-bio-muted text-[10px]">GEN</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-canopy-800 border border-canopy-700 font-mono text-xs text-slate-200">
                      <span>{truncateAddress(userAddress)}</span>
                      <button
                        onClick={() => handleCopy(userAddress)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Copy address"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-bio-thriving" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onConnect}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bio-cyan/20 border border-bio-cyan/40 hover:bg-bio-cyan/30 text-bio-cyan font-heading font-bold text-sm tracking-wide shadow-sonar-glow transition-all active:scale-95"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}

            {/* Contract Settings Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg bg-canopy-850 hover:bg-canopy-800 border border-canopy-700 text-slate-300 hover:text-white transition-colors"
                title="Contract Configuration"
              >
                <Settings className="w-4 h-4" />
              </button>

              {showSettings && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 p-4 rounded-xl bg-canopy-850 border border-canopy-700 shadow-2xl z-50 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-canopy-700 font-heading font-bold text-sm text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-bio-thriving" />
                      Contract Architecture
                    </span>
                    <a
                      href={`${STUDIO_URL}/contracts/${contractAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-bio-cyan hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      Studio View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <form onSubmit={handleSaveAddress} className="mt-3 space-y-3">
                    <div>
                      <label className="block text-[11px] text-bio-muted font-mono mb-1">
                        Authoritative Intelligent Contract Address:
                      </label>
                      <input
                        type="text"
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-1.5 rounded bg-canopy-950 border border-canopy-700 font-mono text-[11px] text-bio-lime focus:outline-none focus:border-bio-thriving"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSettings(false)}
                        className="px-3 py-1 rounded bg-canopy-800 text-slate-300 hover:bg-canopy-750"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded bg-bio-thriving text-canopy-950 font-bold hover:bg-bio-lime"
                      >
                        Save Contract
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
