#!/usr/bin/env python3
"""
Seed an initial demo policy on StudioNet for AgentBioAcoustic.
"""

import json
from pathlib import Path
from genlayer_py import create_client, create_account, studionet

PK = "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef"
dep_file = Path(__file__).parent.parent / "deployment.json"
with open(dep_file, "r") as f:
    data = json.load(f)

contract_address = data["contractAddress"]
account = create_account(PK)
client = create_client(chain=studionet, account=account)

print(f"[+] Seeding policy on contract {contract_address} with account {account.address}")

# Create policy: ranger_station, forest_reserve_id, min_ndsi_threshold, duration_blocks
ranger_station = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
reserve_id = "TAM-DAO-NATIONAL-PARK-Z4"
min_ndsi = 65
duration_blocks = 86400  # ~3 days

try:
    tx_hash = client.write_contract(
        address=contract_address,
        function_name="create_conservation_policy",
        args=[ranger_station, reserve_id, min_ndsi, duration_blocks],
        value=100000000000000000, # 0.1 GEN
        leader_only=False
    )
    print(f"[+] Policy creation tx submitted: {tx_hash}")
    receipt = client.wait_for_transaction_receipt(tx_hash)
    print(f"[+] Policy created successfully! Status: {receipt.get('status')}")
except Exception as e:
    print(f"[!] Seeding note: {e}")
