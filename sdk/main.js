import "dotenv/config";
import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI();

// Zod schema for the expected structured output
const EvidenceSchema = z.object({
  location: z.string(),
  excerpt: z.string().optional(),
});

const RiskItemSchema = z.object({
  id: z.string(),
  summary: z.string(),
  severity: z.enum(["low", "medium", "high", "critical", "unknown"]),
  likelihood: z.enum([
    "rare",
    "unlikely",
    "possible",
    "likely",
    "almost_certain",
    "unknown",
  ]),
  impact: z.string().optional(),
  recommended_mitigation: z.string().optional(),
  evidence: z.array(EvidenceSchema).optional(),
});

const OutputSchema = z.object({
  document_summary: z.string().optional(),
  risks: z.array(RiskItemSchema),
});

async function init() {
  const prompt = `Extract the risks from the following documents and return only raw JSON. Do NOT use markdown, code fences, backticks, or any additional explanatory text — output must be plain JSON only.

Required output fields:
- document_summary: string (one-sentence summary)
- risks: array of objects with fields: id, summary, severity (low|medium|high|critical|unknown), likelihood (rare|unlikely|possible|likely|almost_certain|unknown), impact, recommended_mitigation, and evidence (array of { location, excerpt }).`;

  // Sample documents for testing — replace or load dynamically in production
  const documents = `Document ID: DOC-001
Title: Payment Gateway Integration for Mobile App
Author: Product Team
Date: 2026-07-01

Summary:
We integrated third-party payment provider FastPay to process card transactions in the mobile app. Integration completed by engineering on 2026-06-10 and rolled out to 30% of users.

Details / Observations:
- The integration uses FastPay SDK v1.2.0; current FastPay latest is v1.4. There is no update plan documented.
- API keys are stored in application config and synced to CI without encryption. CI logs show masked keys only for some runs.
- PCI scope was assumed minimal; there is no completed PCI self-assessment on file.
- Error logs included full request payloads in staging logs: "payload: {cardNumber: '...' , expiry: '...' }" (staging server log excerpt).
- Retry policy: the client retries failed transactions up to 5 times with exponential backoff; no circuit breaker, leading to repeated downstream load.
- SLA with FastPay: 99.5% uptime, but contract lacks explicit incident escalation timelines or financial penalties.

Business Impact:
Potential for cardholder data exposure, regulatory non-compliance, and revenue disruption if FastPay outages or SDK vulnerabilities occur.

---

Document ID: DOC-002
Title: Internal Infrastructure & Backup Notes
Author: Ops Team
Date: 2026-06-20

Summary:
Core services run in a single region (us-east-1). Backups are scheduled nightly to a single S3 bucket. IAM roles have broad permissions for automation scripts.

Details / Observations:
- Backups: Nightly snapshot to s3://company-backups. Bucket is not configured with enforced encryption; server-side encryption not required by policy.
- Retention: Snapshots retained for 14 days only; no off-site archival process.
 - IAM: Automation role 'deploy-bot' has 'AdministratorAccess' attached for simplicity; role used by CI runners.
- Network: Several internal admin ports (SSH, RDP) are accessible via a VPN that uses a shared account; MFA not enforced for the shared account.
- Monitoring: Alerting threshold for disk usage set at 95% with no automated remediation; several non-critical systems hit 90-94% for weeks.
- Third-party vendor: Managed DB provider performs maintenance windows without advance notifications; no runbook exists for failover.

Business Impact:
Single-region deployment and weak backup/encryption controls could lead to extended downtime and data loss. Over-privileged IAM and shared admin access raise the risk of unauthorized changes and slow incident recovery.
`;

  const filledPrompt = `${prompt}\nDOCUMENTS:\n${documents}`;

  const result = await client.responses.create({
    model: "gpt-4.1-mini",
    input: filledPrompt,
  });

  const raw = result.output_text;
  if (!raw) {
    console.error("No output_text from model", result);
    return;
  }

  // Clean common markdown/code-fence wrappers so we can parse JSON
  let jsonText = raw.trim();
  if (jsonText.startsWith("```")) {
    const lines = jsonText.split(/\r?\n/);
    // remove the opening fence
    lines.shift();
    // if last line is a closing fence, remove it
    if (lines[lines.length - 1].trim().startsWith("```")) lines.pop();
    jsonText = lines.join("\n").trim();
  }

  // Fallback: extract the first {...} block if extra commentary present
  if (!jsonText.trim().startsWith("{")) {
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start !== -1 && end !== -1)
      jsonText = jsonText.substring(start, end + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error("Model output is not valid JSON:", err.message);
    console.error("Raw output:\n", raw);
    console.error("Sanitized JSON attempt:\n", jsonText);
    return;
  }

  try {
    const validated = OutputSchema.parse(parsed);
    console.log(
      "Validated structured output:",
      JSON.stringify(validated, null, 2),
    );
  } catch (err) {
    console.error("Output did not match schema:\n", err.errors ?? err);
    console.error("Parsed JSON:\n", JSON.stringify(parsed, null, 2));
  }
}

init();
