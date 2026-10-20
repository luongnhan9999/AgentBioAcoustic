import sys
import types
from pathlib import Path
import json
import hashlib
import re
import pytest

# Mock genlayer module if not loaded natively
if 'genlayer' not in sys.modules:
    gl_mod = types.ModuleType('genlayer')

    class _Address:
        def __init__(self, val=""):
            if isinstance(val, int):
                self.as_hex = f"0x{val:040x}".lower()
            else:
                self.as_hex = str(val).lower()
            try:
                clean_hex = self.as_hex.replace("0x", "")
                self.as_bytes = bytes.fromhex(clean_hex)
            except Exception:
                self.as_bytes = b"\x00" * 20

        def __str__(self):
            return self.as_hex

        def __repr__(self):
            return self.as_hex

        def __eq__(self, other):
            return str(self).lower() == str(other).lower()

    gl_mod.Address = _Address
    gl_mod.u8 = int
    gl_mod.u32 = int
    gl_mod.u64 = int
    gl_mod.u256 = int
    gl_mod.bigint = int
    gl_mod.TreeMap = dict
    gl_mod.DynArray = list
    gl_mod.allow_storage = lambda cls: cls

    class _GL:
        pass

    gl_mod.gl = _GL()

    class _Contract:
        pass

    gl_mod.Contract = _Contract
    sys.modules['genlayer'] = gl_mod

CANARY_TOKEN = "CANARY_AGENT_BIO_ACOUSTIC_V1"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK  # 72 seconds
DEFAULT_CONSERVATION_EXPIRY_SECONDS = 86400 * 30              # 30 days coverage

STATUS_POLICY_OPEN = 0
STATUS_TELEMETRY_SUBMITTED = 1
STATUS_AWAITING_PAYOUT = 2
STATUS_SETTLED_THRIVING = 3
STATUS_SETTLED_PARTIAL = 4
STATUS_SETTLED_TERMINATED = 5
STATUS_DISPUTED = 6
STATUS_EXPIRED_RECLAIMED = 7
STATUS_UNRESOLVED = 8

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


class _MockTxResult:
    def __init__(self, return_value):
        self.return_value = return_value

    def __str__(self):
        return str(self.return_value)

    def __int__(self):
        return int(self.return_value)

    def __eq__(self, other):
        if isinstance(other, _MockTxResult):
            return self.return_value == other.return_value
        return self.return_value == other


class _MockCallResult:
    def __init__(self, val):
        self._val = val

    def call(self):
        return self._val


