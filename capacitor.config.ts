import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ailanguidaumat.app",
  appName: "Ai là kẻ giả danh",
  webDir: "dist",
  server: { androidScheme: "https" },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
