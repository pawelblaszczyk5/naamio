interface ViteTypeOptions {
	strictImportMetaEnv: unknown;
}

interface CustomEnvironment extends ImportMetaEnv {
	VITE_SITE_DOMAIN: string;
}

interface ImportMeta {
	readonly env: CustomEnvironment;
}
