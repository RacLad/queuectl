import fs from  "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

// Helper to get current file path (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JOBS_FILE = path.join(__dirname, "../jobs.json");

// Utility function to read JSON 
function readJobsFile() {
  if (!fs.existsSync(JOBS_FILE)) {
    fs.writeFileSync(JOBS_FILE, JSON.stringify({ jobs: [], dlq: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(JOBS_FILE));
}

// Utility function to write JSON 
function writeJobsFile(data) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(data, null, 2));
}

//  Function to create a new job i.e new object
export async function enqueueJob(command) {
  const data = readJobsFile();

  const newJob = {
    id: `job-${Date.now()}`, // unique ID
    command,
    state: "pending",        // waiting for worker
    attempts: 0,             // retry count
    max_retries: 3,          // configurable later
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  data.jobs.push(newJob);
  writeJobsFile(data);

  console.log(chalk.green(`Enqueued job: ${newJob.id}`));
  return newJob;
}
