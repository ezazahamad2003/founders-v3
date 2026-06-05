import { NextResponse } from "next/server";

const LATEST_RELEASE_URL =
  "https://api.github.com/repos/ezazahamad2003/scopic-legal/releases/latest";
const INSTALLER_ASSET_PATTERN = /^Scopic-Setup-.*\.exe$/i;

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function textResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET() {
  let releaseResponse: Response;

  try {
    releaseResponse = await fetch(LATEST_RELEASE_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "scopiclegal.com-product-download",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (error) {
    console.error("Unable to fetch latest Scopic release:", error);
    return textResponse("Unable to contact GitHub releases. Please try again later.", 500);
  }

  if (!releaseResponse.ok) {
    const status = releaseResponse.status === 404 ? 404 : 500;
    return textResponse(
      `Unable to fetch the latest Scopic release from GitHub. GitHub returned ${releaseResponse.status}.`,
      status,
    );
  }

  let release: unknown;

  try {
    release = await releaseResponse.json();
  } catch (error) {
    console.error("Unable to parse latest Scopic release response:", error);
    return textResponse("Unable to read the latest Scopic release metadata.", 500);
  }

  const assets = isRecord(release) && Array.isArray(release.assets) ? release.assets : [];
  const installer = assets.find((asset) => {
    if (!isRecord(asset) || typeof asset.name !== "string") {
      return false;
    }

    return INSTALLER_ASSET_PATTERN.test(asset.name);
  });

  if (!isRecord(installer)) {
    return textResponse(
      "No Windows installer asset was found on the latest Scopic release.",
      404,
    );
  }

  const downloadUrl = installer.browser_download_url;

  if (typeof downloadUrl !== "string" || downloadUrl.length === 0) {
    return textResponse("The Windows installer asset is missing a download URL.", 500);
  }

  const response = NextResponse.redirect(downloadUrl, { status: 302 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
