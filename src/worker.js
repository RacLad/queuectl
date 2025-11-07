import fs from "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { setTimeout as delay } from "timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JOBS_FILE = path.join(__dirname, "../jobs.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

// ✅ Ensure jobs and config files exist
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

// ✅ Read/write helpers
function readJobsFile() {
  ensureFiles();
  return JSON.parse(fs.readFileSync(JOBS_FILE));
}

function writeJobsFile(data) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(data, null, 2));
}

// ✅ Exponential backoff
function getBackoffDelay(base, attempts) {
  return base ** attempts * 1000; // milliseconds
}

// ✅ Fix "sleep" command for Windows
function normalizeCommand(command) {
  if (process.platform === "win32" && command.startsWith("sleep")) {
    const seconds = command.split(" ")[1] || "1";
    return `timeout /t ${seconds} && echo Slept for ${seconds}s`;
  }
  return command;
}

// ✅ Cross-platform command executor
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    const normalized = normalizeCommand(command);

    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";
    const cmdArg = process.platform === "win32" ? ["/C", normalized] : ["-c", normalized];

    const child = spawn(shell, cmdArg, { stdio: "pipe" });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => (output += data.toString()));
    child.stderr.on("data", (data) => (errorOutput += data.toString()));

    child.on("close", (code) => {
      if (code === 0) {
        console.log(chalk.green(`✅ Command success: ${output.trim()}`));
        resolve(output);
      } else {
        console.log(chalk.red(`❌ Command failed: ${errorOutput || `Exit code ${code}`}`));
        reject(new Error(errorOutput || `Exit code ${code}`));
      }
    });
  });
}

// ✅ Worker Loop
export async function startWorker() {
  ensureFiles();
  console.log(chalk.cyan("👷 Worker started. Watching for jobs..."));

  const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
  const baseBackoff = config.backoff_base || 2;

  while (true) {
    const data = readJobsFile();
    const pendingJob = data.jobs.find((job) => job.state === "pending");

    if (!pendingJob) {
      await delay(2000); // wait before checking again
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
    } catch {
      pendingJob.attempts += 1;

      if (pendingJob.attempts <= pendingJob.max_retries) {
        pendingJob.state = "pending";
        const wait = getBackoffDelay(baseBackoff, pendingJob.attempts);
        console.log(
          chalk.magenta(
            `⏳ Retrying ${pendingJob.id} after ${wait / 1000}s (attempt ${pendingJob.attempts})...`
          )
        );
        writeJobsFile(data);
        await delay(wait);
        continue;
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
