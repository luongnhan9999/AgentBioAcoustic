# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json
import hashlib

CANARY_TOKEN = "CANARY_AGENT_BIO_ACOUSTIC_V1"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

# Time & Cooling-Off Parameters
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = bigint(COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK)  # 72 seconds
DEFAULT_CONSERVATION_EXPIRY_SECONDS = bigint(86400 * 30)              # 30 days coverage

# Lifecycle Statuses
STATUS_POLICY_OPEN = u8(0)         # Sponsor deposited grant, awaiting soundscape monitoring telemetry
STATUS_TELEMETRY_SUBMITTED = u8(1) # Ranger / DePIN submitted audio spectrogram & NDSI data
STATUS_AWAITING_PAYOUT = u8(2)     # AI Bioacoustic Jury rendered verdict, cooling-off active
STATUS_SETTLED_THRIVING = u8(3)    # Healthy bioacoustic density verified, 100% grant disbursed
STATUS_SETTLED_PARTIAL = u8(4)     # Anthropogenic disturbance / chainsaw detected, 50% penalty
STATUS_SETTLED_TERMINATED = u8(5)  # Severe poaching / acoustic collapse, 100% refunded to sponsor
STATUS_DISPUTED = u8(6)            # Under appellate review with 10% staked bond
STATUS_EXPIRED_RECLAIMED = u8(7)   # Policy expired with zero telemetry, reclaimed by sponsor
STATUS_UNRESOLVED = u8(8)          # Telemetry fetch, parse, or canary failure (protected non-settling state)


class ContractError(Exception):
    """Domain-specific error for AgentBioAcoustic protocol."""
    pass


def _to_address(val) -> Address:
    """Converts any Address, int, or str into a valid GenLayer Address instance."""
    if isinstance(val, Address):
        return val
    if isinstance(val, int):
        hex_str = f"0x{val:040x}"
        return Address(hex_str)
    if isinstance(val, str):
        clean = val.strip()
        if clean.startswith("0x") or clean.startswith("0X"):
            return Address(clean.lower())
        try:
            int_val = int(clean)
            return Address(f"0x{int_val:040x}")
        except ValueError:
            return Address(clean.lower())
    if isinstance(val, (bytes, bytearray)):
        return Address("0x" + val.hex())
    return Address(str(val))


def _addr_str(addr) -> str:
    """Safely format an Address or address-like value into a lowercase hex string."""
    if addr is None:
        return ZERO_ADDRESS
    if isinstance(addr, int):
        return f"0x{addr:040x}".lower()
    try:
        return addr.as_hex.lower()
    except Exception:
        return str(addr).lower()


def _get_sender() -> Address:
    """Safely obtain transaction sender across GenVM runtime versions."""
    try:
        raw = gl.message.sender_address
        return _to_address(raw)
    except Exception:
        try:
            raw = gl.message.sender
            return _to_address(raw)
        except Exception:
            raise ContractError("Cannot resolve sender address.")


ACCREDITED_BIOACOUSTIC_SOURCES = [
    "rfcx.org",
    "arbimon.rfcx.org",
    "gbif.org",
    "xeno-canto.org",
    "macaulaylibrary.org",
    "cornell.edu",
    "wildlabs.net",
    "opensoundscape.org",
]


def _is_accredited_bioacoustic_source(url: str) -> bool:
    """Verifies that soundscape evidence originates strictly from recognized bioacoustic repositories."""
    clean = str(url).strip().lower()
    if not (clean.startswith("http://") or clean.startswith("https://")):
        return False
    try:
        no_proto = clean.split("://", 1)[1]
        host = no_proto.split("/", 1)[0].split(":", 1)[0]
        for domain in ACCREDITED_BIOACOUSTIC_SOURCES:
            if host == domain or host.endswith("." + domain):
                return True
    except Exception:
        return False
    return False


