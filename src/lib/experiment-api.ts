// src/lib/experiment-api.ts

/** Backend base URL (API Gateway stage) */
const API_BASE = "https://4wqwppx8z6.execute-api.us-east-1.amazonaws.com/dev";

/* ───────────────────────────── Types ───────────────────────────── */

export type CreateExperimentBody = {
  classId: string;
  title: string;
  prototypeId: string;
};
export type CreateExperimentResponse = { experimentId: string };

export type PresignLogBody = { classId: string; experimentId: string };
export type PresignLogResponse = { uploadUrl: string };

export type FinishExperimentBody = { classId: string; experimentId: string };
export type FinishExperimentResponse = { status?: string; message?: string; [k: string]: unknown };

export type CurrentExperiment = {
  classId: string;
  experimentId: string;
  createdAt: string; // ISO timestamp
};

/** Matches your AuthProvider's persisted shape. Adjust if your `AuthTokens` differs. */
export type AuthTokens = {
  IdToken?: string;      // Cognito ID token (preferred)
  idToken?: string;      // same, different casing
  AccessToken?: string;  // Cognito access token (used as "cursor" for list's first call)
  accessToken?: string;
  RefreshToken?: string;
  refreshToken?: string;
  // anything else...
};

/** List API shapes */
export type ExperimentListItem = {
  hiddenByTeacher?: boolean;
  pending: boolean;
  createdAt: string;   // ISO
  classId: string;
  experimentId: string;
  title?: string;
  [k: string]: unknown; // passthrough for any extra fields
};

export type ListExperimentsResponse = {
  experiments: ExperimentListItem[];
  nextCursor: string | null;
};

// ↓ Add near the other types
export type GetExperimentInfoBody = {
  classId: string;
  experimentId: string;
};
// Toggle Hide
export type ToggleHideBody = {
  classId: string;
  experimentId: string;
};

export type ToggleHideResponse = {
  success: boolean;
  [k: string]: unknown;
};


export type GetExperimentInfoResponse = {
  url: string; // presigned S3 URL to info.txt
  [k: string]: unknown; // backend may add extra fields later
};

// Delete Experiment
export type DeleteExperimentBody = {
  classId: string;
  experimentId: string;
};

export type DeleteExperimentResponse = {
  success: boolean;
  message?: string;
  [k: string]: unknown;
};

/* ───────────────────── Local Storage Keys/Helpers ───────────────────── */

const LOCAL_LIST_KEY = "experimentIds";
const LOCAL_CURRENT_KEY = "experiment:current";
const NEXT_CURSOR_KEY = "nextCursorExperiments";

/** Return the locally tracked experiment IDs (max 3 as per UI rule). */
function getStoredExperimentIds(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_LIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function setStoredExperimentIds(ids: string[]) {
  localStorage.setItem(LOCAL_LIST_KEY, JSON.stringify(ids));
}

function setCurrentExperiment(cur: CurrentExperiment) {
  localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(cur));
}

function getCurrentExperiment(): CurrentExperiment | null {
  try {
    const raw = localStorage.getItem(LOCAL_CURRENT_KEY);
    return raw ? (JSON.parse(raw) as CurrentExperiment) : null;
  } catch {
    return null;
  }
}

function clearCurrentExperiment() {
  localStorage.removeItem(LOCAL_CURRENT_KEY);
}

function clearAllLocal() {
  localStorage.removeItem(LOCAL_LIST_KEY);
  localStorage.removeItem(LOCAL_CURRENT_KEY);
}

/** nextCursor helpers */
function getSavedNextCursor(): string | null {
  try {
    const v = localStorage.getItem(NEXT_CURSOR_KEY);
    return v && v !== "null" && v !== "undefined" ? v : null;
  } catch {
    return null;
  }
}
function setSavedNextCursor(cursor: string | null) {
  if (cursor) localStorage.setItem(NEXT_CURSOR_KEY, cursor);
  else localStorage.removeItem(NEXT_CURSOR_KEY);
}

/* ─────────────────────── Auth Token Discovery ─────────────────────── */

/** Ensure a JWT is a Cognito ID token (token_use === "id"). Throws if invalid. */
export function ensureIdToken(raw: string | null | undefined): string {
  if (!raw) throw new Error("No auth token found");
  const token = String(raw).trim();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload?.token_use !== "id") {
      throw new Error(`Expected Cognito idToken, got ${payload?.token_use || "unknown"}`);
    }
    if (payload?.exp && Date.now() >= payload.exp * 1000) {
      throw new Error("ID token expired");
    }
  } catch (e: any) {
    throw new Error(`Invalid/undecodable JWT: ${e?.message || e}`);
  }
  return token;
}

/** Primary token source: your AuthProvider (`auth_tokens`). Falls back to legacy keys. */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  // 0) Your canonical source from AuthProvider
  try {
    const saved = localStorage.getItem("auth_tokens");
    if (saved && saved !== "undefined" && saved !== "null") {
      const t = JSON.parse(saved) as AuthTokens;
      // prefer IdToken/idToken fields
      if (t?.IdToken) return t.IdToken.trim();
      if (t?.idToken) return t.idToken.trim();
      // DO NOT auto-pick AccessToken for API GW Cognito authorizer in Authorization
    }
  } catch {
    // ignore and fall through
  }

  // 1) Simple/legacy keys you might have set elsewhere
  const simpleKeys = ["IdToken", "idToken", "AccessToken", "accessToken", "token", "authToken"];
  for (const k of simpleKeys) {
    const v = localStorage.getItem(k);
    if (!v || v === "undefined" || v === "null") continue;
    try {
      const parsed = JSON.parse(v);
      const candidate =
        parsed?.IdToken ||
        parsed?.idToken ||
        parsed?.token ||
        parsed?.AccessToken ||
        parsed?.accessToken ||
        v;
      return String(candidate).trim();
    } catch {
      return v.trim();
    }
  }

  // 2) Cognito Hosted UI storage pattern: ends with .idToken (prefer) then .accessToken
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || "";
    if (key.endsWith(".idToken")) {
      const v = localStorage.getItem(key);
      if (v) return v.trim();
    }
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || "";
    if (key.endsWith(".accessToken")) {
      const v = localStorage.getItem(key);
      if (v) return v.trim();
    }
  }

  return null;
}

