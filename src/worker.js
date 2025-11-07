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

// ✅ Command executor with OS-safe sleep fix
function normalizeCommand(command) {
  // Windows doesn’t have “sleep”, so convert it to timeout
  if (process.platform === "win32" && command.startsWith("sleep")) {
    const seconds = command.split(" ")[1] || "1";
    return `timeout /t ${seconds} > NUL && echo "Slept for ${seconds}s"`;
  }
  return command;
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
export async function startWorker() {
  console.log(chalk.cyan("👷 Worker started. Watching for jobs..."));

  const baseBackoff = 2; // exponential base

  while (true) {
    const data = readJobsFile();
    const pendingJob = data.jobs.find((job) => job.state === "pending");

    if (!pendingJob) {
      await delay(2000); // no pending jobs → wait 2s
      continue;
    }

    // Lock the job for processing
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
        console.log(
          chalk.magenta(`⏳ Retrying ${pendingJob.id} after ${wait / 1000}s (attempt ${pendingJob.attempts})...`)
        );
        writeJobsFile(data);
        await delay(wait);
        continue; // retry after backoff
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