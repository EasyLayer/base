import * as bunyan from 'bunyan';
import { LoggerOptions, nameFromLevel, safeCycles } from 'bunyan';
export { LoggerOptions };

export class BunyanStream {
  write(logMessage: any): void {
    const updatedLog = {
      ...logMessage,
      time: logMessage.time ? logMessage.time.toISOString() : new Date().toISOString(),
      level: nameFromLevel[logMessage.level] || 'info',
      // Removing "hostname" from the log
      hostname: undefined,
    };

    const result = JSON.stringify(updatedLog, safeCycles()) + '\n';
    process.stdout.write(result);
  }
}

export function createLogger(name: string): bunyan {
  const options: LoggerOptions = {
    name,
    level: 'info',
    streams: [
      {
        type: 'raw',
        stream: new BunyanStream(),
      },
    ],
  };

  return bunyan.createLogger(options);
}

export type BunyanInstance = bunyan;
