/// <reference types="vite/client" />

// Vite define constant for version
declare const __ANSA_VERSION__: string;

interface ImportMetaEnv {
	readonly VITE_API_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
