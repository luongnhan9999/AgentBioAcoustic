#!/usr/bin/env python3
"""
Test live read on deployed AgentBioAcoustic contract on GenLayer StudioNet.
"""

import json
from pathlib import Path
from genlayer_py import create_client, create_account, generate_private_key, studionet

dep_file = Path(__file__).parent.parent / "deployment.json"
with open(dep_file, "r") as f:
    data = json.load(f)

contract_address = data["contractAddress"]
print(f"Testing live calls to contract: {contract_address}")

account = create_account(generate_private_key())
client = create_client(chain=studionet, account=account)

stats_str = client.read_contract(
    address=contract_address,
    function_name="get_stats",
    args=[]
)
print("Stats from deployed contract:", stats_str)

policies_str = client.read_contract(
    address=contract_address,
    function_name="get_all_policies",
    args=[]
)
print("Policies from deployed contract:", policies_str)
