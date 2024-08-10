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
              hex: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
              reqSigs: 1,
              type: 'pubkeyhash',
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
];
