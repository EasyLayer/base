interface MemoryUsage {
  [key: string]: string;
}

function getMemoryUsage() {
  const used = process.memoryUsage();
  const result = Object.entries(used).reduce((acc: MemoryUsage, [key, value]) => {
    acc[key] = `${(value / 1024 / 1024).toFixed(2)} MB`;
    return acc;
  }, {} as MemoryUsage);
  return result;
}

export interface RuntimeTrackerParams {
  warningThresholdMs?: number;
  errorThresholdMs?: number;
  showMemory?: boolean;
}

export function RuntimeTracker({
  warningThresholdMs = 100,
  errorThresholdMs = 300,
  showMemory = false,
}: RuntimeTrackerParams = {}): MethodDecorator {
  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      let errorOccurred = false;

      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        errorOccurred = true;
        throw error;
      } finally {
        const time = Date.now() - start;
        const context = `${target.constructor.name}.${String(key)}`;
        const logArgs: any = {
          time: `${time} ms`,
          context,
          warningThresholdMs,
          errorThresholdMs,
        };

        if (showMemory) {
          logArgs.memory = getMemoryUsage();
        }

        const message = `${context} - Execution time: ${time} ms`;
        if (errorOccurred) {
          console.error(`${message} - An error occurred`, logArgs);
        } else if (errorThresholdMs && time > errorThresholdMs) {
          console.error(message, logArgs);
        } else if (warningThresholdMs && time > warningThresholdMs) {
          console.warn(message, logArgs);
        } else {
          console.debug(message, logArgs);
        }
      }
    };

    return descriptor;
  };
}
