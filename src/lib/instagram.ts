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

export class InstagramPrivateAccountError extends Error {
  constructor(message = "Instagram account is private. Please switch to a public account to sync reel metrics.") {
    super(message);
    this.name = "InstagramPrivateAccountError";
  }
}

export type InstagramAccountProfile = {
  username: string | null;
  accountType: string | null;
  isPrivate: boolean | null;
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
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_insights",
];

function getInstagramFallbackPageId() {
  return process.env.INSTAGRAM_FALLBACK_PAGE_ID?.trim() ?? "";
}

type FacebookPageInstagramBinding = {
  id: string;
  username?: string;
};

type FacebookPageWithInstagram = {
  id?: string;
  name?: string;
  instagram_business_account?: FacebookPageInstagramBinding;
  connected_instagram_account?: FacebookPageInstagramBinding;
};

type FacebookDebugTokenPayload = {
  data?: {
    app_id?: string;
    application?: string;
    is_valid?: boolean;
    scopes?: string[];
    user_id?: string;
    type?: string;
  };
};

type FacebookPermissionStatus = {
  permission?: string;
  status?: string;
};

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

async function debugUserToken(accessToken: string) {
  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();

  if (!appId || !appSecret) {
    return null;
  }

  const params = new URLSearchParams({
    input_token: accessToken,
    access_token: `${appId}|${appSecret}`,
  });

  const payload = await graphFetch<FacebookDebugTokenPayload>(`${graphBaseUrl}/debug_token?${params.toString()}`);

  return payload.data ?? null;
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
    auth_type: "rerequest",
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
    shortAccessToken: shortTokenPayload.access_token,
  };
}

