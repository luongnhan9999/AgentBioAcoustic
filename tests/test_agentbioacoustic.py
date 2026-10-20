import pytest
import json
from genlayer import *


def test_agentbioacoustic_thriving_soundscape_full_payout(client):
    """Proves that a verified thriving soundscape releases 100% conservation grant to rangers."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    rangers = client.accounts[1]

    # Step 1: Sponsor locks 1.5 GEN conservation escrow
    tx_create = contract.connect(sponsor).create_conservation_policy(
        args=[str(rangers), "TAM-DAO-NATIONAL-PARK-Z4", 65, 6000],
        value=1500000000000000000  # 1.5 GEN
    )
    policy_id = str(tx_create.return_value)

    # Step 2: Rangers submit audio telemetry from accredited RFCx bioacoustic repository
    telemetry_url = "https://arbimon.rfcx.org/api/v1/soundscapes/tamdao_ridge_sensor01.json"
    contract.connect(rangers).submit_soundscape_telemetry(
        args=[policy_id, telemetry_url]
    )

    # Step 3: Mock AI Bioacoustic Jury -> NDSI 82 (> 65 threshold), zero gunshots, zero chainsaws
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_BIO_ACOUSTIC_V1",
                    "verdict": "BIODIVERSITY_THRIVING_FULL",
                    "confidence": 98,
                    "measured_ndsi_score": 82,
                    "gunshot_events_detected": 0,
                    "chainsaw_minutes_detected": 0,
                    "reason": "Dense biophony confirmed across cicada, gibbon, and avian harmonic bands. Zero poaching anomalies."
                })
            },
            "web_mocks": {
                telemetry_url: {"status": 200, "body": '{"biophony_ratio": 0.82, "gunshot_count": 0, "chainsaw_duration_sec": 0}'}
            }
        }
    )

    contract.connect(rangers).adjudicate_soundscape_health(args=[policy_id])

    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert p_data["verdict"] == "BIODIVERSITY_THRIVING_FULL"
    assert p_data["measured_ndsi_score"] == 82

    # Step 4: Advance past 24-block (~72s) cooling window and finalize
    contract.advance_time(75)
    contract.connect(rangers).finalize_settlement(args=[policy_id])

    p_settled = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_settled["status"] == 3  # STATUS_SETTLED_THRIVING
    assert p_settled["escrow_amount"] == "0"


def test_agentbioacoustic_unaccredited_source_rejected(client):
    """Proves that trigger alerts from unaccredited sources are strictly rejected."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    rangers = client.accounts[1]

    tx_create = contract.connect(sponsor).create_conservation_policy(
        args=[str(rangers), "AMAZON-SECTOR-09", 60, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    # Fake audio link must be reverted
    with pytest.raises(Exception) as exc_info:
        contract.connect(rangers).submit_soundscape_telemetry(
            args=[policy_id, "https://unverified-dropbox-audio.com/raw_forest.mp3"]
        )
    assert "Telemetry unauthenticated" in str(exc_info.value)


def test_agentbioacoustic_anthropogenic_disturbance_penalty(client):
    """Proves that detected chainsaw or degraded NDSI cuts 50% penalty to rangers."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    rangers = client.accounts[1]

    tx_create = contract.connect(sponsor).create_conservation_policy(
        args=[str(rangers), "CONGO-BASIN-TRANSECT-B", 70, 6000],
        value=2000000000000000000  # 2.0 GEN
    )
    policy_id = str(tx_create.return_value)

    feed_url = "https://gbif.org/dataset/congo_audio_telemetry_jan.json"
    contract.connect(rangers).submit_soundscape_telemetry(args=[policy_id, feed_url])

    # Chainsaw engine drone detected for 15 minutes, NDSI degraded to 45
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_BIO_ACOUSTIC_V1",
                    "verdict": "ANTHROPOGENIC_DISTURBANCE_PENALTY",
                    "confidence": 92,
                    "measured_ndsi_score": 45,
                    "gunshot_events_detected": 0,
                    "chainsaw_minutes_detected": 15,
                    "reason": "Illegal logging motor frequency bands (120-250Hz) detected for 15 minutes. NDSI fell below threshold."
                })
            },
            "web_mocks": {
                feed_url: {"status": 200, "body": '{"ndsi": 45, "chainsaw_minutes": 15, "gunshots": 0}'}
            }
        }
    )

    contract.connect(sponsor).adjudicate_soundscape_health(args=[policy_id])

    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 2
    assert p_data["verdict"] == "ANTHROPOGENIC_DISTURBANCE_PENALTY"

    contract.advance_time(75)
    contract.connect(sponsor).finalize_settlement(args=[policy_id])

    p_settled = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_settled["status"] == 4  # STATUS_SETTLED_PARTIAL
    assert p_settled["escrow_amount"] == "0"


def test_agentbioacoustic_poaching_crisis_terminated(client):
    """Proves that gunshots cause emergency termination and 100% refund to sponsor."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    rangers = client.accounts[1]

    tx_create = contract.connect(sponsor).create_conservation_policy(
        args=[str(rangers), "SUMATRA-ELEPHANT-CORRIDOR", 75, 6000],
        value=3000000000000000000  # 3.0 GEN
    )
    policy_id = str(tx_create.return_value)

    feed_url = "https://rfcx.org/streams/sumatra_ridge_sensor09.json"
    contract.connect(rangers).submit_soundscape_telemetry(args=[policy_id, feed_url])

    # High impulse gunshot peaks (>130dB) detected
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_BIO_ACOUSTIC_V1",
                    "verdict": "POACHING_CRISIS_TERMINATED",
                    "confidence": 99,
                    "measured_ndsi_score": 25,
                    "gunshot_events_detected": 3,
                    "chainsaw_minutes_detected": 40,
                    "reason": "CRITICAL POACHING: 3 rifle gunshot acoustic signatures identified. Complete soundscape collapse."
                })
            },
            "web_mocks": {
                feed_url: {"status": 200, "body": '{"gunshots": 3, "ndsi": 25}'}
            }
        }
    )

    contract.connect(rangers).adjudicate_soundscape_health(args=[policy_id])

    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["verdict"] == "POACHING_CRISIS_TERMINATED"

    contract.advance_time(75)
    contract.connect(sponsor).finalize_settlement(args=[policy_id])

    p_settled = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_settled["status"] == 5  # STATUS_SETTLED_TERMINATED
    assert p_settled["escrow_amount"] == "0"


