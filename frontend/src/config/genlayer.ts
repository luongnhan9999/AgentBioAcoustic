import { formatGen, parseGenToWei } from '../utils/formatters';

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_ID_HEX = '0xF22F';
export const STUDIONET_RPC_URL = 'https://studio.genlayer.com/api';
export const STUDIO_URL = 'https://studio.genlayer.com';

// Authoritative Intelligent Contract deployed on GenLayer Studionet
export const DEFAULT_CONTRACT_ADDRESS = "0xe2Af7863C9f9f60C05e0B7307Ab00d2027262B2F";

export function getSavedContractAddress(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('agentbioacoustic_contract_address');
      if (
        stored &&
        stored.trim().startsWith('0x') &&
        stored.trim().length === 42
      ) {
        return stored.trim();
      }
    } catch (e) {
      // ignore
    }
  }
  return DEFAULT_CONTRACT_ADDRESS;
}

export function saveContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('agentbioacoustic_contract_address', address.trim());
  }
}

export async function fetchStudionetBalance(address: string): Promise<string> {
  if (!address) return '0.000';

  try {
    const res = await fetch(STUDIONET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: Date.now(),
      }),
    });
    const json = await res.json();
    if (json && json.result !== undefined && json.result !== null) {
      return formatGen(json.result);
    }
  } catch (err) {
    console.warn('Direct Studionet RPC eth_getBalance error:', err);
  }

  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const balHex = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      if (balHex) {
        return formatGen(balHex);
      }
    } catch (e) {
      console.warn('MetaMask eth_getBalance fallback error:', e);
    }
  }

  return '0.000';
}

export const STATUS_POLICY_OPEN = 0;
export const STATUS_TELEMETRY_SUBMITTED = 1;
export const STATUS_AWAITING_PAYOUT = 2;
export const STATUS_SETTLED_THRIVING = 3;
export const STATUS_SETTLED_PARTIAL = 4;
export const STATUS_SETTLED_TERMINATED = 5;
export const STATUS_DISPUTED = 6;
export const STATUS_EXPIRED_RECLAIMED = 7;
export const STATUS_UNRESOLVED = 8;

export interface ConservationPolicyData {
  policy_id: string;
  sponsor: string;
  ranger_station: string;
  dispute_initiator: string;
  escrow_amount: string;
  dispute_bond: string;
  forest_reserve_id: string;
  min_ndsi_threshold: number;
  soundscape_feed_url: string;
  evidence_hash: string;
  status: number;
  verdict: string;
  original_verdict: string;
  reason: string;
  confidence: number;
  measured_ndsi_score: number;
  gunshot_events_detected: number;
  chainsaw_minutes_detected: number;
  created_at_time: string;
  expires_at_time: string;
  audit_completed_time: string;
  supplemental_evidence_url?: string;
  appeal_prior_verdict?: string;
}

export interface ProtocolStats {
  total_policies: number;
  total_conservation_locked: string;
  total_policies_settled: number;
  owner: string;
}

/* -------------------------------------------------------------------------- */
/*                           GenVM Calldata Encoding                          */
/* -------------------------------------------------------------------------- */

const BITS_IN_TYPE = 3;
const TYPE_SPECIAL = 0;
const TYPE_PINT = 1;
const TYPE_NINT = 2;
const TYPE_STR = 4;
const TYPE_ARR = 5;
const TYPE_MAP = 6;
const SPECIAL_NULL = (0 << BITS_IN_TYPE) | TYPE_SPECIAL;
const SPECIAL_FALSE = (1 << BITS_IN_TYPE) | TYPE_SPECIAL;
const SPECIAL_TRUE = (2 << BITS_IN_TYPE) | TYPE_SPECIAL;

function writeNum(to: number[], data: bigint) {
  if (data === 0n) {
    to.push(0);
    return;
  }
  let curData = data;
  while (curData > 0n) {
    let cur = Number(curData & 0x7fn);
    curData >>= 7n;
    if (curData > 0n) {
      cur |= 128;
    }
    to.push(cur);
  }
}

function encodeNumWithType(to: number[], data: bigint, type: number) {
  const res = (data << BigInt(BITS_IN_TYPE)) | BigInt(type);
  writeNum(to, res);
}

function encodeNum(to: number[], data: bigint) {
  if (data >= 0n) {
    encodeNumWithType(to, data, TYPE_PINT);
  } else {
    encodeNumWithType(to, -data - 1n, TYPE_NINT);
  }
}

function encodeMap(to: number[], arr: [string, any][]) {
  const newEntries = arr.map(([k, v]) => [
    Array.from(k, (x) => x.codePointAt(0)!),
    new TextEncoder().encode(k),
    v,
  ] as const);

  newEntries.sort((v1, v2) => {
    const l = v1[0];
    const r = v2[0];
    for (let index = 0; index < l.length && index < r.length; index++) {
      const cur = l[index] - r[index];
      if (cur !== 0) return cur;
    }
    return l.length - r.length;
  });

  encodeNumWithType(to, BigInt(newEntries.length), TYPE_MAP);
  for (const [, k, v] of newEntries) {
    writeNum(to, BigInt(k.length));
    to.push(...k);
    pack(to, v);
  }
}

