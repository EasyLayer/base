import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { BatchesQueueLoaderService } from './batches-loader';

@Controller('transactions-queue')
export class TransactionsQueueController {
  constructor(
    private readonly batchesQueueLoader: BatchesQueueLoaderService,
    private readonly webhookStreamService: BitcoinWebhookStreamService
  ) {}

  // TODO: add route path to .env
  @Post('/webhook/block')
  async handleBlockWebhook(@Req() req: Request, @Res() res: Response) {
    await this.webhookStreamService.handleStream({
      stream: req,
      onDataCallback: async (block: any) => await this.batchesQueueLoader.handleBlockFromStream(block),
      onFinishCallback: async () => {
        await this.batchesQueueLoader.destroyStrategy();
        return res.status(200).send('OK');
      },
      onErrorCallback: async (error: any) => {
        console.error('Error processing stream:', error);
        await this.batchesQueueLoader.destroyStrategy();
        return res.status(500).send('Error processing stream');
      },
    });
  }

  // TODO: add route path to .env
  // @Post('/webhook/tx')
  // async handleTxWebhook(@Req() req: Request, @Res() res: Response) {
  //   // TODO
  // }
}