def test_agentbioacoustic_cooling_off_challenge_window_blocks_early_settlement(client):
    """Proves that finalizing payout prior to the 24-block (~72s) cooling window is strictly rejected."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    rangers = client.accounts[1]

    tx_create = contract.connect(sponsor).create_conservation_policy(
        args=[str(rangers), "MADAGASCAR-RAINFOREST-EAST", 60, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    feed_url = "https://xeno-canto.org/sounds/madagascar_station_2.json"
    contract.connect(rangers).submit_soundscape_telemetry(args=[policy_id, feed_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_BIO_ACOUSTIC_V1",
                    "verdict": "BIODIVERSITY_THRIVING_FULL",
                    "confidence": 95,
                    "measured_ndsi_score": 75,
                    "gunshot_events_detected": 0,
                    "chainsaw_minutes_detected": 0,
                    "reason": "Vibrant lemur and tropical bird acoustic density."
                })
            },
            "web_mocks": {
                feed_url: {"status": 200, "body": '{"ndsi": 75}'}
            }
        }
    )

    contract.connect(rangers).adjudicate_soundscape_health(args=[policy_id])

    # Trying to finalize immediately without advancing time must fail
    with pytest.raises(Exception) as exc_info:
        contract.connect(rangers).finalize_settlement(args=[policy_id])
    assert "Cooling-off challenge window" in str(exc_info.value)


def test_agentbioacoustic_appeal_with_bond_and_overturn(client):
    """Proves that an appeal filed with 10% bond during cooling-off triggers re-evaluation and overturn."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    rangers = client.accounts[1]

    escrow = 1000000000000000000  # 1.0 GEN
    tx_create = contract.connect(sponsor).create_conservation_policy(
        args=[str(rangers), "BELIZE-JAGUAR-PRESERVE", 60, 6000],
        value=escrow
    )
    policy_id = str(tx_create.return_value)

    feed_url = "https://macaulaylibrary.org/api/belize_transect.json"
    contract.connect(rangers).submit_soundscape_telemetry(args=[policy_id, feed_url])

    # Initial jury issued disturbance penalty
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_BIO_ACOUSTIC_V1",
                    "verdict": "ANTHROPOGENIC_DISTURBANCE_PENALTY",
                    "confidence": 75,
                    "measured_ndsi_score": 52,
                    "gunshot_events_detected": 0,
                    "chainsaw_minutes_detected": 10,
                    "reason": "Initial acoustic scan indicated possible motor noise."
                })
            },
            "web_mocks": {
                feed_url: {"status": 200, "body": '{"ndsi": 52}'}
            }
        }
    )

    contract.connect(rangers).adjudicate_soundscape_health(args=[policy_id])

    # Rangers appeal within 72s cooling window with 10% bond (0.1 GEN) and high-fidelity audio logs
    bond = 100000000000000000  # 0.1 GEN
    supp_url = "https://arbimon.rfcx.org/belize_hd_calibration.json"
    contract.connect(rangers).appeal_verdict(
        args=[policy_id, "Audio anomaly was natural river torrent waterfall, not chainsaw motor.", supp_url],
        value=bond
    )

    p_disputed = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_disputed["status"] == 6  # STATUS_DISPUTED
    assert p_disputed["dispute_bond"] == str(bond)

    # Appellate jury upholds appeal and grants thriving status
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_BIO_ACOUSTIC_V1",
                    "verdict": "APPEAL_UPHELD_THRIVING",
                    "reason": "High-definition spectrogram confirms broadband noise was cascading waterfall. Gibbon and toucan biophony verified."
                })
            },
            "web_mocks": {
                supp_url: {"status": 200, "body": '{"corrected_ndsi": 88, "chainsaw": false}'}
            }
        }
    )

    contract.connect(rangers).adjudicate_appeal(args=[policy_id])

    p_resolved = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_resolved["status"] == 3  # STATUS_SETTLED_THRIVING
    assert p_resolved["verdict"] == "BIODIVERSITY_THRIVING_FULL"
    assert p_resolved["escrow_amount"] == "0"


