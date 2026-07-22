const graphBaseUrl = "https://graph.facebook.com/v23.0";

type GraphError = {
  error?: {
    message?: string;
  };
};

export type InstagramReelInsight = {
  mediaId: string;
  permalink: string;
  caption: string | null;
  publishedAt: string | null;
  metrics: Record<string, number>;
};

const MISSION_ONE_COLLAB_HANDLE = "missionone_hk";

export function hasMissionOneCollaborator(caption?: string | null) {
  if (!caption) {
    return false;
  }

  return new RegExp(`@${MISSION_ONE_COLLAB_HANDLE}\\b`, "i").test(caption);
}

export const instagramScopes = [
  "pages_show_list",
  "instagram_basic",
  "instagram_manage_insights",
];

export function getMissingInstagramConfig() {
  const missing: string[] = [];

  if (!process.env.META_APP_ID) {
    missing.push("META_APP_ID");
  }

  if (!process.env.META_APP_SECRET) {
    missing.push("META_APP_SECRET");
  }

  if (!getInstagramRedirectUri()) {
    missing.push("INSTAGRAM_REDIRECT_URI or NEXT_PUBLIC_APP_URL");
  }

  return missing;
}

export function hasInstagramConfig() {
  return getMissingInstagramConfig().length === 0;
}

export function getInstagramRedirectUri() {
  if (process.env.INSTAGRAM_REDIRECT_URI) {
    return process.env.INSTAGRAM_REDIRECT_URI;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/instagram/callback`;
  }

  return "";
}

function getMetaAppId() {
  return process.env.META_APP_ID ?? "";
}

function getMetaAppSecret() {
  return process.env.META_APP_SECRET ?? "";
}

async function graphFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  const payload = (await response.json()) as T & GraphError;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Instagram API request failed.");
  }

  return payload;
}

export function buildInstagramOAuthUrl(state: string) {
  const redirectUri = getInstagramRedirectUri();
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: instagramScopes.join(","),
  });

  return `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForLongLivedToken(code: string) {
  const redirectUri = getInstagramRedirectUri();

  const shortTokenParams = new URLSearchParams({
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    redirect_uri: redirectUri,
    code,
  });

  const shortTokenPayload = await graphFetch<{ access_token: string }>(
    `${graphBaseUrl}/oauth/access_token?${shortTokenParams.toString()}`,
  );

  const longTokenParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    fb_exchange_token: shortTokenPayload.access_token,
  });

  const longTokenPayload = await graphFetch<{ access_token: string; expires_in: number }>(
    `${graphBaseUrl}/oauth/access_token?${longTokenParams.toString()}`,
  );

  return {
    accessToken: longTokenPayload.access_token,
    expiresIn: longTokenPayload.expires_in,
  };
}

export async function fetchInstagramBusinessAccount(accessToken: string) {
  const params = new URLSearchParams({
    fields: "name,instagram_business_account{id,username}",
    access_token: accessToken,
  });

  const payload = await graphFetch<{
    data?: Array<{
      name?: string;
      instagram_business_account?: { id: string; username?: string };
    }>;
  }>(`${graphBaseUrl}/me/accounts?${params.toString()}`);

  const connected = (payload.data ?? []).find((item) => item.instagram_business_account?.id);

  if (!connected?.instagram_business_account?.id) {
    throw new Error("No Instagram Professional account found. Please link your Instagram account to a Facebook Page.");
  }

  return {
    instagramUserId: connected.instagram_business_account.id,
    instagramUsername: connected.instagram_business_account.username ?? null,
    facebookPageName: connected.name ?? null,
  };
}

export async function fetchRecentReelsInsights(instagramUserId: string, accessToken: string): Promise<InstagramReelInsight[]> {
  const mediaParams = new URLSearchParams({
    fields: "id,caption,media_type,media_product_type,permalink,timestamp",
    limit: "25",
    access_token: accessToken,
  });

  const mediaPayload = await graphFetch<{
    data?: Array<{
      id: string;
      caption?: string;
      media_type?: string;
      media_product_type?: string;
      permalink?: string;
      timestamp?: string;
    }>;
  }>(`${graphBaseUrl}/${instagramUserId}/media?${mediaParams.toString()}`);

  const reels = (mediaPayload.data ?? []).filter(
    (item) => item.id && item.media_type === "VIDEO" && item.media_product_type === "REELS" && item.permalink,
  );

  const metrics = "plays,reach,likes,comments,shares,saved,total_interactions";

  return Promise.all(
    reels.map(async (reel) => {
      const insightParams = new URLSearchParams({
        metric: metrics,
        access_token: accessToken,
      });

      const insightsPayload = await graphFetch<{
        data?: Array<{ name: string; values?: Array<{ value: number }> }>;
      }>(`${graphBaseUrl}/${reel.id}/insights?${insightParams.toString()}`);

      const parsedMetrics = (insightsPayload.data ?? []).reduce<Record<string, number>>((acc, metric) => {
        const value = metric.values?.[0]?.value;

        if (typeof value === "number") {
          acc[metric.name] = value;
        }

        return acc;
      }, {});

      return {
        mediaId: reel.id,
        permalink: reel.permalink as string,
        caption: reel.caption ?? null,
        publishedAt: reel.timestamp ?? null,
        metrics: parsedMetrics,
      };
    }),
  );
}

export function normalizeInstagramPermalink(url: string) {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    parsed.search = "";

    let pathname = parsed.pathname.replace(/\/+$/, "");
    if (!pathname.startsWith("/")) {
      pathname = `/${pathname}`;
    }

    parsed.pathname = pathname;
    return parsed.toString();
  } catch {
    return url.trim();
  }
}
