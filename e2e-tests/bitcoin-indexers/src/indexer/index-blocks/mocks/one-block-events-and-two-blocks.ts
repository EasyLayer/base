export const mockBlocks = [
  {
    hash: '0000000000000000000000000000000000000000000000000000000000000001',
    confirmations: 4,
    strippedsize: 204,
    size: 204,
    weight: 816,
    height: 0,
    version: 1,
    versionHex: '00000001',
    merkleroot: '4d6f636b4d65726b6c65526f6f74000000000000000000000000000000000000',
    tx: [
      {
        txid: 'tx0-1',
        hash: 'abcd1234',
        version: 1,
        size: 134,
        vsize: 134,
        weight: 536,
        locktime: 0,
        vin: [
          {
            coinbase: '03e8a34d696e656420627920416e74506f6f6c312c204c4c43',
            sequence: 4294967295,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: {
              asm: 'OP_DUP OP_HASH160 1bc3305d889ed9519b8ab87cd43968b64f2d380d OP_EQUALVERIFY OP_CHECKSIG',
              hex: '76a9141bc3305d889ed9519b8ab87cd43968b64f2d380d88ac',
              reqSigs: 1,
              type: 'pubkeyhash',
              addresses: ['1BitcoinAddress'],
            },
          },
        ],
      },
    ],
    time: 1610000000,
    mediantime: 1610000000,
    nonce: 0,
    bits: '1d00ffff',
    difficulty: 1,
    chainwork: '0000000000000000000000000000000000000000000000000000000100010001',
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000000',
    nextblockhash: '0000000000000000000000000000000000000000000000000000000000000002',
  },
  {
    hash: '0000000000000000000000000000000000000000000000000000000000000002',
    confirmations: 3,
    strippedsize: 204,
    size: 204,
    weight: 816,
    height: 1,
    version: 1,
    versionHex: '00000001',
    merkleroot: '4d6f636b4d65726b6c65526f6f74000000000000000000000000000000000000',
    tx: [
      {
        txid: 'tx1-1',
        hash: 'abcd1235',
        version: 1,
        size: 134,
        vsize: 134,
        weight: 536,
        locktime: 0,
        vin: [
          {
            coinbase: '03e8a34d696e656420627920416e74506f6f6c312c204c4c44',
            sequence: 4294967295,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: {
              asm: 'OP_DUP OP_HASH160 1bc3305d889ed9519b8ab87cd43968b64f2d380d OP_EQUALVERIFY OP_CHECKSIG',
              hex: '76a9141bc3305d889ed9519b8ab87cd43968b64f2d380d88ac',
              reqSigs: 1,
              type: 'pubkeyhash',
              addresses: ['1BitcoinAddress'],
            },
          },
        ],
      },
      {
        txid: 'tx1-2',
        hash: 'abcd1236',
        version: 1,
        size: 144,
        vsize: 144,
        weight: 576,
        locktime: 0,
        vin: [
          {
            txid: 'tx0-1',
            vout: 0,
            scriptSig: {
              asm: '3045022100abcdef...022100123456...',
              hex: '483045022100abcdef...022100123456...',
            },
            sequence: 4294967294,
          },
        ],
        vout: [
          {
            value: 25.0,
            n: 0,
            scriptPubKey: {
              asm: 'OP_DUP OP_HASH160 2bc3305d889ed9519b8ab87cd43968b64f2d380d OP_EQUALVERIFY OP_CHECKSIG',
              hex: '76a9142bc3305d889ed9519b8ab87cd43968b64f2d380d88ac',
              reqSigs: 1,
              type: 'pubkeyhash',
              addresses: ['1BitcoinAddress1'],
            },
          },
          {
            value: 25.0,
            n: 1,
            scriptPubKey: {
              asm: 'OP_DUP OP_HASH160 3bc3305d889ed9519b8ab87cd43968b64f2d380d OP_EQUALVERIFY OP_CHECKSIG',
              hex: '76a9143bc3305d889ed9519b8ab87cd43968b64f2d380d88ac',
              reqSigs: 1,
              type: 'pubkeyhash',
              addresses: ['1BitcoinAddress2'],
            },
          },
        ],
      },
    ],
    time: 1610001000,
    mediantime: 1610001000,
    nonce: 1,
    bits: '1d00ffff',
    difficulty: 1,
    chainwork: '0000000000000000000000000000000000000000000000000000000200020002',
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000001',
    nextblockhash: '0000000000000000000000000000000000000000000000000000000000000003',
  },
];

