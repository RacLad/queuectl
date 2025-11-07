import fs from "fs";
import path from "path";
import { exec } from "child_process";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { setTimeout as delay } from "timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JOBS_FILE = path.join(__dirname, "../jobs.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

// ensures the json file existence
function ensureFiles() {
  if (!fs.existsSync(JOBS_FILE)) {
    fs.writeFileSync(JOBS_FILE, JSON.stringify({ jobs: [], dlq: [] }, null, 2));
  }
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ max_retries: 3, backoff_base: 2 }, null, 2)
    );
  }
}

// Helper: read and write job file
function readJobsFile() {
  if (!fs.existsSync(JOBS_FILE)) {
    fs.writeFileSync(JOBS_FILE, JSON.stringify({ jobs: [], dlq: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(JOBS_FILE));
}

function writeJobsFile(data) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(data, null, 2));
}

//  Exponential Backoff Calculation
function getBackoffDelay(base, attempts) {
  return base ** attempts * 1000; // in milliseconds
}

//  Helper to execute a shell command
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(chalk.red(`❌ Command failed: ${stderr || error.message}`));
        reject(error);
      } else {
        console.log(chalk.green(`✅ Command success: ${stdout.trim()}`));
        resolve(stdout);
      }
    });
  });
}

//  Worker Function
async function runWorker(workerId) {
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
  console.log(chalk.cyan(`👷 Worker ${workerId} started.`));

  process.on("SIGINT", () => {
    console.log(chalk.yellow(`\n🛑 Worker ${workerId} shutting down gracefully...`));
    process.exit(0);
  });

  while (true) {
    const data = readJobsFile();
    const pendingJob = data.jobs.find((job) => job.state === "pending");

    if (!pendingJob) {
      await delay(2000); // No pending jobs → wait 2s and check again
      continue;
    }

    // Mark job as processing
    pendingJob.state = "processing";
    pendingJob.updated_at = new Date().toISOString();
    writeJobsFile(data);

    console.log(chalk.yellow(`⚙️  Processing job: ${pendingJob.id} → ${pendingJob.command}`));

    try {
      await executeCommand(pendingJob.command);
      pendingJob.state = "completed";
      console.log(chalk.green(`🎉 Job ${pendingJob.id} completed successfully.`));
    } catch (err) {
      pendingJob.attempts += 1;

      if (pendingJob.attempts <= pendingJob.max_retries) {
        pendingJob.state = "pending";
        const wait = getBackoffDelay(baseBackoff, pendingJob.attempts);
        console.log(chalk.magenta(`⏳ Retrying ${pendingJob.id} after ${wait / 1000}s...`));
        writeJobsFile(data);
        await delay(wait);
        continue; // retry after delay
      } else {
        console.log(chalk.red(`💀 Job ${pendingJob.id} failed permanently. Moving to DLQ.`));
        pendingJob.state = "dead";
        data.dlq.push(pendingJob);
        data.jobs = data.jobs.filter((j) => j.id !== pendingJob.id);
      }
    }

    pendingJob.updated_at = new Date().toISOString();
    writeJobsFile(data);
  }
  
}

export async function startWorker(count = 1) {
  for (let i = 0; i < count; i++) {
    runWorker(i + 1);
  }
}
