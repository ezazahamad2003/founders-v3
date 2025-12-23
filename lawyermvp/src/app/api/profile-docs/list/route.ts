import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ProfileDocItem = {
  bucket: string;
  path: string;
  name: string;
  size: number;
  updated_at: string | null;
};

function uniqueNonEmpty(values: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const trimmed = (v ?? "").trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function getProfileBucketCandidates(): string[] {
  return uniqueNonEmpty([
    process.env.NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET,
    process.env.SUPABASE_PROFILE_BUCKET,
    "ProfileDrawer",
    "profiledrawer",
  ]);
}

async function listFolder(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  folder: string,
): Promise<ProfileDocItem[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error || !data) {
    // Most common failure is wrong bucket name; treat as empty.
    return [];
  }

  return (data ?? [])
    // Supabase "folders" often show up as entries without metadata/size.
    .filter((entry) => {
      if (!entry.name) return false;
      if (entry.name.endsWith("/")) return false;
      // Prevent folder names from ever being treated as files.
      if (entry.name === "profile-library") return false;
      const size = (entry as any).metadata?.size;
      return typeof size === "number" && size > 0;
    })
    .map((entry) => ({
      bucket,
      path: `${folder}/${entry.name}`,
      name: entry.name,
      size: entry.metadata?.size ?? 0,
      updated_at: entry.updated_at ?? null,
    }));
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = (await request.json()) as { userId?: string };

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase configuration missing. Ensure SUPABASE_SERVICE_ROLE_KEY is set.");
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const buckets = getProfileBucketCandidates();
    // Primary: `userId/profile-library` (matches the app’s ProfileDrawer uploader).
    // Fallback: `userId` for older buckets/layouts (but we aggressively filter out folder entries).
    const prefixes = uniqueNonEmpty([`${userId}/profile-library`, userId]);

    const all: ProfileDocItem[] = [];
    for (const bucket of buckets) {
      for (const prefix of prefixes) {
        const docs = await listFolder(supabase, bucket, prefix);
        all.push(...docs);
      }
    }

    // Deduplicate by (bucket,path)
    const deduped: ProfileDocItem[] = [];
    const seen = new Set<string>();
    for (const doc of all) {
      const key = `${doc.bucket}:${doc.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(doc);
    }

    // Sort newest first when timestamps exist
    deduped.sort((a, b) => {
      const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bt - at;
    });

    return NextResponse.json({ documents: deduped });
  } catch (error) {
    console.error("Unexpected error listing profile documents:", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

