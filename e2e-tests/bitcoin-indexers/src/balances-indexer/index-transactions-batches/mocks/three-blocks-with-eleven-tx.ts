export const mockBlocks = [
  {
    height: 0,
    hash: '0000000000000000000000000000000000000000000000000000000000000001',
    previousblockhash: null,
    tx: [
      {
        txid: 'tx0-1',
        vin: [
          {
            coinbase: true,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: {
              hex: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
              type: 'pubkeyhash',
            },
          },
        ],
      },
      {
        txid: 'tx0-2',
        vin: [
          {
            txid: 'tx0-1',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 25.0,
            n: 0,
            scriptPubKey: {
              hex: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
              type: 'pubkeyhash',
            },
          },
          {
            value: 25.0,
            n: 1,
            scriptPubKey: {
              hex: 'a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba87',
              type: 'scripthash',
            },
          },
        ],
      },
      {
        txid: 'tx0-3',
        vin: [
          {
            coinbase: true,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: {
              hex: 'a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba87',
              type: 'scripthash',
            },
          },
        ],
      },
      {
        txid: 'tx0-4',
        vin: [
          {
            txid: 'tx0-2',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 25.0,
            n: 0,
            scriptPubKey: {
              hex: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
              type: 'pubkeyhash',
            },
          },
        ],
      },
    ],
  },
  {
    height: 1,
    hash: '0000000000000000000000000000000000000000000000000000000000000002',
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000001',
    tx: [
      {
        txid: 'tx1-1',
        vin: [
          {
            coinbase: true,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: {
              hex: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
              type: 'pubkeyhash',
            },
          },
        ],
      },
      {
        txid: 'tx1-2',
        vin: [
          {
            txid: 'tx1-1',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 25.0,
            n: 0,
            scriptPubKey: {
              hex: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
              type: 'pubkeyhash',
            },
          },
          {
            value: 25.0,
            n: 1,
            scriptPubKey: {
              hex: 'a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba87',
              type: 'scripthash',
            },
          },
        ],
      },
      {
        txid: 'tx1-3',
        vin: [
          {
            txid: 'tx1-2',
            vout: 1,
          },
        ],
        vout: [
          {
            value: 25.0,
            n: 0,
            scriptPubKey: {
              hex: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
              type: 'pubkeyhash',
            },
          },
        ],
      },
    ],
  },
  {
    height: 2,
    hash: '0000000000000000000000000000000000000000000000000000000000000003',
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000002',
    tx: [
      {
        txid: 'tx2-1',
        vin: [
          {
            coinbase: true,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: {
              hex: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
              type: 'pubkeyhash',
            },
          },
        ],
      },
      {
        txid: 'tx2-2',
        vin: [
          {
            txid: 'tx2-1',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: {
              hex: 'a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba87',
              type: 'scripthash',
            },
          },
        ],
      },
      {
        txid: 'tx2-3',
        vin: [
          {
            txid: 'tx2-2',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: {
              hex: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
              type: 'pubkeyhash',
            },
          },
        ],
      },
      {
        txid: 'tx2-4',
        vin: [
          {
            txid: 'tx1-3',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 25.0,
            n: 0,
            scriptPubKey: {
              hex: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
              type: 'pubkeyhash',
            },
          },
        ],
      },
    ],
  },
];