export async function fetchInstagramBusinessAccount(accessToken: string) {
  const viewer = await graphFetch<{ id?: string; name?: string }>(
    `${graphBaseUrl}/me?${new URLSearchParams({ fields: "id,name", access_token: accessToken }).toString()}`,
  );

  const params = new URLSearchParams({
    // Some pages expose instagram_business_account while others expose connected_instagram_account.
    fields: "name,instagram_business_account{id,username},connected_instagram_account{id,username}",
    access_token: accessToken,
  });

  const payload = await graphFetch<{
    data?: FacebookPageWithInstagram[];
  }>(`${graphBaseUrl}/me/accounts?${params.toString()}`);

  let pages = payload.data ?? [];

  // Fallback: some business setups expose page assets more reliably via /me?fields=accounts{...}
  // with the same user token even when /me/accounts returns an empty array.
  if (pages.length === 0) {
    const meWithAccounts = await graphFetch<{
      accounts?: {
        data?: FacebookPageWithInstagram[];
      };
    }>(
      `${graphBaseUrl}/me?${new URLSearchParams({
        fields: "accounts{name,instagram_business_account{id,username},connected_instagram_account{id,username}}",
        access_token: accessToken,
      }).toString()}`,
    );

    pages = meWithAccounts.accounts?.data ?? [];
  }

  if (pages.length === 0) {
    const fallbackPageId = getInstagramFallbackPageId();
    let fallbackPageDiagnostic = "fallback_page=not-configured";

    if (fallbackPageId) {
      try {
        const fallbackPage = await graphFetch<FacebookPageWithInstagram>(
          `${graphBaseUrl}/${fallbackPageId}?${new URLSearchParams({
            fields: "id,name,instagram_business_account{id,username},connected_instagram_account{id,username}",
            access_token: accessToken,
          }).toString()}`,
        );

        const fallbackInstagram = fallbackPage.instagram_business_account ?? fallbackPage.connected_instagram_account;

        if (fallbackInstagram?.id) {
          return {
            instagramUserId: fallbackInstagram.id,
            instagramUsername: fallbackInstagram.username ?? null,
            facebookPageName: fallbackPage.name ?? null,
          };
        }

        fallbackPageDiagnostic = `fallback_page=${fallbackPageId},result=no-linked-instagram`;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown";
        fallbackPageDiagnostic = `fallback_page=${fallbackPageId},error=${message}`;
      }
    }

    const viewerName = viewer.name?.trim() || "unknown";
    const viewerId = viewer.id?.trim() || "unknown";

    const permissionsPayload = await graphFetch<{ data?: FacebookPermissionStatus[] }>(
      `${graphBaseUrl}/me/permissions?${new URLSearchParams({ access_token: accessToken }).toString()}`,
    );

    const permissions = permissionsPayload.data ?? [];
    const grantedPermissions = permissions
      .filter((item) => item.status === "granted" && typeof item.permission === "string")
      .map((item) => item.permission as string);
    const nonGrantedPermissions = permissions
      .filter((item) => item.status !== "granted" && typeof item.permission === "string")
      .map((item) => `${item.permission}:${item.status ?? "unknown"}`);

    const requiredPagePermissions = ["pages_show_list", "pages_read_engagement"];
    const missingRequiredPagePermissions = requiredPagePermissions.filter(
      (permission) => !grantedPermissions.includes(permission),
    );

    const permissionsSummary = [
      grantedPermissions.length > 0 ? `granted=[${grantedPermissions.join(",")}]` : "granted=[]",
      nonGrantedPermissions.length > 0
        ? `non_granted=[${nonGrantedPermissions.join(",")}]`
        : "non_granted=[]",
      missingRequiredPagePermissions.length > 0
        ? `missing_page_scopes=[${missingRequiredPagePermissions.join(",")}]`
        : "missing_page_scopes=[]",
    ].join("; ");

    let tokenDebugSummary = "token_debug=unavailable";
    try {
      const tokenDebug = await debugUserToken(accessToken);
      if (tokenDebug) {
        const debugAppId = tokenDebug.app_id?.trim() || "unknown";
        const debugApplication = tokenDebug.application?.trim() || "unknown";
        const debugType = tokenDebug.type?.trim() || "unknown";
        const debugIsValid = tokenDebug.is_valid === true ? "true" : "false";
        const debugUserId = tokenDebug.user_id?.trim() || "unknown";
        const debugScopes = Array.isArray(tokenDebug.scopes) && tokenDebug.scopes.length > 0
          ? tokenDebug.scopes.join(",")
          : "";

        tokenDebugSummary = `token_debug={app_id:${debugAppId},application:${debugApplication},type:${debugType},is_valid:${debugIsValid},user_id:${debugUserId},scopes:[${debugScopes}]}`;
      }
    } catch {
      tokenDebugSummary = "token_debug=unavailable";
    }

    throw new Error(
      `No Facebook Pages were returned by Meta OAuth (authorized user: ${viewerName}, id: ${viewerId}). ${permissionsSummary}; ${tokenDebugSummary}; ${fallbackPageDiagnostic}. Reconnect with the personal Facebook account that has Full control for the target Page, and approve page access (pages_show_list/pages_read_engagement).`,
    );
  }

  const connected = pages.find(
    (item) => item.instagram_business_account?.id || item.connected_instagram_account?.id,
  );

  const instagramAccount = connected?.instagram_business_account ?? connected?.connected_instagram_account;

  if (!instagramAccount?.id) {
    const availablePages = pages
      .map((item) => item.name?.trim())
      .filter((item): item is string => Boolean(item));

    throw new Error(
      availablePages.length > 0
        ? `No Instagram Professional account is linked to the selected Facebook Pages (${availablePages.join(", ")}). Link missionone_hk to one of these Pages and reconnect.`
        : "No Instagram Professional account found for API sync. Link missionone_hk to a Facebook Page and reconnect.",
    );
  }

  return {
    instagramUserId: instagramAccount.id,
    instagramUsername: instagramAccount.username ?? null,
    facebookPageName: connected?.name ?? null,
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

export async function fetchInstagramAccountProfile(instagramUserId: string, accessToken: string): Promise<InstagramAccountProfile> {
  let payload: {
    username?: string;
    account_type?: string;
    is_private?: boolean;
  };

  try {
    const params = new URLSearchParams({
      fields: "id,username,account_type,is_private",
      access_token: accessToken,
    });

    payload = await graphFetch<{
      username?: string;
      account_type?: string;
      is_private?: boolean;
    }>(`${graphBaseUrl}/${instagramUserId}?${params.toString()}`);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.toLowerCase().includes("is_private")) {
      throw error;
    }

    const fallbackParams = new URLSearchParams({
      fields: "id,username,account_type",
      access_token: accessToken,
    });

    payload = await graphFetch<{
      username?: string;
      account_type?: string;
    }>(`${graphBaseUrl}/${instagramUserId}?${fallbackParams.toString()}`);
  }

  return {
    username: payload.username ?? null,
    accountType: payload.account_type ?? null,
    isPrivate: typeof payload.is_private === "boolean" ? payload.is_private : null,
  };
}

export async function assertInstagramAccountIsPublic(instagramUserId: string, accessToken: string) {
  const profile = await fetchInstagramAccountProfile(instagramUserId, accessToken);
  if (profile.isPrivate === true) {
    throw new InstagramPrivateAccountError();
  }

  return profile;
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
