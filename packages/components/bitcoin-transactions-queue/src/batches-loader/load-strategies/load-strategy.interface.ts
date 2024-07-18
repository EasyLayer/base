export interface BlocksLoadingStrategy {
  readonly name: StrategyNames;
  isLoading: boolean;
  load(currentNetworkHeight: number): Promise<void>;
  destroy(): Promise<void>;
}

export enum StrategyNames {
  BLOCKS_WEBHOOK_STREAM = 'blocks-webhook-stream',
  PULL_BLOCKS_BY_NETWORK_PROVIDER = 'pull-blocks-by-network-provider',
  PULL_BLOCKS_BY_NETWORK_TRANSPORT = 'pull-blocks-by-network-transport',
}
