import { AppConfig } from "@/types/config";

const base: Omit<AppConfig, "appURL" | "baseAPIUrl"> = {
  appName: "SPMI",
  appDescription: "Pengecekan Jaminan Mutu Universitas",
  appLogo: {
    light: "",
    dark: "",
  },
  gitHubRepo: "",
  loginUrl: "/login",
  adminWA: "",
};

const config = {
  development: {
    ...base,
    appURL: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
    baseAPIUrl:
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787/api",
  } satisfies AppConfig,
  production: {
    ...base,
    appURL: process.env.NEXT_PUBLIC_BASE_URL ?? "",
    baseAPIUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    siteUrl: "",
  } satisfies AppConfig,
};

export default config.development;