@allow_storage
@dataclass
class ConservationPolicy:
    policy_id: str
    sponsor: Address               # Biodiversity Fund / Carbon-Nature DAO
    ranger_station: Address        # Indigenous Forest Patrol / Reserve Conservator
    dispute_initiator: Address     # Appellant who staked bond
    escrow_amount: bigint          # Locked conservation subsidy
    dispute_bond: bigint           # 10% appeal stake
    forest_reserve_id: str         # Reserve name / Well-defined GPS polygon
    min_ndsi_threshold: u8         # Target NDSI score (e.g., 60 = +0.20 normalized index)
    soundscape_feed_url: str       # Live bioacoustic stream or spectrogram endpoint
    evidence_hash: str             # SHA-256 snapshot of audio analysis payload
    status: u8
    verdict: str                   # "PENDING", "BIODIVERSITY_THRIVING_FULL", "ANTHROPOGENIC_DISTURBANCE_PENALTY", "POACHING_CRISIS_TERMINATED", "DISPUTED", "UNRESOLVED_*"
    original_verdict: str          # Preserved pre-appeal verdict
    reason: str
    confidence: u8
    measured_ndsi_score: u8        # Measured Normalized Difference Soundscape Index (0-100)
    gunshot_events_detected: u8    # Number of detected acoustic gunshot anomalies
    chainsaw_minutes_detected: u32 # Cumulative minutes of industrial chainsaw activity
    created_at_time: bigint        # Trusted Unix timestamp when policy was created
    expires_at_time: bigint        # Trusted Unix timestamp when coverage concludes
    audit_completed_time: bigint   # Trusted Unix timestamp when AI jury rendered verdict
    supplemental_evidence_url: str # Bound appellate evidence URL
    appeal_prior_verdict: str      # Verdict recorded before appeal was filed


