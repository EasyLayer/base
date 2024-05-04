import { Block } from './interfaces';

export class BlocksQueue<T extends Block> {
    private items: T[] = [];
    private waitingResolvers: Array<(item?: T) => void> = [];
  
    get length() {
      return this.items.length;
    }
  
    enqueue(item: T): void {
      this.items.push(item);
      // Sort blocks by height, given that height is a bigint
      this.items.sort((a, b) => {
        if (a.height < b.height) return -1;
        if (a.height > b.height) return 1;
        return 0;
      });
      this.processNext();
    }
  
    private processNext(): void {
      if (this.waitingResolvers.length > 0 && this.items.length > 0) {
        const resolver = this.waitingResolvers.shift();
        const item = this.items.shift();
        if (resolver && item) {
          resolver(item);
        }
      }
    }
    
    async peekFirstBlock(): Promise<T> {
      if (this.items.length > 0) {
        // Возвращаем блок, но не удаляем его из очереди
        return Promise.resolve(this.items[0]);
      }
      return new Promise<T>(resolve => {
        // Правильно типизируем резолвер, чтобы он принимал аргумент типа T и возвращал void
        this.waitingResolvers.push(resolve as (item?: T) => void);
      });
    }

    dequeue(): void {
      if (this.items.length > 0) {
        this.items.shift();  // Фактическое удаление блока из очереди
        this.processNext();  // Обработка следующего ожидающего резолвера, если таковой имеется
      }
    }
  
    requeue(item: T):void {
      this.items.unshift(item);
      // this.items.sort((a, b) => a.height - b.height); // Повторная сортировка на случай requeue
      this.processNext();
    }
  
    clear(): void {
      this.items = [];
      // Отклоняем все ожидающие обещания пустыми
      while (this.waitingResolvers.length > 0) {
          const resolver = this.waitingResolvers.shift();
          if (resolver) {
            resolver();
          }
      }
    }

    fetchBlockByHeight(height: bigint): T {
      // Method find block by height inside queue and return it 
      const block = this.items.find(item => item.height === height);
      if (block) {
          return block;
      } else {
          throw new Error(`No block found with height ${height.toString()}`);
      }
    }
}