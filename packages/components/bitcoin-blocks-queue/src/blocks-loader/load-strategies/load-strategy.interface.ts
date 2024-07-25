export interface BlocksLoadingStrategy {
  readonly name: StrategyNames;
  isLoading: boolean;
  load(currentNetworkHeight: number): Promise<void>;
  destroy(): Promise<void>;
}

export enum StrategyNames {
  WEBHOOK_STREAM = 'webhook-stream',
  PULL_NETWORK_PROVIDER_BY_BATCHES = 'pull-network-provider-by-batches',
  PULL_NETWORK_TRANSPORT = 'pull-network-transport',
  PULL_NETWORL_PROVIDER_BY_WORKERS = 'pull-network-provider-by-workers',
}
