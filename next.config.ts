import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : null;

const nextConfig: NextConfig = {
	allowedDevOrigins: ["*"],
	images: {
		remotePatterns: supabaseHost
			? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
			: [],
	},
	turbopack: {
		root: workspaceRoot,
	},
};

export default nextConfig;
