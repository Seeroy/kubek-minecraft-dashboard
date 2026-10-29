import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "export",
	experimental: {
		optimizePackageImports: [
			"lucide-react",
			"@base-ui/react",
			"framer-motion",
		],
		turbopackServerFastRefresh: false
	},
	images: {
		unoptimized: true
	},
};

export default nextConfig;
