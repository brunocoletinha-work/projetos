export interface QueryParameter {
  name: string;
  parameterType: { type: string };
  parameterValue: { value: string };
}

export interface BigQueryRow {
  f: { v: string | null }[];
}

export interface BigQueryResult {
  schema: { fields: { name: string; type: string }[] };
  rows?: BigQueryRow[];
  jobComplete: boolean;
}

async function getAccessToken(serviceAccount: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  const pemKey = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemKey), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${encodedSignature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to get access token: ${err}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

export async function runQuery(
  sql: string,
  parameters: QueryParameter[] = [],
  timeoutMs = 30000
): Promise<Record<string, unknown>[]> {
  const raw = Deno.env.get("BIGQUERY_SERVICE_ACCOUNT");
  if (!raw) throw new Error("BIGQUERY_SERVICE_ACCOUNT env var not set");

  const serviceAccount = JSON.parse(raw);
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("BIGQUERY_SERVICE_ACCOUNT is missing client_email or private_key");
  }
  const token = await getAccessToken(serviceAccount);

  const projectId = serviceAccount.project_id ?? "dw-onfly-prd";

  const body: Record<string, unknown> = {
    query: sql,
    useLegacySql: false,
    timeoutMs,
  };

  if (parameters.length > 0) {
    body.queryParameters = parameters;
    body.parameterMode = "NAMED";
  }

  const res = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BigQuery query failed: ${err}`);
  }

  const result: BigQueryResult = await res.json();

  if (!result.jobComplete) {
    throw new Error("BigQuery job did not complete within timeout");
  }

  if (!result.rows) return [];

  const fields = result.schema.fields.map((f) => f.name);
  return result.rows.map((row) =>
    Object.fromEntries(fields.map((name, i) => [name, row.f[i]?.v ?? null]))
  );
}

export function intParam(name: string, value: number): QueryParameter {
  return {
    name,
    parameterType: { type: "INT64" },
    parameterValue: { value: String(value) },
  };
}

export function floatParam(name: string, value: number): QueryParameter {
  return {
    name,
    parameterType: { type: "FLOAT64" },
    parameterValue: { value: String(value) },
  };
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