def test_agentbioacoustic_unresolved_telemetry_fetch_failure(client):
    """Proves that network or parsing failures transition safely to STATUS_UNRESOLVED without settling."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    rangers = client.accounts[1]

    tx_create = contract.connect(sponsor).create_conservation_policy(
        args=[str(rangers), "BORNEO-RAINFOREST-CORRIDOR", 60, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    feed_url = "https://rfcx.org/streams/offline_sensor_stream.json"
    contract.connect(rangers).submit_soundscape_telemetry(args=[policy_id, feed_url])

    # Web mock returns empty/offline stream
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {},
            "web_mocks": {
                feed_url: {"status": 404, "body": ""}
            }
        }
    )

    contract.connect(rangers).adjudicate_soundscape_health(args=[policy_id])

    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 8  # STATUS_UNRESOLVED
    assert "UNRESOLVED_FETCH_FAILED" in p_data["verdict"]

    # Finalizing unresolved policy must fail
    with pytest.raises(Exception) as exc_info:
        contract.connect(rangers).finalize_settlement(args=[policy_id])
    assert "unresolved error state" in str(exc_info.value)


def test_agentbioacoustic_cancel_or_reclaim_expired(client):
    """Proves that sponsor can reclaim escrow once coverage duration has expired with zero telemetry."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    rangers = client.accounts[1]

    tx_create = contract.connect(sponsor).create_conservation_policy(
        args=[str(rangers), "GABON-NATIONAL-PARK", 65, 10],  # 30 seconds coverage
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    # Reclaiming before expiry should fail
    with pytest.raises(Exception) as exc_info:
        contract.connect(sponsor).cancel_or_reclaim(args=[policy_id])
    assert "Cannot reclaim: Policy is still active" in str(exc_info.value)

    # Advance time past expiration
    contract.advance_time(100)
    contract.connect(sponsor).cancel_or_reclaim(args=[policy_id])

    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 7  # STATUS_EXPIRED_RECLAIMED
    assert p_data["escrow_amount"] == "0"


def test_agentbioacoustic_pull_payment_claim(client):
    """Proves that beneficiaries can safely withdraw buffered balances via claim_payout."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    rangers = client.accounts[1]

    # Pre-seed claimable balance
    contract.claimable_balances[str(rangers).lower()] = 500000000000000000  # 0.5 GEN

    bal_res = contract.get_claimable_balance(args=[str(rangers)]).call()
    assert bal_res == "500000000000000000"

    tx_claim = contract.connect(rangers).claim_payout()
    assert int(tx_claim.return_value) == 500000000000000000

    bal_after = contract.get_claimable_balance(args=[str(rangers)]).call()
    assert bal_after == "0"


def test_agentbioacoustic_deploy_with_int_or_empty_address(client):
    """Proves that deploying with an integer address (from StudioNet calldata) or default owner succeeds seamlessly."""
    # Deploy with int address as passed by StudioNet: 472550793975058273004828829232443518568531124728
    int_addr = 472550793975058273004828829232443518568531124728
    contract_int = client.deploy("contracts/contract.py", args=[int_addr])
    stats_int = json.loads(contract_int.get_stats().call())
    assert stats_int["owner"] == "0x52c5e913fc54d00cba5df3312268bf66035661f8"

    # Deploy with no args
    contract_default = client.deploy("contracts/contract.py")
    stats_def = json.loads(contract_default.get_stats().call())
    assert stats_def["owner"] != ""

