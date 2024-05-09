import { QuickNodeProviderOptions } from './quick-node.provider';
import { SelfNodeProviderOptions } from './self-node.provider';


export interface BaseProviderNodeOptions {
    type: ProviderNodeType;
    name: string;
}

export type ProviderNodeType = 'selfnode' | 'quicknode';
export type ProviderNodeOptions = SelfNodeProviderOptions | QuickNodeProviderOptions;