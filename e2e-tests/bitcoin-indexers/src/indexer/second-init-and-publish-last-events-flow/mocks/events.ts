export const mockIndexerEvents = [
  {
    // id: 1,
    aggregateId: 'indexer',
    extra: null,
    version: 1,
    requestId: '5a536a60-cf6b-49d9-a1bf-557df242c9a3',
    type: 'BitcoinIndexerInitializedEvent',
    payload: '{"status":"awaiting","height":"-1"}',
  },
  {
    // id: 2,
    aggregateId: 'indexer',
    extra: null,
    version: 2,
    requestId: 'a48b639d-cc7b-41de-bafd-10935a1dc601',
    type: 'BitcoinIndexerBlockWithConfirmAddedEvent',
    payload:
      '{"status":"awaiting","block":{"hash":"000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943","confirmations":2820924,"height":0,"version":1,"versionHex":"00000001","merkleroot":"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b","time":1296688602,"mediantime":1296688602,"nonce":414098458,"bits":"1d00ffff","difficulty":1,"chainwork":"0000000000000000000000000000000000000000000000000000000100010001","nTx":1,"nextblockhash":"00000000b873e79784647a6c82962c70d228557d24a747ea4d1b8bbe878e1206","strippedsize":285,"size":285,"weight":1140}}',
  },
  {
    // id: 3,
    aggregateId: 'indexer',
    extra: null,
    version: 3,
    requestId: '770b0eee-41de-4a50-8ce0-8e8e00ab71b8',
    type: 'BitcoinIndexerBlockWithConfirmAddedEvent',
    payload:
      '{"status":"awaiting","block":{"hash":"00000000b873e79784647a6c82962c70d228557d24a747ea4d1b8bbe878e1206","confirmations":2820923,"height":1,"version":1,"versionHex":"00000001","merkleroot":"f0315ffc38709d70ad5647e22048358dd3745f3ce3874223c80a7c92fab0c8ba","time":1296688928,"mediantime":1296688928,"nonce":1924588547,"bits":"1d00ffff","difficulty":1,"chainwork":"0000000000000000000000000000000000000000000000000000000200020002","nTx":1,"previousblockhash":"000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943","nextblockhash":"000000006c02c8ea6e4ff69651f7fcde348fb9d557a06e6957b65552002a7820","strippedsize":190,"size":190,"weight":760}}',
  },
];

export const mockBlocksEvents = {
  '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943': {
    // id: 1,
    aggregateId: '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943',
    extra: null,
    version: 1,
    requestId: 'a48b639d-cc7b-41de-bafd-10935a1dc601',
    type: 'BitcoinBlockWithCompleteIndexedEvent',
    payload:
      '{"block":{"hash":"000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943","confirmations":2820924,"height":0,"version":1,"versionHex":"00000001","merkleroot":"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b","time":1296688602,"mediantime":1296688602,"nonce":414098458,"bits":"1d00ffff","difficulty":1,"chainwork":"0000000000000000000000000000000000000000000000000000000100010001","nTx":1,"nextblockhash":"00000000b873e79784647a6c82962c70d228557d24a747ea4d1b8bbe878e1206","strippedsize":285,"size":285,"weight":1140},"batches":{"6a418313-0043-4933-b206-a0d0737289ec":"completed"},"status":"completed"}',
  },
  '00000000b873e79784647a6c82962c70d228557d24a747ea4d1b8bbe878e1206': {
    // id: 2,
    aggregateId: '00000000b873e79784647a6c82962c70d228557d24a747ea4d1b8bbe878e1206',
    extra: null,
    version: 1,
    requestId: '770b0eee-41de-4a50-8ce0-8e8e00ab71b8',
    type: 'BitcoinBlockWithCompleteIndexedEvent',
    payload:
      '{"block":{"hash":"00000000b873e79784647a6c82962c70d228557d24a747ea4d1b8bbe878e1206","confirmations":2820923,"height":1,"version":1,"versionHex":"00000001","merkleroot":"f0315ffc38709d70ad5647e22048358dd3745f3ce3874223c80a7c92fab0c8ba","time":1296688928,"mediantime":1296688928,"nonce":1924588547,"bits":"1d00ffff","difficulty":1,"chainwork":"0000000000000000000000000000000000000000000000000000000200020002","nTx":1,"previousblockhash":"000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943","nextblockhash":"000000006c02c8ea6e4ff69651f7fcde348fb9d557a06e6957b65552002a7820","strippedsize":190,"size":190,"weight":760},"batches":{"db54bcbc-2bfd-4b45-8093-60a40a75bde2":"completed"},"status":"completed"}',
  },
};

export const mockTransactionsBatchesEvents = {
  '6a418313-0043-4933-b206-a0d0737289ec': {
    // id: 1,
    aggregateId: '6a418313-0043-4933-b206-a0d0737289ec',
    extra: null,
    version: 1,
    requestId: 'a48b639d-cc7b-41de-bafd-10935a1dc601',
    type: 'BitcoinTransactionsBatchWithIndexCreatedEvent',
    payload:
      '{"batch":{"transactions":[{"txid":"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b","hash":"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b","version":1,"size":204,"vsize":204,"weight":816,"locktime":0,"vin":[{"coinbase":"04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73","sequence":4294967295}],"vout":[{"value":50,"n":0,"scriptPubKey":{"asm":"04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f OP_CHECKSIG","desc":"pk(04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f)#vlz6ztea","hex":"4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac","type":"pubkey"}}],"hex":"01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000"}],"index":0,"isFinalBatch":true},"blockHeight":"0","blockHash":"000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943","status":"completed"}',
  },
  'db54bcbc-2bfd-4b45-8093-60a40a75bde2': {
    // id: 2,
    aggregateId: 'db54bcbc-2bfd-4b45-8093-60a40a75bde2',
    extra: null,
    version: 1,
    requestId: '770b0eee-41de-4a50-8ce0-8e8e00ab71b8',
    type: 'BitcoinTransactionsBatchWithIndexCreatedEvent',
    payload:
      '{"batch":{"transactions":[{"txid":"f0315ffc38709d70ad5647e22048358dd3745f3ce3874223c80a7c92fab0c8ba","hash":"f0315ffc38709d70ad5647e22048358dd3745f3ce3874223c80a7c92fab0c8ba","version":1,"size":109,"vsize":109,"weight":436,"locktime":0,"vin":[{"coinbase":"0420e7494d017f062f503253482f","sequence":4294967295}],"vout":[{"value":50,"n":0,"scriptPubKey":{"asm":"021aeaf2f8638a129a3156fbe7e5ef635226b0bafd495ff03afe2c843d7e3a4b51 OP_CHECKSIG","desc":"pk(021aeaf2f8638a129a3156fbe7e5ef635226b0bafd495ff03afe2c843d7e3a4b51)#szvgjj6l","hex":"21021aeaf2f8638a129a3156fbe7e5ef635226b0bafd495ff03afe2c843d7e3a4b51ac","type":"pubkey"}}],"hex":"01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0e0420e7494d017f062f503253482fffffffff0100f2052a010000002321021aeaf2f8638a129a3156fbe7e5ef635226b0bafd495ff03afe2c843d7e3a4b51ac00000000"}],"index":0,"isFinalBatch":true},"blockHeight":"1","blockHash":"00000000b873e79784647a6c82962c70d228557d24a747ea4d1b8bbe878e1206","status":"completed"}',
  },
};

export const mockEvents = [
  ...mockIndexerEvents,
  ...Object.values(mockBlocksEvents),
  ...Object.values(mockTransactionsBatchesEvents),
];