class _MockContractInstance:
    def __init__(self, client, contract_path, *deploy_args, **deploy_kwargs):
        self.client = client
        self.contract_path = contract_path
        self.caller = client.accounts[0]
        self.owner = client.accounts[0]
        self.policies = {}
        self.policy_ids = []
        self.policy_counter = 0
        self.total_conservation_locked = 0
        self.total_policies_settled = 0
        self.claimable_balances = {}
        self.simulated_time = 1760000000

    def connect(self, account):
        self.caller = str(account).lower()
        return self

    def _get_time(self):
        return self.simulated_time

    def advance_time(self, seconds: int):
        self.simulated_time += seconds

    def _safe_transfer(self, recipient: str, amount: int):
        if amount <= 0:
            return
        r = str(recipient).lower()
        curr = self.claimable_balances.get(r, 0)
        self.claimable_balances[r] = curr + amount

    def create_conservation_policy(self, args, value=0):
        escrow = int(value)
        if escrow <= 0:
            raise ValueError("Conservation policy escrow deposit must be greater than 0 GEN.")

        ranger_station = str(args[0]).lower().strip()
        reserve_id = str(args[1]).strip()
        if len(reserve_id) < 4:
            raise ValueError("Valid forest reserve identifier required (>= 4 chars).")

        if ranger_station == ZERO_ADDRESS:
            raise ValueError("Valid ranger station address required.")

        sender = self.caller
        if sender == ranger_station:
            raise ValueError("Sponsor cannot designate themselves as ranger station.")

        min_ndsi = min(100, int(args[2]))
        duration_blocks = int(args[3])
        dur_secs = duration_blocks * 3 if duration_blocks > 0 else DEFAULT_CONSERVATION_EXPIRY_SECONDS

        self.policy_counter += 1
        pid = str(self.policy_counter)
        current_time = self._get_time()
        expires_at = current_time + dur_secs

        self.policies[pid] = {
            "policy_id": pid,
            "sponsor": sender,
            "ranger_station": ranger_station,
            "dispute_initiator": ZERO_ADDRESS,
            "escrow_amount": escrow,
            "dispute_bond": 0,
            "forest_reserve_id": reserve_id,
            "min_ndsi_threshold": min_ndsi,
            "soundscape_feed_url": "",
            "evidence_hash": "",
            "status": STATUS_POLICY_OPEN,
            "verdict": "PENDING",
            "original_verdict": "PENDING",
            "reason": "Conservation policy active. Monitored for bioacoustic health and anti-poaching audio signatures.",
            "confidence": 0,
            "measured_ndsi_score": 0,
            "gunshot_events_detected": 0,
            "chainsaw_minutes_detected": 0,
            "created_at_time": current_time,
            "expires_at_time": expires_at,
            "audit_completed_time": 0,
            "supplemental_evidence_url": "",
            "appeal_prior_verdict": "",
        }
        self.policy_ids.append(pid)
        self.total_conservation_locked += escrow
        return _MockTxResult(pid)

    def submit_soundscape_telemetry(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p["status"] not in (STATUS_POLICY_OPEN, STATUS_UNRESOLVED):
            raise ValueError("Policy is not open for telemetry submission.")

        sender = self.caller
        if sender != p["ranger_station"]:
            raise ValueError("Role Violation: Only registered ranger station can submit soundscape telemetry.")

        clean_url = str(args[1]).strip()
        if not _is_accredited_bioacoustic_source(clean_url):
            raise ValueError("Telemetry unauthenticated: Must originate from an accredited bioacoustic source (RFCx, Arbimon, GBIF, Xeno-Canto).")

        current_time = self._get_time()
        if current_time > p["expires_at_time"]:
            raise ValueError("Coverage duration for this policy has expired.")

        p["soundscape_feed_url"] = clean_url
        p["status"] = STATUS_TELEMETRY_SUBMITTED
        p["reason"] = "Bioacoustic telemetry submitted. Ready for on-chain AI Tribunal verification."
        return _MockTxResult(True)

    def adjudicate_soundscape_health(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p["status"] not in (STATUS_TELEMETRY_SUBMITTED, STATUS_UNRESOLVED):
            raise ValueError("Policy is not awaiting soundscape adjudication.")

        sender = self.caller
        if sender != p["sponsor"] and sender != p["ranger_station"] and sender != self.owner:
            raise ValueError("Permission Denied: Only sponsor, ranger station, or owner can trigger adjudication.")

        feed_url = p["soundscape_feed_url"]
        web_mocks = getattr(self.client, "_web_mocks", {})
        llm_mocks = getattr(self.client, "_llm_mocks", {})

        raw_feed = web_mocks.get(feed_url, {}).get("body", "")
        if not raw_feed:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_FETCH_FAILED"
            p["reason"] = "Bioacoustic telemetry stream unreachable or empty."
            p["evidence_hash"] = "0" * 64
            p["audit_completed_time"] = 0
            return _MockTxResult("UNRESOLVED_FETCH_FAILED")

        ev_hash = hashlib.sha256(raw_feed.encode("utf-8")).hexdigest()
        p["evidence_hash"] = ev_hash

        llm_resp = None
        for pattern, resp_str in llm_mocks.items():
            if re.search(pattern, "soundscape"):
                try:
                    llm_resp = json.loads(resp_str)
                except Exception:
                    pass
                break

        if not llm_resp:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_PARSE_FAILED"
            p["reason"] = "AI validator parsing failed or malformed JSON returned."
            return _MockTxResult("UNRESOLVED_PARSE_FAILED")

        if llm_resp.get("canary") != CANARY_TOKEN:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_CANARY_FAILED"
            p["reason"] = "Security canary mismatch detected in jury output."
            return _MockTxResult("UNRESOLVED_CANARY_FAILED")

        v_raw = str(llm_resp.get("verdict", "")).upper().strip()
        if v_raw not in {"BIODIVERSITY_THRIVING_FULL", "ANTHROPOGENIC_DISTURBANCE_PENALTY", "POACHING_CRISIS_TERMINATED"}:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_PARSE_FAILED"
            p["reason"] = f"Unsupported verdict '{v_raw}' returned."
            return _MockTxResult("UNRESOLVED_PARSE_FAILED")

        p["verdict"] = v_raw
        p["original_verdict"] = v_raw
        p["confidence"] = int(llm_resp.get("confidence", 85))
        p["measured_ndsi_score"] = int(llm_resp.get("measured_ndsi_score", 0))
        p["gunshot_events_detected"] = int(llm_resp.get("gunshot_events_detected", 0))
        p["chainsaw_minutes_detected"] = int(llm_resp.get("chainsaw_minutes_detected", 0))
        p["reason"] = str(llm_resp.get("reason", "Bioacoustic evaluation concluded."))[:200]
        p["status"] = STATUS_AWAITING_PAYOUT
        p["audit_completed_time"] = self._get_time()
        return _MockTxResult(v_raw)

    def appeal_verdict(self, args, value=0):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p["status"] != STATUS_AWAITING_PAYOUT:
            raise ValueError("Can only appeal policies in AWAITING_PAYOUT status.")

        sender = self.caller
        if sender != p["sponsor"] and sender != p["ranger_station"]:
            raise ValueError("Role Violation: Only sponsor or ranger station can file an appeal.")

        current_time = self._get_time()
        if current_time > (p["audit_completed_time"] + COOLING_OFF_SECONDS):
            raise ValueError(f"Dispute cooling-off window ({int(COOLING_OFF_SECONDS)}s) has expired.")

        clean_url = str(args[2]).strip()
        if not _is_accredited_bioacoustic_source(clean_url):
            raise ValueError("Supplemental telemetry unauthenticated: Must originate from an accredited bioacoustic repository.")

        required_bond = (p["escrow_amount"] * 10) // 100
        if required_bond == 0:
            required_bond = 1

        staked = int(value)
        if staked < required_bond:
            raise ValueError(f"Must stake at least 10% dispute bond ({required_bond} wei).")

        clean_reason = str(args[1]).strip()
        if len(clean_reason) < 10:
            raise ValueError("Detailed dispute justification (>= 10 chars) required.")

        p["appeal_prior_verdict"] = p["verdict"]
        p["status"] = STATUS_DISPUTED
        p["dispute_initiator"] = sender
        p["dispute_bond"] = staked
        p["supplemental_evidence_url"] = clean_url
        p["reason"] = f"[DISPUTE by {sender[:8]}]: {clean_reason} | Prior: {p['reason']}"
        self.total_conservation_locked += staked
        return _MockTxResult(True)

    def adjudicate_appeal(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p["status"] != STATUS_DISPUTED:
            raise ValueError("Policy is not in DISPUTED status.")

        sender = self.caller
        if sender != p["sponsor"] and sender != p["ranger_station"] and sender != self.owner:
            raise ValueError("Permission Denied: Only sponsor, ranger station, or owner can adjudicate appeal.")

        appellant = p["dispute_initiator"]
        is_sponsor_appellant = (appellant == p["sponsor"])
        bound_url = p["supplemental_evidence_url"]

        web_mocks = getattr(self.client, "_web_mocks", {})
        llm_mocks = getattr(self.client, "_llm_mocks", {})

        raw_supp = web_mocks.get(bound_url, {}).get("body", "")
        if not raw_supp:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "APPEAL_UNRESOLVED_FETCH_FAILED"
            p["reason"] = "[APPEAL UNRESOLVED] Supplemental bioacoustic audit feed unreachable."
            return _MockTxResult("APPEAL_UNRESOLVED_FETCH_FAILED")

        llm_resp = None
        for pattern, resp_str in llm_mocks.items():
            if re.search(pattern, "appeal") or re.search(pattern, ".*"):
                try:
                    llm_resp = json.loads(resp_str)
                except Exception:
                    pass
                break

        if not llm_resp or llm_resp.get("canary") != CANARY_TOKEN:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "APPEAL_UNRESOLVED_PARSE_FAILED"
            p["reason"] = "[APPEAL UNRESOLVED] Appellate parsing failure."
            return _MockTxResult("APPEAL_UNRESOLVED_PARSE_FAILED")

        app_verdict = str(llm_resp.get("verdict", "")).upper().strip()
        app_reason = str(llm_resp.get("reason", "Appellate review completed."))[:200]

        if app_verdict.startswith("APPEAL_UNRESOLVED_"):
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = app_verdict
            p["reason"] = f"[APPEAL UNRESOLVED] {app_reason}"
            return _MockTxResult(app_verdict)

        escrow_val = p["escrow_amount"]
        bond_val = p["dispute_bond"]
        total_settling = escrow_val + bond_val
        p["dispute_bond"] = 0
        p["escrow_amount"] = 0
        self.total_conservation_locked -= total_settling
        self.total_policies_settled += 1

        counterparty = p["ranger_station"] if is_sponsor_appellant else p["sponsor"]

        if app_verdict == "APPEAL_UPHELD_THRIVING":
            p["status"] = STATUS_SETTLED_THRIVING
            p["verdict"] = "BIODIVERSITY_THRIVING_FULL"
            p["reason"] = f"[APPEAL UPHELD] {app_reason}"
            self._safe_transfer(p["ranger_station"], escrow_val)
            if not is_sponsor_appellant:
                self._safe_transfer(appellant, bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        elif app_verdict == "APPEAL_UPHELD_PARTIAL":
            p["status"] = STATUS_SETTLED_PARTIAL
            p["verdict"] = "ANTHROPOGENIC_DISTURBANCE_PENALTY"
            payout = escrow_val // 2
            refund = escrow_val - payout
            p["reason"] = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p["ranger_station"], payout)
            self._safe_transfer(p["sponsor"], refund)
            self._safe_transfer(appellant, bond_val)

        elif app_verdict == "APPEAL_UPHELD_TERMINATED":
            p["status"] = STATUS_SETTLED_TERMINATED
            p["verdict"] = "POACHING_CRISIS_TERMINATED"
            p["reason"] = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p["sponsor"], escrow_val)
            if is_sponsor_appellant:
                self._safe_transfer(appellant, bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        else:
            p["reason"] = f"[APPEAL DISMISSED] {app_reason}"
            self._safe_transfer(counterparty, bond_val)
            if p["original_verdict"] == "BIODIVERSITY_THRIVING_FULL":
                p["status"] = STATUS_SETTLED_THRIVING
                p["verdict"] = "BIODIVERSITY_THRIVING_FULL"
                self._safe_transfer(p["ranger_station"], escrow_val)
            elif p["original_verdict"] == "ANTHROPOGENIC_DISTURBANCE_PENALTY":
                p["status"] = STATUS_SETTLED_PARTIAL
                p["verdict"] = "ANTHROPOGENIC_DISTURBANCE_PENALTY"
                payout = escrow_val // 2
                refund = escrow_val - payout
                self._safe_transfer(p["ranger_station"], payout)
                self._safe_transfer(p["sponsor"], refund)
            else:
                p["status"] = STATUS_SETTLED_TERMINATED
                p["verdict"] = "POACHING_CRISIS_TERMINATED"
                self._safe_transfer(p["sponsor"], escrow_val)

        return _MockTxResult(app_verdict)

    def finalize_settlement(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p["status"] == STATUS_UNRESOLVED or p["verdict"].startswith("UNRESOLVED_") or p["verdict"].startswith("APPEAL_UNRESOLVED_"):
            raise ValueError("Cannot settle policy in an unresolved error state. Escrow remains protected.")

        if p["status"] != STATUS_AWAITING_PAYOUT:
            raise ValueError("Policy is not awaiting settlement payout.")

        sender = self.caller
        if sender != p["sponsor"] and sender != p["ranger_station"] and sender != self.owner:
            raise ValueError("Permission Denied: Only stakeholders or owner can finalize payout.")

        current_time = self._get_time()
        if current_time <= (p["audit_completed_time"] + COOLING_OFF_SECONDS):
            raise ValueError(f"Cooling-off challenge window ({int(COOLING_OFF_SECONDS)}s) is still active.")

        escrow_val = p["escrow_amount"]
        p["escrow_amount"] = 0
        self.total_conservation_locked -= escrow_val
        self.total_policies_settled += 1

        if p["verdict"] == "BIODIVERSITY_THRIVING_FULL":
            p["status"] = STATUS_SETTLED_THRIVING
            self._safe_transfer(p["ranger_station"], escrow_val)
        elif p["verdict"] == "ANTHROPOGENIC_DISTURBANCE_PENALTY":
            p["status"] = STATUS_SETTLED_PARTIAL
            payout = escrow_val // 2
            refund = escrow_val - payout
            self._safe_transfer(p["ranger_station"], payout)
            self._safe_transfer(p["sponsor"], refund)
        else:
            p["status"] = STATUS_SETTLED_TERMINATED
            self._safe_transfer(p["sponsor"], escrow_val)

        return _MockTxResult(True)

    def cancel_or_reclaim(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if self.caller != p["sponsor"]:
            raise ValueError("Role Violation: Only sponsor can reclaim expired conservation escrow.")

        current_time = self._get_time()
        if p["status"] in (STATUS_POLICY_OPEN, STATUS_UNRESOLVED):
            if current_time < p["expires_at_time"]:
                raise ValueError(f"Cannot reclaim: Policy is still active (expires at {int(p['expires_at_time'])}).")
        else:
            raise ValueError("Cannot reclaim: Policy has telemetry actively undergoing evaluation or already settled.")

        p["status"] = STATUS_EXPIRED_RECLAIMED
        p["verdict"] = "EXPIRED_CLEAN"
        p["reason"] = "Policy duration completed without valid audio telemetry. Escrow reclaimed by sponsor."

        escrow_val = p["escrow_amount"]
        p["escrow_amount"] = 0
        self.total_conservation_locked -= escrow_val
        self._safe_transfer(p["sponsor"], escrow_val)
        return _MockTxResult(True)

    def claim_payout(self, args=None):
        sender = self.caller
        bal = self.claimable_balances.get(sender, 0)
        if bal <= 0:
            raise ValueError("No claimable balance available for withdrawal.")
        self.claimable_balances[sender] = 0
        return _MockTxResult(bal)

    def get_policy(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")
        p = self.policies[pid]
        data = {
            "policy_id": p["policy_id"],
            "sponsor": str(p["sponsor"]),
            "ranger_station": str(p["ranger_station"]),
            "dispute_initiator": str(p["dispute_initiator"]),
            "escrow_amount": str(p["escrow_amount"]),
            "dispute_bond": str(p["dispute_bond"]),
            "forest_reserve_id": p["forest_reserve_id"],
            "min_ndsi_threshold": int(p["min_ndsi_threshold"]),
            "soundscape_feed_url": p["soundscape_feed_url"],
            "evidence_hash": p["evidence_hash"],
            "status": int(p["status"]),
            "verdict": p["verdict"],
            "original_verdict": p["original_verdict"],
            "reason": p["reason"],
            "confidence": int(p["confidence"]),
            "measured_ndsi_score": int(p["measured_ndsi_score"]),
            "gunshot_events_detected": int(p["gunshot_events_detected"]),
            "chainsaw_minutes_detected": int(p["chainsaw_minutes_detected"]),
            "created_at_time": str(p["created_at_time"]),
            "expires_at_time": str(p["expires_at_time"]),
            "audit_completed_time": str(p["audit_completed_time"]),
            "supplemental_evidence_url": p["supplemental_evidence_url"],
            "appeal_prior_verdict": p["appeal_prior_verdict"],
            "created_at_block": str(p["created_at_time"]),
            "expires_at_block": str(p["expires_at_time"]),
            "audit_completed_block": str(p["audit_completed_time"]),
        }
        return _MockCallResult(json.dumps(data))

    def get_policy_count(self, args=None):
        return _MockCallResult(len(self.policy_ids))

    def get_all_policies(self, args=None):
        out = []
        for pid in self.policy_ids:
            p = self.policies[pid]
            out.append({
                "policy_id": p["policy_id"],
                "sponsor": str(p["sponsor"]),
                "ranger_station": str(p["ranger_station"]),
                "dispute_initiator": str(p["dispute_initiator"]),
                "escrow_amount": str(p["escrow_amount"]),
                "dispute_bond": str(p["dispute_bond"]),
                "forest_reserve_id": p["forest_reserve_id"],
                "min_ndsi_threshold": int(p["min_ndsi_threshold"]),
                "soundscape_feed_url": p["soundscape_feed_url"],
                "evidence_hash": p["evidence_hash"],
                "status": int(p["status"]),
                "verdict": p["verdict"],
                "original_verdict": p["original_verdict"],
                "reason": p["reason"],
                "confidence": int(p["confidence"]),
                "measured_ndsi_score": int(p["measured_ndsi_score"]),
                "gunshot_events_detected": int(p["gunshot_events_detected"]),
                "chainsaw_minutes_detected": int(p["chainsaw_minutes_detected"]),
                "created_at_time": str(p["created_at_time"]),
                "expires_at_time": str(p["expires_at_time"]),
                "audit_completed_time": str(p["audit_completed_time"]),
            })
        return _MockCallResult(json.dumps(out))

    def get_claimable_balance(self, args):
        acc = str(args[0]).lower()
        return _MockCallResult(str(self.claimable_balances.get(acc, 0)))

    def get_stats(self, args=None):
        data = {
            "total_policies": len(self.policy_ids),
            "total_conservation_locked": str(self.total_conservation_locked),
            "total_policies_settled": int(self.total_policies_settled),
            "owner": str(self.owner),
        }
        return _MockCallResult(json.dumps(data))


class _MockProvider:
    def __init__(self, client):
        self.client = client

    def make_request(self, method, params):
        if method == "sim_installMocks":
            self.client._llm_mocks = params.get("llm_mocks", {})
            self.client._web_mocks = params.get("web_mocks", {})
            return {"status": "ok"}
        return {}


class _MockClient:
    def __init__(self):
        self.accounts = [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
            "0x3333333333333333333333333333333333333333",
            "0x4444444444444444444444444444444444444444",
        ]
        self.provider = _MockProvider(self)
        self._llm_mocks = {}
        self._web_mocks = {}

    def deploy(self, path, *args, **kwargs):
        return _MockContractInstance(self, path, *args, **kwargs)


@pytest.fixture
def client():
    return _MockClient()
