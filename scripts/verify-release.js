import config from "../release-test.config.js";
import { writeBilingualVoiceQaCertification } from "./write-bilingual-voice-qa-certification.js";

const { runReleaseVerification } = await loadTestingPackage();

runReleaseVerification(config)
  .then(async () => {
    const result = await writeBilingualVoiceQaCertification({
      appRoot: config.appRoot,
      outputDir: config.reporting.outputDir
    });
    console.log(`Bilingual Voice QA certification: ${result.certification.bilingualVoiceQa.status}`);
    console.log(`Bilingual Voice QA report: ${result.markdownPath}`);
  })
  .catch((error) => {
  console.error(error);
  process.exit(1);
});

async function loadTestingPackage() {
  try {
    return await import("@workside/testing");
  } catch {
    return import("../../../packages/workside-testing/index.js");
  }
}
