export interface BlocksLoadingStrategy {
  readonly name: StrategyNames;
  isLoading: boolean;
  load(currentNetworkHeight: bigint): Promise<void>;
  destroy(): Promise<void>;
}

export enum StrategyNames {
  WEBHOOK_STREAM = 'webhook-stream',
  PULL_NETWORK_PROVIDER = 'pull-network-provider',
  PULL_NETWORK_TRANSPORT = 'pull-network-transport',
}