export const mockEvents = [
  {
    id: 1,
    aggregateId: 'indexer',
    extra: null,
    version: 1,
    requestId: '6ce40d38-1c93-4dbb-bf63-27f584665682',
    type: 'BitcoinIndexerInitializedEvent',
    payload: '{"status":"awaiting","indexedHeight":"-1"}',
  },
  {
    id: 2,
    aggregateId: 'indexer',
    extra: null,
    version: 2,
    requestId: 'e6aae562-a02c-4f3e-90e5-7c12356e127c',
    type: 'BitcoinIndexerChainBlockAddedEvent',
    payload:
      '{"status":"awaiting","block":{"hash":"0000000000000000000000000000000000000000000000000000000000000001","confirmations":2868523,"height":0,"version":1,"versionHex":"00000001","merkleroot":"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b","time":1296688602,"mediantime":1296688602,"nonce":414098458,"bits":"1d00ffff","difficulty":1,"chainwork":"0000000000000000000000000000000000000000000000000000000100010001","nTx":1,"nextblockhash":"0000000000000000000000000000000000000000000000000000000000000002","strippedsize":285,"size":285,"weight":1140,"batches":["1c71df6e-d62e-4388-bb34-f3e32f2f520e"]}}',
  },
  {
    id: 3,
    aggregateId: '0000000000000000000000000000000000000000000000000000000000000001',
    extra: null,
    version: 1,
    requestId: 'f0321c95-2223-4732-8735-871e60ce6758',
    type: 'BitcoinIndexerBlockIndexedEvent',
    payload:
      '{"block":{"hash":"0000000000000000000000000000000000000000000000000000000000000001","confirmations":2868523,"height":0,"version":1,"versionHex":"00000001","merkleroot":"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b","time":1296688602,"mediantime":1296688602,"nonce":414098458,"bits":"1d00ffff","difficulty":1,"chainwork":"0000000000000000000000000000000000000000000000000000000100010001","nTx":1,"nextblockhash":"0000000000000000000000000000000000000000000000000000000000000002","strippedsize":285,"size":285,"weight":1140},"batches":{"1c71df6e-d62e-4388-bb34-f3e32f2f520e":"indexed"},"status":"indexed"}',
  },
  {
    id: 4,
    aggregateId: '1c71df6e-d62e-4388-bb34-f3e32f2f520e',
    extra: null,
    version: 1,
    requestId: '0988b9b3-8b6f-4bf2-876a-0b7316bbea86',
    type: 'BitcoinIndexerTransactionsBatchIndexedEvent',
    payload:
      '{"batch":{"tx":[{"txid":"tx0-1","hash":"abcd1234","version":1,"size":109,"vsize":109,"weight":436,"locktime":0,"vin":[{"coinbase":"0420e7494d017f062f503253482f","sequence":4294967295}],"vout":[{"value":50,"n":0,"scriptPubKey":{"asm":"021aeaf2f8638a129a3156fbe7e5ef635226b0bafd495ff03afe2c843d7e3a4b51 OP_CHECKSIG","desc":"pk(021aeaf2f8638a129a3156fbe7e5ef635226b0bafd495ff03afe2c843d7e3a4b51)#szvgjj6l","hex":"21021aeaf2f8638a129a3156fbe7e5ef635226b0bafd495ff03afe2c843d7e3a4b51ac","type":"pubkey"}}],"hex":"01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0e0420e7494d017f062f503253482fffffffff0100f2052a010000002321021aeaf2f8638a129a3156fbe7e5ef635226b0bafd495ff03afe2c843d7e3a4b51ac00000000"}],"n":0,"isFinalBatch":true},"blockHeight":"0","blockHash":"0000000000000000000000000000000000000000000000000000000000000001","prevBlockHash":"","status":"indexed"}',
  },
];
