const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 750;

const wait = (delayMs) => new Promise((resolve) => {
  setTimeout(resolve, delayMs);
});

export const fetchPricingWithRetry = async (
  fetchPricing,
  {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    waitForRetry = wait,
  } = {},
) => {
  if (typeof fetchPricing !== 'function') {
    throw new TypeError('A pricing fetch function is required');
  }

  const boundedAttempts = Number.isInteger(maxAttempts) && maxAttempts > 0
    ? maxAttempts
    : DEFAULT_MAX_ATTEMPTS;
  let lastError;

  for (let attempt = 1; attempt <= boundedAttempts; attempt += 1) {
    try {
      return await fetchPricing();
    } catch (error) {
      lastError = error;
      if (attempt < boundedAttempts) {
        await waitForRetry(retryDelayMs);
      }
    }
  }

  throw lastError;
};