function pack(to: number[], data: any): void {
  if (data === null || data === undefined) {
    to.push(SPECIAL_NULL);
  } else if (typeof data === 'boolean') {
    to.push(data ? SPECIAL_TRUE : SPECIAL_FALSE);
  } else if (typeof data === 'number' || typeof data === 'bigint') {
    encodeNum(to, BigInt(data));
  } else if (typeof data === 'string') {
    const enc = new TextEncoder().encode(data);
    encodeNumWithType(to, BigInt(enc.length), TYPE_STR);
    to.push(...enc);
  } else if (Array.isArray(data)) {
    encodeNumWithType(to, BigInt(data.length), TYPE_ARR);
    for (const item of data) {
      pack(to, item);
    }
  } else if (typeof data === 'object') {
    encodeMap(to, Object.entries(data));
  } else {
    throw new Error(`Unsupported type for GenVM packing: ${typeof data}`);
  }
}

export function encodeCalldata(method: string, args: any[] = []): string {
  const bytes: number[] = [];
  encodeMap(bytes, [
    ['method', method],
    ['args', args],
  ]);
  return (
    '0x' +
    bytes
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

/* -------------------------------------------------------------------------- */
/*                           JSON-RPC Interactions                           */
/* -------------------------------------------------------------------------- */

export async function callContractView(
  contractAddress: string,
  method: string,
  args: any[] = []
): Promise<any> {
  const calldata = encodeCalldata(method, args);

  const res = await fetch(STUDIONET_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: contractAddress,
          data: calldata,
        },
        'latest',
      ],
      id: Date.now(),
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'GenLayer eth_call failed');
  }

  const result = data.result;
  if (!result || result === '0x') return null;

  try {
    if (typeof result === 'string' && result.startsWith('0x')) {
      const hex = result.slice(2);
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      }
      const jsonStart = str.indexOf('{');
      const jsonArrStart = str.indexOf('[');
      const start = jsonStart !== -1 && (jsonArrStart === -1 || jsonStart < jsonArrStart) ? jsonStart : jsonArrStart;
      if (start !== -1) {
        return JSON.parse(str.slice(start));
      }
      return str;
    }
    return JSON.parse(result);
  } catch {
    return result;
  }
}

export async function waitForTransactionReceipt(txHash: string, timeoutMs: number = 90000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const data = await res.json();
      const txData = data?.result;

      if (txData) {
        const execResultName = String(txData.tx_execution_result_name || '').toUpperCase();
        const execResultCode = String(txData.tx_execution_result || '');
        const statusName = String(txData.status_name || '').toUpperCase();
        const statusCode = String(txData.status || '');

        if (statusName === 'CANCELED' || statusCode === '8') {
          throw new Error('Transaction was canceled by GenLayer consensus (status: CANCELED).');
        }
        if (statusName === 'UNDETERMINED' || statusCode === '6') {
          throw new Error('Transaction outcome undetermined by GenLayer validators (status: UNDETERMINED).');
        }

        if (execResultName === 'FINISHED_WITH_ERROR' || execResultCode === '2') {
          const rawError =
            txData.genvm_result?.error_description ||
            txData.genvm_result?.stderr ||
            txData.error_description ||
            'Contract execution reverted on GenVM (FINISHED_WITH_ERROR)';
          throw new Error(`Transaction reverted on GenVM: ${rawError}`);
        }

        if (execResultName === 'FINISHED_WITH_RETURN' || execResultCode === '1') {
          return txData;
        }

        if (statusName === 'FINALIZED' || statusName === 'ACCEPTED' || statusCode === '7' || statusCode === '5') {
          return txData;
        }
      }

      // Check standard EVM receipt
      const recRes = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const recData = await recRes.json();
      if (recData?.result) {
        if (recData.result.status === '0x1' || recData.result.status === 1) {
          return recData.result;
        }
        if (recData.result.status === '0x0' || recData.result.status === 0) {
          throw new Error(`Transaction reverted with EVM status 0 (Tx: ${txHash})`);
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('reverted') || e?.message?.includes('FINISHED_WITH_ERROR')) {
        throw e;
      }
    }

    await new Promise((r) => setTimeout(r, 2500));
  }

  throw new Error(`Transaction confirmation timed out after ${Math.round(timeoutMs / 1000)}s.`);
}

export async function writeContract(
  contractAddress: string,
  userAddress: string,
  method: string,
  args: any[],
  valueWei: bigint = 0n
): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask is not detected. Please install MetaMask to interact with GenLayer.');
  }

  const calldata = encodeCalldata(method, args);
  const valHex = valueWei > 0n ? `0x${valueWei.toString(16)}` : '0x0';

  const txHash = await (window as any).ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: userAddress,
        to: contractAddress,
        data: calldata,
        value: valHex,
      },
    ],
  });

  await waitForTransactionReceipt(txHash);
  return txHash;
}

export async function switchToStudionet(ethereum?: any): Promise<boolean> {
  const eth = ethereum || (typeof window !== 'undefined' ? (window as any).ethereum : null);
  if (!eth) return false;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
    return true;
  } catch (switchError: any) {
    try {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: STUDIONET_CHAIN_ID_HEX,
            chainName: 'GenLayer Studionet',
            nativeCurrency: {
              name: 'GEN',
              symbol: 'GEN',
              decimals: 18,
            },
            rpcUrls: [STUDIONET_RPC_URL],
            blockExplorerUrls: [STUDIO_URL],
          },
        ],
      });
      return true;
    } catch (addError) {
      console.error('Failed to add GenLayer Studionet network:', addError);
      return false;
    }
  }
}
