import { mockBlocksEvents, mockTransactionsBatchesEvents } from './events';

export const mockBlocks = Object.values(mockBlocksEvents).map((blockEvent) => {
  const payload = JSON.parse(blockEvent.payload);
  return {
    hash: payload.block.hash,
    status: payload.status,
  };
});

export const mockTransactions = Object.values(mockTransactionsBatchesEvents).flatMap((transactionBatchEvent) => {
  const payload = JSON.parse(transactionBatchEvent.payload);
  return payload.batch.transactions.map((transaction: any) => {
    return {
      txid: transaction.txid,
      status: payload.status,
      blockHash: payload.blockHash,
    };
  });
});
