export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exponential backoff calculation for retries
export function getBackoffDelay(attempt) {
  const baseDelay = 1000; // 1 second
  return baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s, 8s...
}

// Simulate random job success/failure (for demo)
export function simulateJobProcessing(job) {
  console.log(`Processing job: ${job.command}`);
  // 70% chance success
  const success = Math.random() < 0.7;
  return success;
}
