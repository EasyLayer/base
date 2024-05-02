import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot } from '@easylayer/cqrs';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import {
  BitcoinNetworkInitializedEvent,
  BitcoinNetworkBlockAddedEvent,

  BitcoinNetworkStatusUpdatedEvent,
  BitcoinUpdateIndexedBlockFromHeightEvent,
  BitcoinUpdateIndexedBlockHeightEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

type LightBlock = {
  height: bigint;
  hash: string;
  prevHash: string;
}

type ChainNode = {
  block: LightBlock;
  next: ChainNode | null;
  prev: ChainNode | null;
}

class Blockchain {
  private head: ChainNode | null = null;
  private tail: ChainNode | null = null;
  private _size: number = 0;

  get lastPrevBlockHash(): string {
    if (this.tail) {
      return this.tail.block.prevHash;
    } else {
      return '';
    }
  }

  get lastBlockHash(): string {
    if (this.tail) {
      return this.tail.block.hash;
    } else {
      return '';
    }
  }

  get lastBlockHeight(): bigint {
    if (this.tail) {
      return this.tail.block.height;
    } else {
      return 0n;
    }
  }

  get size(): number {
    return this._size;
  }

  isEmpty(): boolean {
    return this.size === 0;
  }

  // Adding a block to the end of the chain
  addBlock(height: bigint, hash: string, prevHash: string): void {
      const newBlock: LightBlock = { height, hash, prevHash };
      const newNode: ChainNode = { block: newBlock, next: null, prev: this.tail };

      if (this.tail) {
        this.tail.next = newNode;
      }
      this.tail = newNode;

      if (!this.head) {
        this.head = newNode;
      }

      this._size++;
  }

  // Deleting the last block
  removeLast(): LightBlock | null {
      if (!this.tail) return null;

      const block = this.tail.block;
      this.tail = this.tail.prev;

      if (this.tail) {
          this.tail.next = null;
      } else {
          this.head = null;
      }

      this._size--;
      return block;
  }

  // Get the last block without deleting
  peekLast(): LightBlock | null {
    return this.tail ? this.tail.block : null;
  }

  // Validates all blockchain
  validateChain(): boolean {
    let current = this.head;
    while (current && current.next) {
        // First check if the block heights increment by 1
        if (current.next.block.height !== current.block.height + 1n) {
          return false; // Height mismatch
        }
        // Then check if the hashes match
        if (current.block.hash !== current.next.block.prevHash) {
          return false; // Hash mismatch
        }
        current = current.next;
    }
    return true;
  }

  validateBlock(height: bigint, prevHash: string): boolean {
    if (!this.tail) {
      // If there's no blocks in the chain, we assume this is the first block.
      return true;
    }

    // Check if the given height is exactly one more than the last block's height.
    if (this.tail.block.height + 1n !== height) {
      return false;
    }

    // Check if the given previous hash matches the last block's hash.
    if (this.tail.block.hash !== prevHash) {
      return false;
    }

    return true;
  }

  // Method to find a block by height
  findBlockByHeight(height: bigint): ChainNode | null {
    let currentNode = this.tail;
    while (currentNode) {
      if (currentNode.block.height === height) {
        return currentNode;
      }
      currentNode = currentNode.prev;
    }
    return null;
  }
}

export class Network extends AggregateRoot {
  public readonly extra: string = 'network';
  public aggregateId!: string; // uuid
  public status!: string;
  public chain: Blockchain = new Blockchain();
 
  // IMPORTANT: this method doing two things:
  // 1 - create Network if it's first creation
  // 2 - use already created params but still publish event
  public async init({ requestId }: { requestId: string }) {
    const aggregateId = this.aggregateId || uuidv4();
    const status = this.status || 'awaiting';
    const height = this.chain.lastBlockHeight;

    await this.apply(new BitcoinNetworkInitializedEvent({
      aggregateId,
      requestId,
      status,
      height
    }));
  }

  public async addBlock({ block, requestId, service }: { block: any, requestId: string, service: BitcoinNetworkProviderService }) {
    if (this.status !== 'awaiting' && this.status !== 'reorganisation') {
      throw new Error('Previous Block did not complete indexing');
    }

    const { height, hash, previousblockhash } = block;

    if (!this.chain.validateBlock(height, previousblockhash)) {
      // So we need to update chain
      // Вот может быть тут можно сделать метод приватный, который пройдеться по блокам провайдера 
      // и найдет таки совпадение, откатит до этого совпадения chain 
      // как он будет откатывать chain до этог осовпадения это конечно вопрос, ему по сути нужно 
      // или по однмоу с конца удалять блоки, пока не найдет высоту что нужно? не только высоту но и хеш? 
      // 

      // Если реорганизация, то мы не можем тут создавать ивент, нам нужно в команде это сделать потому что блок поменяеться
      // Таким образом в команде знать есть ли реорганизация и запустить ивент. 
      // ИЛИ вариант что отсюда мы попадем на сагу другую, в этом месте мы все еще можем думаю использовать 
      // связь между сагами и ничего страшного. НУЖНО ДУМАТЬ. 

      await this.reorganisation(block, service);

      const newBlock = await service.getOneBlockByHeight(this.chain.lastBlockHeight);
      
      if (!this.chain.validateBlock(newBlock.height, newBlock.hash, newBlock.previousblockhash)) {
        // Тут мы должны удалить значит блок с chain 
        this.chain.removeLast();

        const newBlock2 = await service.getOneBlockByHeight(this.chain.lastBlockHeight);

        if (!this.chain.validateBlock(newBlock2.height, newBlock2.hash, newBlock2.previousblockhash)) {
          // Тут мы должны удалить значит блок с chain 
          this.chain.removeLast();

          const newBlock2 = await service.getOneBlockByHeight(this.chain.lastBlockHeight);
        }
      }

      // await this.apply(new BitcoinNetworkReorganisationEvent({
      //   aggregateId: this.aggregateId,
      //   requestId,
      //   status: 'reorganisation',
      //   block
      // }));
    }

    await this.apply(new BitcoinNetworkBlockAddedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status: 'indexing',
      block
    }));
  }

  // Мы не сможем тут это сделать потому что нам в команде как то прервать нужно тогда
  // Чтобы блок понимал что не нужно индексировать, а мы это никак отсюда не сделаем кроме ошибки
  // Поэтому мы не можем такие вещи тут сделать...
  // ИДЕЯ, я могу поменять состояние в методе? или так нельзя делать? и сделат проверку на статус уже дальше в команде?
  // думаю это было бы не правильно. 
  private async reorganisation(block: any, service: BitcoinNetworkProviderService): Promise<boolean> {
    // Check heiht
    // if ()


    return true;
  }
  

  private onBitcoinNetworkInitializedEvent({ payload }: BitcoinNetworkInitializedEvent) {
    const { aggregateId, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status;
  }

  private onBitcoinNetworkBlockAddedEvent({ payload }: BitcoinNetworkBlockAddedEvent) {
    const { aggregateId, block } = payload;
    this.aggregateId = aggregateId;

    const { height, hash, previousblockhash } = block;
    this.chain.addBlock(height, hash, previousblockhash);
  }

}
