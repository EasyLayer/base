import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BitcoinWebhookStreamService } from '@easylayer/bitcoin-network-provider';
import { BlocksQueueLoaderService } from './blocks-loader/blocks-loader.service';
import { Block } from './interfaces';
import { StrategyNames } from './blocks-loader/load-strategies';

@Controller('blocks-queue')
export class BlocksQueueController {
  constructor(
    private readonly blocksQueueLoader: BlocksQueueLoaderService,
    private readonly webhookStreamService: BitcoinWebhookStreamService
  ) {}

  @Post('/webhook/block')
  async handleBlockWebhook(@Req() req: Request, @Res() res: Response) {
    // try {
    await this.webhookStreamService.handleStream({
      stream: req,
      onDataCallback: async (block: Block) =>
        await this.blocksQueueLoader.addBlockToQueue(block, StrategyNames.WEBHOOK_STREAM),
      onFinishCallback: async () => {
        //
        await this.blocksQueueLoader.destroyStrategy();
        return res.status(200).send('OK');
      },
      onErrorCallback: async (error: any) => {
        console.error('Error processing stream:', error);
        await this.blocksQueueLoader.destroyStrategy();
        return res.status(500).send('Error processing stream');
      },
    });
    // } catch (error) {
    //     res.status(500).send('Internal Server Error');
    // }
  }
}
