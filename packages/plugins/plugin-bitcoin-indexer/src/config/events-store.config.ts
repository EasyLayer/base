import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber, IsString, IsBoolean } from 'class-validator';
import { IsBigInt } from '../decorators';

type DatabaseTypes =  'sqlite' | 'postgres';

@Injectable()
export class EventStoreConfig {
    @IsString()
    BITCOIN_INDEXER_EVENTSTORE_DB_TYPE: DatabaseTypes = 'sqlite';

    @IsString()
    BITCOIN_INDEXER_EVENTSTORE_DB_NAME: string = 'indexer-write';

    // TODO
    @IsBoolean()
    BITCOIN_INDEXER_EVENTSTORE_DB_SYNCHRONIZE: boolean = true;

    // TODO
    @IsBoolean()
    BITCOIN_INDEXER_EVENTSTORE_DB_IS_WAL: boolean = true;

    isLogging(): boolean {
        return process.env.DEBUG === 'y'; 
    }
}