class Contract(gl.Contract):
    """
    AgentBioAcoustic: Autonomous Rainforest Biodiversity Soundscape & Poaching Defense Oracle
    Target Network: GenLayer StudioNet (Chain ID: 61999)
    """
    policies: TreeMap[str, ConservationPolicy]
    policy_ids: DynArray[str]
    total_conservation_locked: bigint
    total_policies_settled: u32
    policy_counter: u64
    owner: Address
    claimable_balances: TreeMap[str, bigint]

    def __init__(self, initial_owner = None):
        deployer = Address(ZERO_ADDRESS)
        try:
            deployer = _get_sender()
        except Exception:
            pass

        target_owner = Address(ZERO_ADDRESS)
        if initial_owner is not None:
            try:
                candidate = _to_address(initial_owner)
                if _addr_str(candidate) != ZERO_ADDRESS:
                    target_owner = candidate
            except Exception:
                pass

        if _addr_str(target_owner) == ZERO_ADDRESS:
            target_owner = deployer

        self.owner = target_owner
        self.total_conservation_locked = bigint(0)
        self.total_policies_settled = u32(0)
        self.policy_counter = u64(0)

    def _resolve_pid(self, policy_id) -> str:
        return str(policy_id).strip()

    def _ensure_owner(self) -> None:
        if _addr_str(self.owner) == ZERO_ADDRESS:
            self.owner = _get_sender()

    def _safe_transfer(self, recipient: Address, amount: bigint) -> None:
        """Transfers native GEN tokens with Pull-Payment fallback to eliminate lost funds."""
        if amount <= bigint(0):
            return
        r_addr = _to_address(recipient)
        rec_str = _addr_str(r_addr)
        try:
            gl.get_contract_at(r_addr).emit_transfer(value=u256(int(amount)))
        except Exception:
            curr = self.claimable_balances.get(rec_str, bigint(0))
            self.claimable_balances[rec_str] = curr + amount

    def _get_current_timestamp(self) -> bigint:
        """Derives trusted Unix timestamp strictly from consensus context (gl.message_raw['datetime'])."""
        import calendar
        from datetime import datetime, timezone
        try:
            if hasattr(gl, "message_raw") and isinstance(gl.message_raw, dict):
                raw_val = gl.message_raw.get("datetime", "")
                if raw_val:
                    dt_str = str(raw_val).strip().replace("Z", "+00:00")
                    dt = datetime.fromisoformat(dt_str)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    ts = calendar.timegm(dt.utctimetuple())
                    if ts > 0:
                        return bigint(ts)
        except Exception:
            pass
        return bigint(1760000000)

    # ── Public Write Methods ──────────────────────────────────────────

    @gl.public.write.payable
    def create_conservation_policy(
        self,
        ranger_station: Address,
        forest_reserve_id: str,
        min_ndsi_threshold: u32,
        duration_blocks: u32
    ) -> str:
        """Sponsor locks biodiversity reward escrow for monitored rainforest habitat."""
        self._ensure_owner()
        escrow = bigint(gl.message.value)
        if escrow <= bigint(0):
            raise ContractError("Conservation policy escrow deposit must be greater than 0 GEN.")

        clean_reserve = str(forest_reserve_id).strip()
        if len(clean_reserve) < 4:
            raise ContractError("Valid forest reserve identifier required (>= 4 chars).")

        r_addr = _to_address(ranger_station)
        if _addr_str(r_addr) == ZERO_ADDRESS:
            raise ContractError("Valid ranger station address required.")

        s_addr = _to_address(_get_sender())
        if _addr_str(s_addr) == _addr_str(r_addr):
            raise ContractError("Sponsor cannot designate themselves as ranger station.")

        dur_secs = bigint(int(duration_blocks) * 3 if int(duration_blocks) > 0 else int(DEFAULT_CONSERVATION_EXPIRY_SECONDS))

        self.policy_counter = self.policy_counter + u64(1)
        policy_id = str(self.policy_counter)
        current_time = self._get_current_timestamp()
        expires_at = current_time + dur_secs
        empty_addr = Address(ZERO_ADDRESS)

        new_policy = ConservationPolicy(
            policy_id=policy_id,
            sponsor=s_addr,
            ranger_station=r_addr,
            dispute_initiator=empty_addr,
            escrow_amount=escrow,
            dispute_bond=bigint(0),
            forest_reserve_id=clean_reserve,
            min_ndsi_threshold=u8(min(100, int(min_ndsi_threshold))),
            soundscape_feed_url="",
            evidence_hash="",
            status=STATUS_POLICY_OPEN,
            verdict="PENDING",
            original_verdict="PENDING",
            reason="Conservation policy active. Monitored for bioacoustic health and anti-poaching audio signatures.",
            confidence=u8(0),
            measured_ndsi_score=u8(0),
            gunshot_events_detected=u8(0),
            chainsaw_minutes_detected=u32(0),
            created_at_time=current_time,
            expires_at_time=expires_at,
            audit_completed_time=bigint(0),
            supplemental_evidence_url="",
            appeal_prior_verdict="",
        )

        self.policies[policy_id] = new_policy
        self.policy_ids.append(policy_id)
        self.total_conservation_locked = self.total_conservation_locked + escrow
        return policy_id

    @gl.public.write
    def submit_soundscape_telemetry(
        self,
        policy_id: str,
        soundscape_feed_url: str
    ) -> None:
        """Rangers submit bioacoustic stream link from deployed forest microphone mesh."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status not in (STATUS_POLICY_OPEN, STATUS_UNRESOLVED):
            raise ContractError("Policy is not open for telemetry submission.")

        sender = _get_sender()
        if _addr_str(sender) != _addr_str(p.ranger_station):
            raise ContractError("Role Violation: Only registered ranger station can submit soundscape telemetry.")

        clean_url = str(soundscape_feed_url).strip()
        if not _is_accredited_bioacoustic_source(clean_url):
            raise ContractError("Telemetry unauthenticated: Must originate from an accredited bioacoustic source (RFCx, Arbimon, GBIF, Xeno-Canto).")

        current_time = self._get_current_timestamp()
        if current_time > p.expires_at_time:
            raise ContractError("Coverage duration for this policy has expired.")

        p.soundscape_feed_url = clean_url
        p.status = STATUS_TELEMETRY_SUBMITTED
        p.reason = "Bioacoustic telemetry submitted. Ready for on-chain AI Tribunal verification."

    @gl.public.write
    def adjudicate_soundscape_health(self, policy_id: str) -> None:
        """AI Bioacoustic Jury evaluates biophony density, gunshot acoustics, and chainsaw frequencies."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status not in (STATUS_TELEMETRY_SUBMITTED, STATUS_UNRESOLVED):
            raise ContractError("Policy is not awaiting soundscape adjudication.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.sponsor)
            and sender_str != _addr_str(p.ranger_station)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only sponsor, ranger station, or owner can trigger adjudication.")

        feed_url = p.soundscape_feed_url
        reserve = p.forest_reserve_id
        target_ndsi = int(p.min_ndsi_threshold)

        def leader_fn():
            raw_feed = ""
            try:
                raw_feed = gl.nondet.web.render(feed_url, mode="text")
            except Exception:
                pass

            if not raw_feed:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_FETCH_FAILED",
                    "confidence": 0,
                    "measured_ndsi_score": 0,
                    "gunshot_events_detected": 0,
                    "chainsaw_minutes_detected": 0,
                    "reason": "Bioacoustic telemetry stream unreachable or empty.",
                    "evidence_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                }

            ev_hash = hashlib.sha256(raw_feed.encode("utf-8")).hexdigest()

            prompt = f"""You are the Chief Bioacoustic Ecologist and Wildlife Conservation Magistrate on GenLayer.
Evaluate the audio spectrogram telemetry for forest reserve: {reserve}.
TARGET NDSI SCORE: >= {target_ndsi} (Biophony dominant soundscape)

BIOACOUSTIC TELEMETRY DATA:
<audio_spectrogram_payload>
{raw_feed[:4000]}
</audio_spectrogram_payload>

EVALUATION RUBRIC:
1. Extract Normalized Difference Soundscape Index (NDSI Score 0-100), where >50 indicates biophony (birds/primates/insects) outweighs anthrophony (engine noise).
2. Count gunshot acoustic impulses (sharp rise-time >120dB peaks).
3. Sum cumulative chainsaw engine drone minutes (harmonic acoustic bands around 100-500 Hz).
4. Decision Matrix:
   - Poaching Crisis / Severe Deforestation: Gunshots >= 1 OR Chainsaw Minutes >= 60 OR NDSI < 30:
     Output "POACHING_CRISIS_TERMINATED" (100% refund to sponsor, emergency alert triggered).
   - Moderate Disturbance: Chainsaw Minutes between 5 and 59 OR NDSI between 30 and ({target_ndsi} - 1):
     Output "ANTHROPOGENIC_DISTURBANCE_PENALTY" (50% penalty to rangers, 50% preserved).
   - Biodiversity Thriving: Zero gunshots, Chainsaw Minutes < 5, AND NDSI >= {target_ndsi}:
     Output "BIODIVERSITY_THRIVING_FULL" (100% grant disbursed to ranger station).

SECURITY CANARY: Echo "{CANARY_TOKEN}" in JSON.
Respond ONLY with valid JSON without markdown fences:
{{
  "canary": "{CANARY_TOKEN}",
  "verdict": "BIODIVERSITY_THRIVING_FULL" | "ANTHROPOGENIC_DISTURBANCE_PENALTY" | "POACHING_CRISIS_TERMINATED",
  "confidence": <0-100>,
  "measured_ndsi_score": <integer>,
  "gunshot_events_detected": <integer>,
  "chainsaw_minutes_detected": <integer>,
  "reason": "<rigorous ecological soundscape critique under 200 chars>"
}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                try:
                    parsed = json.loads(raw_res.replace("```json", "").replace("```", "").strip())
                except Exception:
                    pass

            if not parsed or not isinstance(parsed, dict):
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_PARSE_FAILED",
                    "confidence": 0,
                    "measured_ndsi_score": 0,
                    "gunshot_events_detected": 0,
                    "chainsaw_minutes_detected": 0,
                    "reason": "AI validator parsing failed or malformed JSON returned.",
                    "evidence_hash": ev_hash,
                }

            if str(parsed.get("canary", "")) != CANARY_TOKEN:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_CANARY_FAILED",
                    "confidence": 0,
                    "measured_ndsi_score": 0,
                    "gunshot_events_detected": 0,
                    "chainsaw_minutes_detected": 0,
                    "reason": "Security canary mismatch detected in jury output.",
                    "evidence_hash": ev_hash,
                }

            v_raw = str(parsed.get("verdict", "")).upper().strip()
            if v_raw not in {"BIODIVERSITY_THRIVING_FULL", "ANTHROPOGENIC_DISTURBANCE_PENALTY", "POACHING_CRISIS_TERMINATED"}:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_PARSE_FAILED",
                    "confidence": 0,
                    "measured_ndsi_score": 0,
                    "gunshot_events_detected": 0,
                    "chainsaw_minutes_detected": 0,
                    "reason": f"Unsupported verdict '{v_raw}' returned.",
                    "evidence_hash": ev_hash,
                }

            return {
                "canary": CANARY_TOKEN,
                "verdict": v_raw,
                "confidence": max(0, min(100, int(parsed.get("confidence", 85)))),
                "measured_ndsi_score": max(0, min(100, int(parsed.get("measured_ndsi_score", 0)))),
                "gunshot_events_detected": max(0, min(100, int(parsed.get("gunshot_events_detected", 0)))),
                "chainsaw_minutes_detected": max(0, min(100000, int(parsed.get("chainsaw_minutes_detected", 0)))),
                "reason": str(parsed.get("reason", "Bioacoustic evaluation concluded."))[:200],
                "evidence_hash": ev_hash,
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False
            if leader.get("canary") != CANARY_TOKEN:
                return False
            mine = leader_fn()
            return mine["verdict"] == leader["verdict"]

        adjudication_res = gl.vm.run_nondet(leader_fn, validator_fn)
        v_res = str(adjudication_res["verdict"])
        p.verdict = v_res
        p.reason = str(adjudication_res["reason"])
        p.confidence = u8(int(adjudication_res["confidence"]))
        p.measured_ndsi_score = u8(int(adjudication_res["measured_ndsi_score"]))
        p.gunshot_events_detected = u8(int(adjudication_res["gunshot_events_detected"]))
        p.chainsaw_minutes_detected = u32(int(adjudication_res["chainsaw_minutes_detected"]))
        if "evidence_hash" in adjudication_res and adjudication_res["evidence_hash"]:
            p.evidence_hash = str(adjudication_res["evidence_hash"])

        if v_res.startswith("UNRESOLVED_"):
            p.status = STATUS_UNRESOLVED
            p.audit_completed_time = bigint(0)
        else:
            p.original_verdict = v_res
            current_time = self._get_current_timestamp()
            p.status = STATUS_AWAITING_PAYOUT
            p.audit_completed_time = current_time

    @gl.public.write.payable
    def appeal_verdict(
        self,
        policy_id: str,
        dispute_reason: str,
        supplemental_audio_url: str
    ) -> None:
        """Sponsor or Rangers can appeal within 24 blocks (~72s) with a 10% staked bond."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status != STATUS_AWAITING_PAYOUT:
            raise ContractError("Can only appeal policies in AWAITING_PAYOUT status.")

        sender = _get_sender()
        if _addr_str(sender) != _addr_str(p.sponsor) and _addr_str(sender) != _addr_str(p.ranger_station):
            raise ContractError("Role Violation: Only sponsor or ranger station can file an appeal.")

        current_time = self._get_current_timestamp()
        if current_time > (p.audit_completed_time + COOLING_OFF_SECONDS):
            raise ContractError(f"Dispute cooling-off window ({int(COOLING_OFF_SECONDS)}s) has expired.")

        clean_url = str(supplemental_audio_url).strip()
        if not _is_accredited_bioacoustic_source(clean_url):
            raise ContractError("Supplemental telemetry unauthenticated: Must originate from an accredited bioacoustic repository.")

        required_bond = (p.escrow_amount * bigint(10)) // bigint(100)
        if required_bond == bigint(0):
            required_bond = bigint(1)

        staked = bigint(gl.message.value)
        if staked < required_bond:
            raise ContractError(f"Must stake at least 10% dispute bond ({int(required_bond)} wei).")

        clean_reason = str(dispute_reason).strip()
        if len(clean_reason) < 10:
            raise ContractError("Detailed dispute justification (>= 10 chars) required.")

        p.appeal_prior_verdict = p.verdict
        p.status = STATUS_DISPUTED
        p.dispute_initiator = _to_address(sender)
        p.dispute_bond = staked
        p.supplemental_evidence_url = clean_url
        p.reason = f"[DISPUTE by {_addr_str(sender)[:8]}]: {clean_reason} | Prior: {p.reason}"
        self.total_conservation_locked = self.total_conservation_locked + staked

    @gl.public.write
    def adjudicate_appeal(self, policy_id: str) -> None:
        """Supreme Bioacoustic Appellate Court evaluates strictly against bound supplemental spectrogram telemetry."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status != STATUS_DISPUTED:
            raise ContractError("Policy is not in DISPUTED status.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.sponsor)
            and sender_str != _addr_str(p.ranger_station)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only sponsor, ranger station, or owner can adjudicate appeal.")

        bound_url = p.supplemental_evidence_url
        appellant = p.dispute_initiator
        prior_verdict = p.appeal_prior_verdict
        is_sponsor_appellant = (_addr_str(appellant) == _addr_str(p.sponsor))

        def leader_fn():
            raw_supp = ""
            try:
                raw_supp = gl.nondet.web.render(bound_url, mode="text")
            except Exception:
                pass

            if not raw_supp:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "APPEAL_UNRESOLVED_FETCH_FAILED",
                    "reason": "Supplemental bioacoustic audit feed unreachable.",
                }

            prompt = f"""You are the Supreme Bioacoustic Wildlife Magistrate on GenLayer.
Evaluate bound high-definition spectrogram telemetry for reserve {p.forest_reserve_id}:
PRIOR VERDICT: {prior_verdict}
APPELLANT: {'SPONSOR' if is_sponsor_appellant else 'RANGER_STATION'}

SUPPLEMENTAL AUDIT DATA:
{raw_supp[:4000]}

DECISION CRITERIA:
- If supplemental logs verify vibrant biophony density (NDSI met, zero gunshots): Output "APPEAL_UPHELD_THRIVING".
- If partial disturbance confirmed: Output "APPEAL_UPHELD_PARTIAL".
- If severe poaching / acoustic collapse verified: Output "APPEAL_UPHELD_TERMINATED".
- Otherwise: Output "APPEAL_DISMISSED".

SECURITY CANARY: Echo "{CANARY_TOKEN}" in JSON.
Respond ONLY with valid JSON:
{{"canary": "{CANARY_TOKEN}", "verdict": "APPEAL_UPHELD_THRIVING"|"APPEAL_UPHELD_PARTIAL"|"APPEAL_UPHELD_TERMINATED"|"APPEAL_DISMISSED", "reason": "<rationale under 200 chars>"}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                try:
                    parsed = json.loads(raw_res.replace("```json", "").replace("```", "").strip())
                except Exception:
                    pass

            if not parsed or not isinstance(parsed, dict) or str(parsed.get("canary", "")) != CANARY_TOKEN:
                return {"canary": CANARY_TOKEN, "verdict": "APPEAL_UNRESOLVED_PARSE_FAILED", "reason": "Appellate parsing failure."}

            v_str = str(parsed.get("verdict", "")).upper().strip()
            if v_str not in {"APPEAL_UPHELD_THRIVING", "APPEAL_UPHELD_PARTIAL", "APPEAL_UPHELD_TERMINATED", "APPEAL_DISMISSED"}:
                v_str = "APPEAL_UNRESOLVED_PARSE_FAILED"

            return {
                "canary": CANARY_TOKEN,
                "verdict": v_str,
                "reason": str(parsed.get("reason", "Appellate review completed."))[:200]
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False
            if leader.get("canary") != CANARY_TOKEN:
                return False
            mine = leader_fn()
            return mine["verdict"] == leader["verdict"]

        appeal_res = gl.vm.run_nondet(leader_fn, validator_fn)
        app_verdict = appeal_res["verdict"]
        app_reason = appeal_res["reason"]

        if app_verdict.startswith("APPEAL_UNRESOLVED_"):
            p.status = STATUS_UNRESOLVED
            p.verdict = app_verdict
            p.reason = f"[APPEAL UNRESOLVED] {app_reason}"
            return

        escrow_val = p.escrow_amount
        bond_val = p.dispute_bond
        total_settling = escrow_val + bond_val
        p.dispute_bond = bigint(0)
        p.escrow_amount = bigint(0)  # Double-payout protection

        self.total_conservation_locked = self.total_conservation_locked - total_settling
        self.total_policies_settled = self.total_policies_settled + u32(1)

        counterparty = p.ranger_station if is_sponsor_appellant else p.sponsor

        if app_verdict == "APPEAL_UPHELD_THRIVING":
            p.status = STATUS_SETTLED_THRIVING
            p.verdict = "BIODIVERSITY_THRIVING_FULL"
            p.reason = f"[APPEAL UPHELD] {app_reason}"
            self._safe_transfer(p.ranger_station, escrow_val)
            if not is_sponsor_appellant:
                self._safe_transfer(appellant, bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        elif app_verdict == "APPEAL_UPHELD_PARTIAL":
            p.status = STATUS_SETTLED_PARTIAL
            p.verdict = "ANTHROPOGENIC_DISTURBANCE_PENALTY"
            payout = escrow_val // bigint(2)
            refund = escrow_val - payout
            p.reason = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p.ranger_station, payout)
            self._safe_transfer(p.sponsor, refund)
            self._safe_transfer(appellant, bond_val)

        elif app_verdict == "APPEAL_UPHELD_TERMINATED":
            p.status = STATUS_SETTLED_TERMINATED
            p.verdict = "POACHING_CRISIS_TERMINATED"
            p.reason = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p.sponsor, escrow_val)
            if is_sponsor_appellant:
                self._safe_transfer(appellant, bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        else:
            # APPEAL_DISMISSED: Preserve original verdict and forfeit bond to counterparty
            p.reason = f"[APPEAL DISMISSED] {app_reason}"
            self._safe_transfer(counterparty, bond_val)

            if p.original_verdict == "BIODIVERSITY_THRIVING_FULL":
                p.status = STATUS_SETTLED_THRIVING
                p.verdict = "BIODIVERSITY_THRIVING_FULL"
                self._safe_transfer(p.ranger_station, escrow_val)
            elif p.original_verdict == "ANTHROPOGENIC_DISTURBANCE_PENALTY":
                p.status = STATUS_SETTLED_PARTIAL
                p.verdict = "ANTHROPOGENIC_DISTURBANCE_PENALTY"
                payout = escrow_val // bigint(2)
                refund = escrow_val - payout
                self._safe_transfer(p.ranger_station, payout)
                self._safe_transfer(p.sponsor, refund)
            else:
                p.status = STATUS_SETTLED_TERMINATED
                p.verdict = "POACHING_CRISIS_TERMINATED"
                self._safe_transfer(p.sponsor, escrow_val)

    @gl.public.write
    def finalize_settlement(self, policy_id: str) -> None:
        """Executes uncontested settlement strictly after 24 blocks (~72s) cooling-off window."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status == STATUS_UNRESOLVED or p.verdict.startswith("UNRESOLVED_") or p.verdict.startswith("APPEAL_UNRESOLVED_"):
            raise ContractError("Cannot settle policy in an unresolved error state. Escrow remains protected.")

        if p.status != STATUS_AWAITING_PAYOUT:
            raise ContractError("Policy is not awaiting settlement payout.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.sponsor)
            and sender_str != _addr_str(p.ranger_station)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only stakeholders or owner can finalize payout.")

        current_time = self._get_current_timestamp()
        if current_time <= (p.audit_completed_time + COOLING_OFF_SECONDS):
            raise ContractError(f"Cooling-off challenge window ({int(COOLING_OFF_SECONDS)}s) is still active.")

        escrow_val = p.escrow_amount
        p.escrow_amount = bigint(0)  # Double-payout protection
        self.total_conservation_locked = self.total_conservation_locked - escrow_val
        self.total_policies_settled = self.total_policies_settled + u32(1)

        if p.verdict == "BIODIVERSITY_THRIVING_FULL":
            p.status = STATUS_SETTLED_THRIVING
            self._safe_transfer(p.ranger_station, escrow_val)

        elif p.verdict == "ANTHROPOGENIC_DISTURBANCE_PENALTY":
            p.status = STATUS_SETTLED_PARTIAL
            payout = escrow_val // bigint(2)
            refund = escrow_val - payout
            self._safe_transfer(p.ranger_station, payout)
            self._safe_transfer(p.sponsor, refund)

        else:
            p.status = STATUS_SETTLED_TERMINATED
            self._safe_transfer(p.sponsor, escrow_val)

    @gl.public.write
    def cancel_or_reclaim(self, policy_id: str) -> None:
        """Sponsor reclaims escrow if policy expired without telemetry or stalled in unresolved state."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if _addr_str(_get_sender()) != _addr_str(p.sponsor):
            raise ContractError("Role Violation: Only sponsor can reclaim expired conservation escrow.")

        current_time = self._get_current_timestamp()
        if p.status in (STATUS_POLICY_OPEN, STATUS_UNRESOLVED):
            if current_time < p.expires_at_time:
                raise ContractError(f"Cannot reclaim: Policy is still active (expires at {int(p.expires_at_time)}).")
        else:
            raise ContractError("Cannot reclaim: Policy has telemetry actively undergoing evaluation or already settled.")

        p.status = STATUS_EXPIRED_RECLAIMED
        p.verdict = "EXPIRED_CLEAN"
        p.reason = "Policy duration completed without valid audio telemetry. Escrow reclaimed by sponsor."

        escrow_val = p.escrow_amount
        p.escrow_amount = bigint(0)
        self.total_conservation_locked = self.total_conservation_locked - escrow_val
        self._safe_transfer(p.sponsor, escrow_val)

    @gl.public.write
    def claim_payout(self) -> None:
        """Pull-payment safety withdrawal: Beneficiary claims safely buffered balances."""
        self._ensure_owner()
        sender = _get_sender()
        s_str = _addr_str(sender)
        bal = self.claimable_balances.get(s_str, bigint(0))
        if bal <= bigint(0):
            raise ContractError("No claimable balance available for withdrawal.")

        self.claimable_balances[s_str] = bigint(0)
        try:
            gl.get_contract_at(sender).emit_transfer(value=u256(int(bal)))
        except Exception:
            self.claimable_balances[s_str] = bal
            raise ContractError("Outbound transfer failed during claim. Balance safely preserved.")

    # ── Read-only Views ───────────────────────────────────────────────

    @gl.public.view
    def get_policy(self, policy_id: str) -> str:
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        data = {
            "policy_id": p.policy_id,
            "sponsor": _addr_str(p.sponsor),
            "ranger_station": _addr_str(p.ranger_station),
            "dispute_initiator": _addr_str(p.dispute_initiator),
            "escrow_amount": str(p.escrow_amount),
            "dispute_bond": str(p.dispute_bond),
            "forest_reserve_id": p.forest_reserve_id,
            "min_ndsi_threshold": int(p.min_ndsi_threshold),
            "soundscape_feed_url": p.soundscape_feed_url,
            "evidence_hash": p.evidence_hash,
            "status": int(p.status),
            "verdict": p.verdict,
            "original_verdict": p.original_verdict,
            "reason": p.reason,
            "confidence": int(p.confidence),
            "measured_ndsi_score": int(p.measured_ndsi_score),
            "gunshot_events_detected": int(p.gunshot_events_detected),
            "chainsaw_minutes_detected": int(p.chainsaw_minutes_detected),
            "created_at_time": str(p.created_at_time),
            "expires_at_time": str(p.expires_at_time),
            "audit_completed_time": str(p.audit_completed_time),
            "supplemental_evidence_url": p.supplemental_evidence_url,
            "appeal_prior_verdict": p.appeal_prior_verdict,
            "created_at_block": str(p.created_at_time),
            "expires_at_block": str(p.expires_at_time),
            "audit_completed_block": str(p.audit_completed_time),
        }
        return json.dumps(data)

    @gl.public.view
    def get_policy_count(self) -> u64:
        return u64(len(self.policy_ids))

    @gl.public.view
    def get_all_policies(self) -> str:
        policies_list = []
        for pid in self.policy_ids:
            if pid in self.policies:
                p = self.policies[pid]
                policies_list.append({
                    "policy_id": p.policy_id,
                    "sponsor": _addr_str(p.sponsor),
                    "ranger_station": _addr_str(p.ranger_station),
                    "dispute_initiator": _addr_str(p.dispute_initiator),
                    "escrow_amount": str(p.escrow_amount),
                    "dispute_bond": str(p.dispute_bond),
                    "forest_reserve_id": p.forest_reserve_id,
                    "min_ndsi_threshold": int(p.min_ndsi_threshold),
                    "soundscape_feed_url": p.soundscape_feed_url,
                    "evidence_hash": p.evidence_hash,
                    "status": int(p.status),
                    "verdict": p.verdict,
                    "original_verdict": p.original_verdict,
                    "reason": p.reason,
                    "confidence": int(p.confidence),
                    "measured_ndsi_score": int(p.measured_ndsi_score),
                    "gunshot_events_detected": int(p.gunshot_events_detected),
                    "chainsaw_minutes_detected": int(p.chainsaw_minutes_detected),
                    "created_at_time": str(p.created_at_time),
                    "expires_at_time": str(p.expires_at_time),
                    "audit_completed_time": str(p.audit_completed_time),
                })
        return json.dumps(policies_list)

    @gl.public.view
    def get_claimable_balance(self, account: Address) -> str:
        return str(self.claimable_balances.get(_addr_str(account), bigint(0)))

    @gl.public.view
    def get_stats(self) -> str:
        data = {
            "total_policies": len(self.policy_ids),
            "total_conservation_locked": str(self.total_conservation_locked),
            "total_policies_settled": int(self.total_policies_settled),
            "owner": _addr_str(self.owner),
        }
        return json.dumps(data)
