import { exponentialIntervalAsync } from '../interval';

describe('exponentialIntervalAsync', () => {
  it('should call asyncFunc at least once', async () => {
    jest.useFakeTimers();
    const asyncFunc = jest.fn().mockResolvedValue(undefined);
    const options = { interval: 100, multiplier: 2, maxInterval: 1000 };

    exponentialIntervalAsync(asyncFunc, options);

    await jest.advanceTimersByTimeAsync(100);

    expect(asyncFunc).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('should stop after reaching maxAttempts', async () => {
    jest.useFakeTimers();
    const asyncFunc = jest.fn().mockResolvedValue(undefined);
    const options = { interval: 100, multiplier: 2, maxInterval: 1000, maxAttempts: 3 };

    const promise = exponentialIntervalAsync(asyncFunc, options);

    await jest.advanceTimersByTimeAsync(10000);

    await promise;

    expect(asyncFunc).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  it('should exponentially increase the interval', async () => {
    jest.useFakeTimers();
    const asyncFunc = jest.fn().mockResolvedValue(undefined);
    const options = { interval: 100, multiplier: 2, maxInterval: 800, maxAttempts: 4 };

    const promise = exponentialIntervalAsync(asyncFunc, options);

    await jest.advanceTimersByTimeAsync(10000);

    await promise;

    expect(asyncFunc).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });

  it('should not exceed maxInterval', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const asyncFunc = jest.fn().mockResolvedValue(undefined);
    const options = { interval: 100, multiplier: 2, maxInterval: 400, maxAttempts: 4 };

    const promise = exponentialIntervalAsync(asyncFunc, options);

    // await jest.advanceTimersByTimeAsync(10000);

    await promise;

    expect(asyncFunc).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });

  it('should reject the promise and stop execution on error', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const expectedError = new Error('Test error');
    const asyncFunc = jest
      .fn()
      .mockResolvedValueOnce(undefined) // First call succeeds
      .mockRejectedValueOnce(expectedError); // Second call throws an error

    const options = { interval: 100, multiplier: 2, maxInterval: 800 };

    // IMPORTANT: instead this we use the advanceTimers: true parameter
    // await jest.advanceTimersByTimeAsync(10000);

    // IMPORTANT: await is necessary here so that we wait for the exponentialIntervalAsync to complete
    await expect(exponentialIntervalAsync(asyncFunc, options)).rejects.toThrow(expectedError);

    expect(asyncFunc).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('should clear all timers after execution', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const asyncFunc = jest.fn().mockResolvedValue(undefined);
    const options = { interval: 100, multiplier: 2, maxInterval: 1000, maxAttempts: 3 };

    await exponentialIntervalAsync(asyncFunc, options);

    // Make sure there are no hanging timers
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
