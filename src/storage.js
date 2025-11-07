import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JOBS_FILE = path.join(__dirname, "../jobs.json");

//Ensure jobs.json exists. If not, create with default structure.
function ensureFileExists() {
    if (!fs.existsSync(JOBS_FILE)) {
        const defaultData = {
            jobs: [],
            dlq: []
        };
        fs.writeFileSync(JOBS_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
        console.log("✅ jobs.json created with default structure");
    }
}

/**
 * Reads jobs.json and returns parsed object
 * @returns {Object} job data
 */
export function readJobsFile() {
    ensureFileExists();
    const rawData = fs.readFileSync(JOBS_FILE, "utf-8");
    return JSON.parse(rawData);
}
