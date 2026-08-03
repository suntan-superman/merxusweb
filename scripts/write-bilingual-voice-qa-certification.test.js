import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeBilingualVoiceQaCertification } from "./write-bilingual-voice-qa-certification.js";

test("writes a unified certification by consuming the existing bilingual report", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "merxus-bilingual-certification-"));
  const appRoot = path.join(root, "web");
  const sourceReportPath = path.join(root, "voice-qa-release.json");
  await mkdir(appRoot, { recursive: true });
  await writeFile(sourceReportPath, JSON.stringify({
    generatedAt: "2026-07-15T00:00:00.000Z",
    releaseReady: true,
    bilingualProductionReady: false,
    mandatoryChecksPassed: 4,
    mandatoryChecksTotal: 4,
    checks: [{ name: "standardTelephony", status: "PASS" }],
    recommendedAction: "Retain production disablement."
  }));

  try {
    const result = await writeBilingualVoiceQaCertification({
      appRoot,
      outputDir: "./reports/Merxus",
      sourceReportPath
    });
    const persisted = JSON.parse(await readFile(result.jsonPath, "utf8"));

    assert.equal(persisted.bilingualVoiceQa.status, "PASS");
    assert.equal(persisted.bilingualVoiceQa.releaseReady, true);
    assert.equal(persisted.bilingualVoiceQa.bilingualProductionReady, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports an unavailable backend report without inventing Voice QA results", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "merxus-bilingual-certification-"));
  const appRoot = path.join(root, "web");
  await mkdir(appRoot, { recursive: true });

  try {
    const result = await writeBilingualVoiceQaCertification({
      appRoot,
      outputDir: "./reports/Merxus",
      sourceReportPath: path.join(root, "missing.json")
    });

    assert.equal(result.certification.bilingualVoiceQa.status, "NOT_AVAILABLE");
    assert.equal(result.certification.bilingualVoiceQa.releaseReady, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
