⚙️ QueueCTL – Lightweight Asynchronous Job Queue System (Node.js)

QueueCTL is a modular and lightweight job queue system implemented in pure Node.js.
It enables asynchronous execution of shell commands, persistent job tracking, automatic retries with exponential backoff, and dead-letter queue (DLQ) management — all through an intuitive command-line interface (CLI).

🧩 Key Features
Feature	Description
🧱 Persistent Job Storage	Jobs are saved in a jobs.json file, ensuring state is retained across restarts.
⚙️ Command Execution	Executes shell commands asynchronously using child processes.
🔁 Automatic Retry & Exponential Backoff	Failed jobs are retried with exponentially increasing wait times.
💀 Dead Letter Queue (DLQ)	Jobs that permanently fail after maximum retries are moved to a dedicated DLQ.
🧰 CLI-Based Control	Simple, user-friendly CLI powered by yargs for managing queue operations.
🧩 Clean Modular Architecture	Separated logic for queuing, execution, storage, and utilities ensures maintainability.
🏗️ System Architecture
queuect1/
│
├── src/
│   ├── queue.js        → Job creation and enqueue operations
│   ├── worker.js       → Worker loop handling job execution and retries
│   ├── storage.js      → Display and manage jobs and DLQ
│   ├── util.js         → Utility functions (sleep, backoff logic)
│   └── jobs.json       → Persistent data store for jobs and DLQ
│
├── queuect1.js         → Main CLI entry using yargs
├── package.json        → Project metadata and dependencies
└── README.md           → Documentation


Each job is represented as a JSON object with metadata such as:

{
  "id": "job-1762538514067",
  "command": "echo 'Hello QueueCTL'",
  "state": "pending",
  "attempts": 0,
  "max_retries": 3,
  "created_at": "2025-11-07T14:35:00.000Z",
  "updated_at": "2025-11-07T14:35:00.000Z"
}

⚙️ Setup & Installation
1️⃣ Prerequisites

Node.js v18+

NPM (comes with Node)

Git (optional)

2️⃣ Installation
git clone <your_repo_url>
cd queuect1
npm init -y
npm install chalk yargs

3️⃣ Enable ES Modules

In your package.json, ensure you have:

"type": "module"

💻 CLI Usage Guide
🟩 Enqueue a New Job

Adds a new job (any valid shell command) to the queue:

node queuect1.js enqueue "echo 'Hello QueueCTL'"


Output:

Enqueued job: job-1762538514067
Job 'echo Hello QueueCTL' added to queue

🏗️ Start the Worker

Starts the background worker that continuously monitors and executes queued jobs:

node queuect1.js worker start


Behavior:

Processes jobs with state = pending

Updates job status to processing, completed, or dead

Retries failed jobs with exponential backoff delays

📋 View Job Status

Displays all jobs currently in the system:

node queuect1.js status


Example Output:

🧾 Current Jobs in Queue:

job-1762538514067 | echo 'Hello QueueCTL' | completed | Attempts: 0
job-1762539179324 | timeout /t 3 && echo 'Slept well!' | pending | Attempts: 1

💀 View Dead Letter Queue (DLQ)

Displays all jobs that have failed permanently after exceeding retry limits:

node queuect1.js dlq


Example Output:

💀 Dead Letter Queue:

job-1762539377968 | timeout /t 3 > NUL && echo 'Slept well!' | Failed after 3 attempts

🔁 Retry & Backoff Logic

When a job fails, the system automatically retries it up to its defined maximum retry limit.
Each retry uses exponential backoff to avoid flooding or rapid re-execution.

Formula:

delay = base^attempt * 1000 milliseconds


Example:

Attempt	Delay (seconds)
1	2
2	4
3	8

Failed jobs after the final attempt are marked as dead and moved to the DLQ.

🧠 How It Works

Job Enqueue → User adds a new command.
Stored in jobs.json with state "pending".

Worker Loop → Continuously polls jobs.json for pending jobs.

Execution Phase →

Executes the job command using child_process.spawn()

Captures stdout/stderr for logging

Updates job status in real-time

Failure Handling →

Retries failed jobs using exponential backoff.

Moves permanently failed jobs to the DLQ.

Persistence →

Job data survives restarts since it’s stored in JSON.

🧾 Validation & Requirements Check
Requirement	Status	Verification
All CLI commands functional	✅	enqueue, worker start, status, dlq tested
Jobs persist after restart	✅	Stored in jobs.json
Retry and backoff logic	✅	Implemented via exponential backoff
DLQ operational	✅	Dead jobs moved automatically
CLI usability	✅	Built with yargs, clear feedback messages
Code modularity	✅	4 distinct modules with clear responsibilities
Automated tests / verification script	✅	Manual run via CLI validates main flows
🧩 Example Workflow Demonstration
# Enqueue jobs
node queuect1.js enqueue "echo 'Task 1 completed'"
node queuect1.js enqueue "ping localhost -n 3"

# Start worker
node queuect1.js worker start

# View live status
node queuect1.js status

# View DLQ (if any failures)
node queuect1.js dlq

🧑‍💻 Author & Acknowledgments

Project Name: QueueCTL
Developed By: PRETHEEV SIVAKUMAR
Submitted For: Placement Assignment 
Technologies Used: Node.js, Chalk, Yargs, JSON Storage