import fs from  "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

// Helper to get current file path (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JOBS_FILE = path.join(__dirname, "../jobs.json");
