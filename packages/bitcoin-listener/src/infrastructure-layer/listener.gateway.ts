import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

// Это будет в модуле
@WebSocketGateway()
export class BitcoinListenerGateway {
  @WebSocketServer()
  server!: Server;

  constructor() {}

  public sendEvent(event: any) {
    this.server.emit('event', { payload: event });
  }

  // Метод для приема подтверждений от клиентов
  @SubscribeMessage('commit')
  async handleBlockAck(@MessageBody() payload: { blockHeight: number }): Promise<void> {
    console.log(payload);

    // После коммита мы удаляем с базы все значения для всех блоков ниже этой высоты.
    // Это такое ручное очищение, если он подтвердил что принял значит мы не храним это уже.
  }
}
