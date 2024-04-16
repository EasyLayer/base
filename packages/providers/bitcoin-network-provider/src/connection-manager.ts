import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { BaseNodeAdapter } from './node-adapters';

@Injectable()
export class ConnectionManager implements OnModuleInit {
  private adapters: Map<string, BaseNodeAdapter> = new Map();
  private activeAdapterName!: string;

  constructor(
    adapters: BaseNodeAdapter[],
    private readonly log: AppLogger
  ) {
    adapters.forEach((adapter) => {
      const name = adapter.name;
      if (this.adapters.has(name)) {
        throw new Error(`An adapter with the name "${name}" has already been added.`);
      }
      this.adapters.set(name, adapter);
    });
  }

  async onModuleInit() {
    for (const adapter of this.adapters.values()) {
      if (await this.tryConnectAdapter(adapter)) {
        this.activeAdapterName = adapter.name;
        this.log.info(`Connected to adapter: ${adapter.constructor.name} with name: ${adapter.name}`);
        return;
      }
    }
    throw new Error('Unable to connect to any adapter.');
  }

  public async switchAdapter(adapterName: string): Promise<void> {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Adapter with name ${adapterName} not found`);
    }

    if (await this.tryConnectAdapter(adapter)) {
      this.activeAdapterName = adapterName;
      this.log.info(`Switched to adapter: ${adapter.constructor.name} with name: ${adapterName}`);
    } else {
      throw new Error(`Failed to switch to adapter with name ${adapterName}`);
    }
  }

  public async getCurrentAdapter(): Promise<BaseNodeAdapter> {
    const adapter = this.adapters.get(this.activeAdapterName);
    if (!adapter) {
      throw new Error(`Adapter with name ${this.activeAdapterName} not found`);
    }

    if ((await adapter.healthcheck()) || (await this.tryConnectAdapter(adapter))) {
      return adapter;
    }

    throw new Error('No available adapters found');
  }

  public async getAdapterByName(name: string): Promise<BaseNodeAdapter> {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter with name ${name} not found`);
    }

    // If the requested adapter is already active, return it
    if (this.activeAdapterName === name) {
      return adapter;
    }

    // Trying to connect to the requested adapter
    const isConnected = await this.tryConnectAdapter(adapter);
    if (!isConnected) {
      throw new Error(`Failed to connect to adapter with name ${name}`);
    }

    // Disable the current active adapter if necessary
    if (this.activeAdapterName && this.activeAdapterName !== name) {
      const currentActiveAdapter = this.adapters.get(this.activeAdapterName);
      if (currentActiveAdapter) {
        try {
          await currentActiveAdapter.disconnect();
          this.log.info(
            `Disconnected from adapter: ${currentActiveAdapter.constructor.name} with name: ${this.activeAdapterName}`
          );
        } catch (error) {
          this.log.error(
            `Failed to disconnect from adapter named ${this.activeAdapterName}`,
            error,
            this.constructor.name
          );
          // Here you can decide whether a failed shutdown is critical for your use case
        }
      }
    }

    // Update the active adapter
    this.activeAdapterName = name;
    this.log.info(`Connected to adapter: ${adapter.constructor.name} with name: ${name}`);
    return adapter;
  }

  private async tryConnectAdapter(adapter: BaseNodeAdapter): Promise<boolean> {
    try {
      await adapter.connect();
      return true;
    } catch (error) {
      this.log.error(`Failed to connect with adapter named ${adapter.name}`, error, this.constructor.name);
      return false;
    }
  }
}
