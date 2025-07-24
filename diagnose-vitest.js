import { spawn } from "child_process";
import { writeFileSync } from "fs";

const testFiles = [
	"lib/inngest-standalone.test.ts",
	"lib/telemetry.test.ts",
	"app/client-page.test.tsx",
	"app/container.test.tsx",
	"app/layout.test.tsx",
	"app/page.test.tsx",
	"hooks/use-anthropic-auth-refactored.test.ts",
	"hooks/use-anthropic-auth.test.ts",
	"hooks/use-audio-recorder.test.ts",
	"hooks/use-auth-base.test.ts",
];

const results = [];

async function testFile(file) {
	return new Promise((resolve) => {
		const startTime = Date.now();
		console.log(`Testing ${file}...`);

		const proc = spawn("bun", ["vitest", "run", file, "--reporter=json"], {
			timeout: 10000,
			killSignal: "SIGTERM",
		});

		let stdout = "";
		let stderr = "";
		let timedOut = false;

		const timeout = setTimeout(() => {
			timedOut = true;
			proc.kill("SIGTERM");
		}, 10000);

		proc.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		proc.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		proc.on("close", (code) => {
			clearTimeout(timeout);
			const duration = Date.now() - startTime;

			results.push({
				file,
				code,
				duration,
				timedOut,
				error: stderr.slice(0, 200),
			});

			console.log(`  ${timedOut ? "TIMEOUT" : code === 0 ? "PASS" : "FAIL"} (${duration}ms)`);
			resolve();
		});
	});
}

async function runDiagnostics() {
	console.log("Running Vitest diagnostics...\n");

	for (const file of testFiles) {
		await testFile(file);
	}

	console.log("\nSummary:");
	console.log("========");

	const timeouts = results.filter((r) => r.timedOut);
	const failures = results.filter((r) => !r.timedOut && r.code !== 0);
	const passes = results.filter((r) => !r.timedOut && r.code === 0);

	console.log(`Timeouts: ${timeouts.length}`);
	console.log(`Failures: ${failures.length}`);
	console.log(`Passes: ${passes.length}`);

	if (timeouts.length > 0) {
		console.log("\nFiles that timed out:");
		timeouts.forEach((r) => console.log(`  - ${r.file}`));
	}

	if (failures.length > 0) {
		console.log("\nFiles that failed:");
		failures.forEach((r) => console.log(`  - ${r.file} (code: ${r.code})`));
	}

	writeFileSync("vitest-diagnostic-results.json", JSON.stringify(results, null, 2));
	console.log("\nDetailed results written to vitest-diagnostic-results.json");
}

runDiagnostics().catch(console.error);
