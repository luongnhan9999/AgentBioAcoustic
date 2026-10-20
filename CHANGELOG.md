# 📜 Changelog — AgentBioAcoustic

All notable changes to the AgentBioAcoustic protocol will be documented in this file.

## [1.0.0] - 2026-10-20
### Added
- **Intelligent Contract (`contracts/contract.py`)**:
  - `ConservationPolicy` dataclass with `TreeMap` and `DynArray` storage.
  - Multi-validator on-chain consensus (`gl.vm.run_nondet`) evaluating bioacoustic spectrograms.
  - Non-deterministic web rendering (`gl.nondet.web.render`) with accredited life-sciences domain filtering.
  - Normalized Difference Soundscape Index (NDSI) scoring, chainsaw harmonic detection, and gunshot acoustic impulse analysis.
  - 24-block (~72s) cooling-off dispute window with 10% staked bond.
  - Non-settling `STATUS_UNRESOLVED` failsafe for network or parsing errors.
  - Pull-payment `_safe_transfer` and `claim_payout` fallback mechanism.
- **Pytest Test Suite (`tests/test_agentbioacoustic.py`)**:
  - 9 comprehensive test suites with 100% pass rate.
  - Mock GenVM simulation fixture (`tests/conftest.py`).
- **Live Studionet Deployment (`scripts/deploy_studionet.py`)**:
  - Contract deployed to GenLayer Studionet at address `0x26214bB35532a4AC9F3d6c3ca2Af442eC264027F`.
  - Authoritative receipt recorded in `deployment.json`.
- **Frontend Dashboard (`frontend/`)**:
  - Rainforest Acoustic Monitoring Radar theme built with React 18, Vite, TypeScript, and TailwindCSS.
  - Integration with MetaMask and GenLayer Studionet RPC (Hex `0xF22F`).
  - Interactive policy management, audio telemetry submission, forensic inspector modal, appeal dispute portal, and pull-payment claims.
