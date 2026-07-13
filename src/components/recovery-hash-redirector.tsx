"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function RecoveryHashRedirector() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash;
    if (!hash.startsWith("#")) {
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const recoveryType = params.get("type");
    const hasAccessToken = Boolean(params.get("access_token"));

    if (recoveryType !== "recovery" && !hasAccessToken) {
      return;
    }

    if (pathname === "/reset-password") {
      return;
    }

    router.replace(`/reset-password${hash}`);
  }, [pathname, router]);

  return null;
}
