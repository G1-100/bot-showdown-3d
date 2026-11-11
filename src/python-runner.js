import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(new URL("./python_bot_runner.py", import.meta.url));

export function runPythonBot(sourcePath, state, timeoutMs = 300) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [runner, sourcePath], { stdio: ["pipe", "pipe", "pipe"], timeout: timeoutMs, shell: false });
    let output = "", error = "";
    child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { error += chunk; });
    child.on("error", reject); child.on("close", code => { if (code !== 0) return reject(new Error(error.trim() || `Python bot exited ${code}`)); try { resolve(JSON.parse(output)); } catch { reject(new Error("Bot did not return JSON")); } });
    child.stdin.end(JSON.stringify(state));
  });
}
