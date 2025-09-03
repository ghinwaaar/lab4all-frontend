// API client aligned to backend contract (create + fetch)
// Fixed URL joining so relative bases like "/api" are preserved.

export type AnnouncementFile = {
  role: "body" | "attachment";
  filename: string;
  url: string;
  expiresAt?: string;
};

export type Announcement = {
  announcementId: string;
  createdAt: string;
  kind: "teacher" | "system";
  authorId: string;
  pinned: boolean;
  files: AnnouncementFile[];
};

type FetchWire = {
  announcements: Array<{
    announcementId: string;
    createdAt: string;
    authorId: string;
    kind: string;
    pinned: boolean;
    files: {
      role: "body" | "attachment";
      filename: string;
      url: string;
      expiresAt?: string;
    }[];
  }>;
  nextCursor: string | null;
};

export type FetchResp = {
  items: Announcement[];
  nextToken: string | null;
};

export type CreateFileMeta = {
  role: "body" | "attachment";
  filename: string;
  contentType: string;
};

export type CreateResp = {
  announcementId: string;
  createdAt: string;
  uploadUrls: Array<{ role: "body" | "attachment"; filename: string; url: string }>;
};

// ──────────────────────────────────────────────────────────────────────────────
// IMPORTANT: keep "/api" when base is relative. Previously this function
// stripped it, yielding 404s (and everything unraveled from there).
// ──────────────────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  // Normalize: no trailing slash on base, ensure leading slash on path
  const base = API_BASE.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;

  // If base is absolute (http/https), join there; otherwise join against window origin
  const absolute = /^https?:\/\//i.test(base)
    ? new URL(`${base}${p}`).toString()
    : new URL(`${base}${p}`, window.location.origin).toString();

  if (params && Object.keys(params).length) {
    const u = new URL(absolute);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    }
    return u.toString();
  }
  return absolute;
}

async function getJSON<T>(
  path: string,
  token: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const res = await fetch(buildUrl(path, params), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    mode: "cors",
  });

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // leave parsed as null; we’ll still throw with raw text if needed
  }

  if (!res.ok) {
    const err: any = new Error(parsed?.error || parsed?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.raw = parsed ?? text;
    throw err;
  }
  return parsed as T;
}

async function postJSON<T>(path: string, token: string, body: any): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    mode: "cors",
  });

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // parsed stays null
  }

  if (!res.ok) {
    const err: any = new Error(parsed?.error || parsed?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.raw = parsed ?? text;
    throw err;
  }
  return parsed as T;
}

export const announcementsAPI = {
  /** GET /announcements/fetch?classID&k&cursor */
  async fetchLatest(token: string, classId: string, k = 10, cursor?: string): Promise<FetchResp> {
    const wire = await getJSON<FetchWire>("/announcements/fetch", token, {
      classID: classId, // capital D per backend
      k,
      ...(cursor ? { cursor } : {}),
    });

    const items: Announcement[] = (wire.announcements || []).map((a) => ({
      announcementId: a.announcementId,
      createdAt: a.createdAt,
      authorId: a.authorId,
      kind: (a.kind as "teacher" | "system") ?? "teacher",
      pinned: !!a.pinned,
      files: a.files.map((f) => ({
        role: f.role,
        filename: f.filename,
        url: f.url,
        expiresAt: f.expiresAt,
      })),
    }));

    return { items, nextToken: wire.nextCursor ?? null };
  },

  /** POST /announcements/create — body must match AnnouncementCreateSchema */
  create(
    token: string,
    body: {
      classroomId: string;
      teacherId: string; // required by schema
      filesMeta: CreateFileMeta[]; // exactly one role=body
    }
  ): Promise<CreateResp> {
    return postJSON<CreateResp>("/announcements/create", token, body);
  },
};
