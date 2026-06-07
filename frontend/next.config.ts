import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "export",
	experimental: {
		viewTransition: true,
		optimizePackageImports: [
			"lucide-react",
			"@base-ui/react",
			"recharts",
			"framer-motion",
			"react-use",
		],
		turbopackServerFastRefresh: false
	},
	images: {
		unoptimized: true
	},
	typescript: {
		ignoreBuildErrors: true,
	},
};

export default nextConfig;
