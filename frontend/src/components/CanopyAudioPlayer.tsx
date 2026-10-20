import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Radio, Sparkles, Activity } from 'lucide-react';

interface CanopyAudioPlayerProps {
  isPlaying: boolean;
  onToggle: () => void;
  ndsiScore?: number;
  hasGunshot?: boolean;
  hasChainsaw?: boolean;
}

export const CanopyAudioPlayer: React.FC<CanopyAudioPlayerProps> = ({
  isPlaying,
  onToggle,
  ndsiScore = 75,
  hasGunshot = false,
  hasChainsaw = false,
}) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<any>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (isPlaying) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.15, ctx.currentTime);
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;

        // 1. Ambient Jungle Canopy Rustle (Pink Noise Generator)
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2) * 0.1;
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1200, ctx.currentTime);
        noiseFilter.Q.setValueAtTime(1.5, ctx.currentTime);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(masterGain);
        noiseNode.start();

        // 2. High Frequency Cicada / Orthoptera Oscillation (6.5 kHz)
        const cicadaOsc = ctx.createOscillator();
        const cicadaGain = ctx.createGain();
        cicadaOsc.type = 'triangle';
        cicadaOsc.frequency.setValueAtTime(6400, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(8, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(300, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(cicadaOsc.frequency);

        cicadaGain.gain.setValueAtTime(0.04, ctx.currentTime);
        cicadaOsc.connect(cicadaGain);
        cicadaGain.connect(masterGain);
        cicadaOsc.start();
        lfo.start();

        // 3. Periodic Tropical Birdsong Chirps
        intervalRef.current = setInterval(() => {
          if (!audioCtxRef.current || audioCtxRef.current.state !== 'running') return;
          const now = audioCtxRef.current.currentTime;
          const birdOsc = audioCtxRef.current.createOscillator();
          const birdGain = audioCtxRef.current.createGain();

          const baseFreq = 2600 + Math.random() * 1400;
          birdOsc.type = 'sine';
          birdOsc.frequency.setValueAtTime(baseFreq, now);
          birdOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);
          birdOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.18);

          birdGain.gain.setValueAtTime(0.001, now);
          birdGain.gain.linearRampToValueAtTime(0.08, now + 0.04);
          birdGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

          birdOsc.connect(birdGain);
          birdGain.connect(masterGain);

          birdOsc.start(now);
          birdOsc.stop(now + 0.25);
        }, 1800);
      } catch (e) {
        console.warn('Web Audio canopy synth error:', e);
      }
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [isPlaying]);

  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all duration-300 shadow-md ${
        isPlaying
          ? 'bg-bio-lime/20 border-bio-lime text-bio-lime shadow-bio-glow animate-pulse'
          : 'bg-canopy-950/80 border-canopy-700 text-slate-300 hover:text-white hover:border-canopy-600'
      }`}
      title={isPlaying ? 'Mute Rainforest Soundscape' : 'Listen to Live Rainforest Audio Telemetry'}
    >
      {isPlaying ? (
        <>
          <Volume2 className="w-4 h-4 text-bio-lime" />
          <span className="font-bold">Soundscape Active</span>
          <span className="flex items-center gap-0.5 ml-1">
            <span className="sound-bar h-2" />
            <span className="sound-bar h-4" />
            <span className="sound-bar h-3" />
          </span>
        </>
      ) : (
        <>
          <VolumeX className="w-4 h-4 text-slate-400" />
          <span>Listen to Soundscape</span>
        </>
      )}
    </button>
  );
};