/** Convenience: get a verified ID token or throw a crisp error. */
export function requireIdToken(): string {
  return ensureIdToken(getAuthToken());
}

/** AccessToken discovery (used as "cursor" seed for list) */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  // Prefer from your AuthProvider bundle
  try {
    const saved = localStorage.getItem("auth_tokens");
    if (saved && saved !== "undefined" && saved !== "null") {
      const t = JSON.parse(saved) as AuthTokens;
      if (t?.AccessToken) return t.AccessToken.trim();
      if (t?.accessToken) return t.accessToken.trim();
    }
  } catch {}

  // Fallback simple keys
  const keys = ["AccessToken", "accessToken", "token"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (!v || v === "undefined" || v === "null") continue;
    try {
      const parsed = JSON.parse(v);
      const candidate = parsed?.AccessToken || parsed?.accessToken || parsed?.token || v;
      return String(candidate).trim();
    } catch {
      return v.trim();
    }
  }

  // Hosted UI pattern
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || "";
    if (key.endsWith(".accessToken")) {
      const v = localStorage.getItem(key);
      if (v) return v.trim();
    }
  }

  return null;
}

/* ─────────────────────────── Fetch Wrapper ─────────────────────────── */

async function req<T>(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.headers || {}),
    },
    mode: "cors",
    cache: opts.method === "GET" ? "no-store" : "no-cache",
  });

  const text = await res.text();

  if (!res.ok) {
    try {
      const json = text ? JSON.parse(text) : null;
      const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
      throw new Error(msg);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  return (text ? JSON.parse(text) : null) as T;
}

/* ─────────────────────────── Public API ─────────────────────────── */

export const experimentAPI = {
  async create(token: string, body: CreateExperimentBody) {
    // refuse non-ID tokens to avoid noisy 401s
    const idToken = ensureIdToken(token);

    const existing = getStoredExperimentIds();
    if (existing.length >= 3) {
      throw new Error("You already have 3 experiments. Delete one before creating a new one.");
    }

    const data = await req<CreateExperimentResponse>("/experiments/create", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${idToken}` },
    });

    const id = data.experimentId;
    const updated = Array.from(new Set([...existing, id]));
    setStoredExperimentIds(updated.slice(0, 3));

    setCurrentExperiment({
      classId: body.classId,
      experimentId: id,
      createdAt: new Date().toISOString(),
    });

    return data;
  },

  async presignLog(token: string, body: PresignLogBody) {
    const idToken = ensureIdToken(token);
    const data = await req<PresignLogResponse>("/experiments/log", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!data?.uploadUrl) throw new Error("No uploadUrl in presign response");
    return data;
  },

  async finish(token: string, body: FinishExperimentBody) {
    const idToken = ensureIdToken(token);
    return await req<FinishExperimentResponse>("/experiments/finish", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${idToken}` },
    });
  },
  // inside export const experimentAPI = { ... }
async info(token: string, body: GetExperimentInfoBody) {
  const idToken = ensureIdToken(token);
  return await req<GetExperimentInfoResponse>("/experiments/info", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${idToken}` },
  });
},
  /** Toggle hiddenByOwner for an experiment */
  async toggleHide(token: string, body: ToggleHideBody) {
    const idToken = ensureIdToken(token);
    return await req<ToggleHideResponse>("/experiments/togglehide", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${idToken}` },
    });
  },


  /**
   * List experiments for a user.
   * - GET /experiments/list?classId=<id>&cursor=<cursor>
   * - `cursor`:
   *    • If provided, use it.
   *    • Else use saved `nextCursorExperiments`.
   *    • Else seed with the user’s AccessToken (from AuthProvider or fallbacks).
   * - Saves `nextCursor` into localStorage as `nextCursorExperiments`.
   * - Also filters results client-side by `classId` for safety.
   */
   async list(token: string, params: { classId: string; cursor?: string | null }) {
    const idToken = ensureIdToken(token);

    // Determine cursor: use the one passed in, else the saved one, else none.
    const saved = getSavedNextCursor();
    const cur = (params.cursor ?? null) || (saved ?? null);

    const qs = new URLSearchParams();
    qs.set("classId", params.classId);
    if (cur) qs.set("cursor", cur); // ← only add if we truly have one

    const data = await req<ListExperimentsResponse>(`/experiments/list?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    // Persist nextCursor for subsequent calls
    setSavedNextCursor(data?.nextCursor ?? null);

    // Filter by classId defensively
    const filtered = (data?.experiments ?? []).filter((e) => e.classId === params.classId);

    return {
      experiments: filtered,
      nextCursor: data?.nextCursor ?? null,
    } as ListExperimentsResponse;
  },
    /** Delete an experiment (requires IdToken) */
  // src/lib/experiment-api.ts
async delete(token: string, body: DeleteExperimentBody) {
  const idToken = ensureIdToken(token);
  return await req<DeleteExperimentResponse>("/experiments/delete", {
    method: "DELETE",
    body: JSON.stringify(body), // DELETE can have a body; API GW proxy passes it to Lambda
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
  });
},
  setCurrent: setCurrentExperiment,
  getCurrent: getCurrentExperiment,
  clearCurrent: clearCurrentExperiment,
  clearAllLocal,
};
