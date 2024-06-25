export const mockBlocks = [
  {
    height: 0,
    hash: '0000000000000000000000000000000000000000000000000000000000000001',
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000000',
    merkleRoot: '4d6f636b4d65726b6c65526f6f74000000000000000000000000000000000000',
    timestamp: 1610000000,
    tx: [
      {
        txid: 'tx0-1',
        hash: 'abcd1234',
        inputs: [{ prevOut: '0000', index: 0, scriptSig: '483045022100f3d...012102abcd' }],
        outputs: [{ value: 5000000000, scriptPubKey: '76a914...88ac' }],
      },
    ],
  },
  {
    height: 1,
    hash: '0000000000000000000000000000000000000000000000000000000000000002',
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000001',
    merkleRoot: '4d6f636b4d65726b6c65526f6f74000000000000000000000000000000000001',
    timestamp: 1610000600,
    tx: [
      {
        txid: 'tx1-1',
        hash: 'abcd1235',
        inputs: [{ prevOut: '0001', index: 0, scriptSig: '483045022100f3d...012102abcd' }],
        outputs: [{ value: 4000000000, scriptPubKey: '76a914...88ac' }],
      },
      {
        txid: 'tx1-2',
        hash: 'abcd1236',
        inputs: [{ prevOut: '0002', index: 0, scriptSig: '483045022100f3d...012102abcd' }],
        outputs: [{ value: 3000000000, scriptPubKey: '76a914...88ac' }],
      },
    ],
  },
  {
    height: 2,
    hash: '0000000000000000000000000000000000000000000000000000000000000003',
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000002',
    merkleRoot: '4d6f636b4d65726b6c65526f6f74000000000000000000000000000000000002',
    timestamp: 1610001200,
    tx: [
      {
        txid: 'tx2-1',
        hash: 'abcd1237',
        inputs: [{ prevOut: '0003', index: 0, scriptSig: '483045022100f3d...012102abcd' }],
        outputs: [{ value: 6000000000, scriptPubKey: '76a914...88ac' }],
      },
      {
        txid: 'tx2-2',
        hash: 'abcd1238',
        inputs: [{ prevOut: '0004', index: 0, scriptSig: '483045022100f3d...012102abcd' }],
        outputs: [{ value: 7000000000, scriptPubKey: '76a914...88ac' }],
      },
      {
        txid: 'tx2-3',
        hash: 'abcd1239',
        inputs: [{ prevOut: '0005', index: 0, scriptSig: '483045022100f3d...012102abcd' }],
        outputs: [{ value: 8000000000, scriptPubKey: '76a914...88ac' }],
      },
    ],
  },
  {
    height: 3,
    hash: '0000000000000000000000000000000000000000000000000000000000000004',
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000003',
    merkleRoot: '4d6f636b4d65726b6c65526f6f74000000000000000000000000000000000003',
    timestamp: 1610001800,
    tx: [
      {
        txid: 'tx3-1',
        hash: 'abcd1240',
        inputs: [{ prevOut: '0006', index: 0, scriptSig: '483045022100f3d...012102abcd' }],
        outputs: [{ value: 9000000000, scriptPubKey: '76a914...88ac' }],
      },
      {
        txid: 'tx3-2',
        hash: 'abcd1241',
        inputs: [{ prevOut: '0007', index: 0, scriptSig: '483045022100f3d...012102abcd' }],
        outputs: [{ value: 1000000000, scriptPubKey: '76a914...88ac' }],
      },
      {
        txid: 'tx3-3',
        hash: 'abcd1242',
        inputs: [{ prevOut: '0008', index: 0, scriptSig: '483045022100f3d...012102abcd' }],
        outputs: [{ value: 2000000000, scriptPubKey: '76a914...88ac' }],
      },
      {
        txid: 'tx3-4',
        hash: 'abcd1243',
        inputs: [{ prevOut: '0009', index: 0, scriptSig: '483045022100f3d...012102abcd' }],
        outputs: [{ value: 3000000000, scriptPubKey: '76a914...88ac' }],
      },
    ],
  },
];
