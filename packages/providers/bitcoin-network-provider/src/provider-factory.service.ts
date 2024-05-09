import {
    BaseNodeProvider,
    ProviderNodeOptions,
    createSelfNodeProvider,
    QuickNodeProviderOptions,
    createQuickNodeProvider,
    SelfNodeProviderOptions,
} from './node-providers';

export interface ProviderOptions {
    connection?: ProviderNodeOptions;
    useFactory?: <T extends ProviderNodeOptions>(...args: any[]) => Promise<BaseNodeProvider<T>> | BaseNodeProvider<T>;
}

// Factory method
export function createProvider(options: ProviderNodeOptions): BaseNodeProvider<ProviderNodeOptions> {
    switch (options.type) {
        case 'selfnode':
            return createSelfNodeProvider(options as SelfNodeProviderOptions);
        case 'quicknode':
            return createQuickNodeProvider(options as QuickNodeProviderOptions);
        default:
            throw new Error(`Unsupported provider type: ${options.type}`);
    }
}