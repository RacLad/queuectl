import crypto from "crypto";

/**
 * Generate a unique job ID
 * @returns {string} unique job id
 */
export function generateJobId() {
  return crypto.randomBytes(8).toString("hex"); // e.g. "a1b2c3d4e5f6g7h8"
}

/**
 * Get current timestamp in ISO format
 * @returns {string} current time
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Sleep helper — pauses execution for given seconds
 * @param {number} seconds 
 */
export function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}