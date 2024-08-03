type IntervalOptions = {
  interval: number; // initial interval
  multiplier: number; // step multiplier
  maxInterval: number; // maximum interval
  maxAttempts?: number; // number of attempts (infinite by default)
};

export const exponentialIntervalAsync = async (
  asyncFunction: () => Promise<void>,
  options: IntervalOptions
): Promise<void> => {
  const { interval, multiplier, maxAttempts = Infinity, maxInterval } = options;

  if (maxInterval < interval) {
    throw new Error('maxInterval cannot be less than initial interval');
  }

  let attemptCount = 0;
  let currentInterval = interval;

  return new Promise<void>((resolve, reject) => {
    async function scheduler() {
      if (maxAttempts !== Infinity && attemptCount >= maxAttempts) {
        resolve();
        return;
      }

      try {
        await asyncFunction();
      } catch (error) {
        reject(error);
        return;
      }

      if (maxAttempts !== Infinity) {
        attemptCount++;
      }

      // Increase the interval taking into account the maximum value
      currentInterval = Math.min(currentInterval * multiplier, maxInterval);

      // Schedule next call
      setTimeout(scheduler, currentInterval);
    }

    // First call to the scheduler
    setTimeout(scheduler, currentInterval);
  });
};
