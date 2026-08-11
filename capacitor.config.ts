import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ailanguidaumat.app",
  appName: "Ai Là Người Giấu Mặt",
  webDir: "dist",
  server: { androidScheme: "https" },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
