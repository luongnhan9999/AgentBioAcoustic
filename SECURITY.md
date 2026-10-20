# 🛡️ Security Model & Threat Vectors — AgentBioAcoustic

## 1. Threat Modeling & Mitigation Analysis

| Threat Vector | Risk Description | Protocol Mitigation |
|---|---|---|
| **Adversarial Audio Spoofing** | Poachers or corrupt actors upload synthetic bird recordings to fake biodiversity. | Endpoints are strictly limited to authenticated accredited repositories (`ACCREDITED_BIOACOUSTIC_SOURCES`). Unaccredited URLs are rejected at contract call. |
| **Prompt Injection Attacks** | Malicious audio file metadata contains prompt injections attempting to force a 100% payout. | Sandboxed JSON extraction with `CANARY_AGENT_BIO_ACOUSTIC_V1`. Any canary mismatch immediately redirects to `STATUS_UNRESOLVED`. |
| **Premature Fund Drainage** | Malicious party settles payout before counterparty can review evidence. | Strict 24-block (~72 seconds) cooling-off challenge window enforced on-chain via consensus block timestamp. |
| **Frivolous Appellate Denial-of-Service** | Bad actor spams appeals to delay disbursements to indigenous rangers. | Requires a **10% staked dispute bond** that is permanently forfeited to counterparty upon appeal dismissal. |
| **Re-entrancy & Stuck Funds** | Outbound transfer reverts or exploits contract callbacks. | Implementation of `_safe_transfer` with pull-payment fallback buffering into `claimable_balances[recipient]`. |
| **Double-Claim / Replay** | Stakeholders repeatedly execute `finalize_settlement`. | Escrow state cleared to `0` prior to any fund dispatch (`p.escrow_amount = 0`). |
| **Network Timeout or Sensor Blackout** | Sensor hardware offline or endpoint returns 404/500 error. | Automatically categorized into non-settling `STATUS_UNRESOLVED`, preserving escrow safety. |

---

## 2. Canary Defense Specification
Every prompt submitted to GenVM contains an isolated canary token:
```python
CANARY_TOKEN = "CANARY_AGENT_BIO_ACOUSTIC_V1"
```
The validator logic in `contracts/contract.py` validates that:
1. Return object is a JSON dictionary.
2. The `canary` field is present and strictly equals `CANARY_AGENT_BIO_ACOUSTIC_V1`.
3. The verdict belongs strictly to the enumerated whitelist:
   - `BIODIVERSITY_THRIVING_FULL`
   - `ANTHROPOGENIC_DISTURBANCE_PENALTY`
   - `POACHING_CRISIS_TERMINATED`

Any deviation marks the policy as `STATUS_UNRESOLVED` and halts fund movement.
