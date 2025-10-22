interface ViteTypeOptions {
	strictImportMetaEnv: unknown;
}

interface CustomEnvironment extends ImportMetaEnv {
	VITE_DUMMY: string;
}

interface ImportMeta {
	readonly env: CustomEnvironment;
}
