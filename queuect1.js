import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";
import {enqueueJob} from "./src/queue.js"
import {startWorker} from "./src/worker.js"
import {showJobs , showDLQ} from "./src/storage.js"
import { argv } from "process";

const cli = yargs(hideBin(process.argv))
  .scriptName("queuectl")
  .usage("Usage: $0 <command> [options]")


// for enqueue command 

.command(
    "enqueue <jobName>",
    "Add a new job to the queue",
    (yargs) => {
        yargs.positional("jobName",{
            describe: "Name of the job to enqueue",
            type: "string",
        });
    },
    async(argv) => {
        await enqueueJob(argv.jobName);
        console.log(chalk.green(`Job '${argv.jobName}' added to queue`));
    }
)

// for Worker command (with nesting)
  .command(
    "worker <action>",
    "Manage worker actions (start)",
    (yargs) => {
      yargs.positional("action", {
        describe: "Action for worker (e.g., start)",
        type: "string",
        choices: ["start"],
      });
    },
    async (argv) => {
      if (argv.action === "start") {
        console.log(chalk.cyan("🚀 Starting worker..."));
        await startWorker();
      }
    }
  )

  // for Status command 
  .command(
    "status",
    "view all jobs and thier current status",
    () => {},
    async () => {
        await showJobs();
    }
  )
