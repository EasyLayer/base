import { Block } from './interfaces';

export class BlocksQueue<T extends Block> {
    private items: T[] = [];
    private waitingResolvers: Array<(item?: T) => void> = [];
  
    get length() {
      return this.items.length;
    }
  
    enqueue(item: T) {
      this.items.push(item);
      this.items.sort((a, b) => a.height - b.height); // Сортировка блоков по высоте
      this.processNext();
    }
  
    private processNext() {
      if (this.waitingResolvers.length > 0 && this.items.length > 0) {
        const resolver = this.waitingResolvers.shift();
        const item = this.items.shift();
        if (resolver && item) {
          resolver(item);
        }
      }
    }
  
    async dequeue(): Promise<T> {
      if (this.items.length > 0) {
        // Обеспечиваем, что метод shift() возвращает T, а не T | undefined
        return Promise.resolve(this.items.shift()!);
      }
      return new Promise<T>(resolve => {
        // Правильно типизируем резолвер, чтобы он принимал аргумент типа T и возвращал void
        this.waitingResolvers.push(resolve as (item?: T) => void);
      });
    }
  
    requeue(item: T) {
      this.items.unshift(item);
      // this.items.sort((a, b) => a.height - b.height); // Повторная сортировка на случай requeue
      this.processNext();
    }
  
    clear() {
      this.items = [];
      // Отклоняем все ожидающие обещания пустыми
      while (this.waitingResolvers.length > 0) {
          const resolver = this.waitingResolvers.shift();
          if (resolver) {
            resolver();
          }
      }
  }
}