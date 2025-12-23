import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function getAllowedProfileBuckets(): string[] {
  return uniqueNonEmpty([
    process.env.NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET,
    process.env.SUPABASE_PROFILE_BUCKET,
    "ProfileDrawer",
    "profiledrawer",
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const { bucket, path } = (await request.json()) as { bucket?: string; path?: string };

    if (!bucket || typeof bucket !== "string") {
      return NextResponse.json({ error: "Missing bucket" }, { status: 400 });
    }
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    // Expected shape: <userId>/profile-library/<filename> (at least 3 segments)
    // Prevent attempts to sign folder paths (they will always fail as "Object not found").
    if (path.split("/").filter(Boolean).length < 3) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const allowedBuckets = getAllowedProfileBuckets();
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json({ error: "Bucket not allowed" }, { status: 400 });
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

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      console.error("Supabase failed to create signed URL:", { bucket, path, error });
      const rawStatus = (error as any)?.status;
      const rawStatusCode = (error as any)?.statusCode;
      const status = rawStatus ? Number(rawStatus) : undefined;
      const statusCode =
        typeof rawStatusCode === "string" ? Number(rawStatusCode) : typeof rawStatusCode === "number" ? rawStatusCode : undefined;
      const httpStatus = statusCode === 404 ? 404 : status === 404 ? 404 : 500;
      return NextResponse.json({ error: "Failed to create signed URL" }, { status: httpStatus });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error("Unexpected error generating signed URL:", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

