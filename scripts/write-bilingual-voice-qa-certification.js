import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_REPORT_RELATIVE_PATH = path.join(
  "..",
  "merxus-ai-backend",
  "reports",
  "spanish-voice-qa",
  "release-latest.json"
);

export async function writeBilingualVoiceQaCertification({
  appRoot,
  outputDir,
  sourceReportPath = process.env.MERXUS_BILINGUAL_QA_REPORT
}) {
  const resolvedOutputDir = path.resolve(appRoot, outputDir);
  const resolvedSourcePath = sourceReportPath
    ? path.resolve(sourceReportPath)
    : path.resolve(appRoot, DEFAULT_REPORT_RELATIVE_PATH);
  const generatedAt = new Date().toISOString();
  const report = await readVoiceQaReport(resolvedSourcePath);

  const bilingualVoiceQa = report
    ? {
        status: report.releaseReady ? "PASS" : "FAIL",
        sourceReport: resolvedSourcePath,
        generatedAt: report.generatedAt ?? null,
        releaseReady: report.releaseReady === true,
        bilingualProductionReady: report.bilingualProductionReady === true,
        mandatoryChecksPassed: report.mandatoryChecksPassed ?? null,
        mandatoryChecksTotal: report.mandatoryChecksTotal ?? null,
        highSeverityFailures: report.highSeverityFailures ?? [],
        warnings: report.warnings ?? [],
        checks: report.checks ?? [],
        recommendedAction: report.recommendedAction ?? null
      }
    : {
        status: "NOT_AVAILABLE",
        sourceReport: resolvedSourcePath,
        generatedAt: null,
        releaseReady: false,
        bilingualProductionReady: false,
        mandatoryChecksPassed: null,
        mandatoryChecksTotal: null,
        highSeverityFailures: [],
        warnings: ["No bilingual Voice QA release report was found for this certification run."],
        checks: [],
        recommendedAction: "Run npm run voice:qa:release in merxus-ai-backend before approving the bilingual human pilot."
      };

  const certification = {
    suite: "Merxus Unified Release Certification",
    generatedAt,
    bilingualVoiceQa,
    notes: [
      "This section reuses the backend bilingual Voice QA release report; it does not rerun or duplicate Voice QA checks.",
      "A PASS confirms automated bilingual QA only. Production bilingual mode remains disabled until human pilot approval."
    ]
  };

  await mkdir(resolvedOutputDir, { recursive: true });
  const jsonPath = path.join(resolvedOutputDir, "bilingual-voice-qa-certification.json");
  const markdownPath = path.join(resolvedOutputDir, "bilingual-voice-qa-certification.md");
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(certification, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, renderCertificationMarkdown(certification), "utf8")
  ]);

  return { certification, jsonPath, markdownPath };
}

async function readVoiceQaReport(reportPath) {
  try {
    return JSON.parse(await readFile(reportPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Unable to read bilingual Voice QA report at ${reportPath}: ${error.message}`);
  }
}

function renderCertificationMarkdown({ generatedAt, bilingualVoiceQa }) {
  const checks = bilingualVoiceQa.checks.length
    ? bilingualVoiceQa.checks.map((check) => `- ${check.name}: ${check.status}`).join("\n")
    : "- No backend bilingual Voice QA report was available.";

  return `# Merxus Bilingual Voice QA Certification\n\n`
    + `Generated: ${generatedAt}\n\n`
    + `- Status: ${bilingualVoiceQa.status}\n`
    + `- Source report: ${bilingualVoiceQa.sourceReport}\n`
    + `- Automated release ready: ${bilingualVoiceQa.releaseReady}\n`
    + `- Production bilingual ready: ${bilingualVoiceQa.bilingualProductionReady}\n`
    + `- Mandatory checks: ${bilingualVoiceQa.mandatoryChecksPassed ?? "n/a"}/${bilingualVoiceQa.mandatoryChecksTotal ?? "n/a"}\n\n`
    + `## Checks\n\n${checks}\n\n`
    + `## Recommendation\n\n${bilingualVoiceQa.recommendedAction}\n\n`
    + `This certification consumes the existing backend report and does not rerun Voice QA. A PASS does not enable production bilingual mode.\n`;
}
