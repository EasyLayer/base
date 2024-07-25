export const commonBlock = {
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
          scriptPubKey: { addresses: ['1BitcoinAddress'] },
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
          scriptPubKey: { addresses: ['1BitcoinAddress'] },
        },
        {
          value: 25.0,
          n: 1,
          scriptPubKey: { addresses: ['1anotherAddress'] },
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
          scriptPubKey: { addresses: ['1anotherAddress'] },
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
          scriptPubKey: { addresses: ['1BitcoinAddress'] },
        },
      ],
    },
  ],
};

// First block - commonBlock.
// Blocks are valid from 1 to 2, there should be a reorganization on 3's block.
// These mocks are necessary to start the reorganisation process.
export const mockFakeChainBlocks = [
  commonBlock,
  {
    hash: '2000000000000000000000000000000000000000000000000000000000000002',
    height: 1,
    tx: [
      {
        txid: 'tx1-1fake',
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
        txid: 'tx1-2fake',
        vin: [
          {
            txid: 'tx1-1fake',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 25.0,
            n: 0,
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
          },
          {
            value: 25.0,
            n: 1,
            scriptPubKey: { addresses: ['1anotherAddress'] },
          },
        ],
      },
      {
        txid: 'tx1-3fake',
        vin: [
          {
            txid: 'tx1-2fake',
            vout: 1,
          },
        ],
        vout: [
          {
            value: 25.0,
            n: 0,
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
          },
        ],
      },
    ],
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000001',
  },
  {
    hash: '3000000000000000000000000000000000000000000000000000000000000003',
    height: 2,
    tx: [
      {
        txid: 'tx2-1fake',
        vin: [
          {
            coinbase: true,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
          },
        ],
      },
      {
        txid: 'tx2-2fake',
        vin: [
          {
            txid: 'tx2-1fake',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: { addresses: ['1anotherAddress'] },
          },
        ],
      },
      {
        txid: 'tx2-3fake',
        vin: [
          {
            txid: 'tx2-2fake',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 50.0,
            n: 0,
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
          },
        ],
      },
      {
        txid: 'tx2-4fake',
        vin: [
          {
            txid: 'tx1-3fake',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 25.0,
            n: 0,
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
          },
        ],
      },
    ],
    previousblockhash: '2200000000000000000000000000000000000000000000000000000000000002',
  },
];

// The chain is completely real.
// First block - commonBlock.
// This array is necessary for us to find the last height where the blocks coincided (the first block)
// and find out the height of the reorganization.
export const mockRealChainBlocks = [
  commonBlock,
  {
    hash: '0000000000000000000000000000000000000000000000000000000000000002',
    height: 1,
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
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
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
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
          },
          {
            value: 25.0,
            n: 1,
            scriptPubKey: { addresses: ['1anotherAddress'] },
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
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
          },
        ],
      },
    ],
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000001',
  },
  {
    hash: '0000000000000000000000000000000000000000000000000000000000000003',
    height: 2,
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
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
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
            scriptPubKey: { addresses: ['1anotherAddress'] },
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
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
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
            scriptPubKey: { addresses: ['1BitcoinAddress'] },
          },
        ],
      },
    ],
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000002',
  },
];
