"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SignOutButtonProps = {
  label: string;
  className: string;
};

export function SignOutButton({ label, className }: SignOutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      className={className}
      onClick={async () => {
        setLoading(true);

        await Promise.allSettled([
          fetch("/api/auth/signout", {
            method: "POST",
          }),
          fetch("/api/admin/logout", {
            method: "POST",
          }),
        ]);

        router.push("/");
        router.refresh();
      }}
    >
      {loading ? "..." : label}
    </button>
  );
}
