import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pluto.supercube", // 上架前可改成你自己的 Bundle ID
  appName: "SuperCube",
  webDir: "dist",
  backgroundColor: "#0a0c12",
  ios: {
    contentInset: "always",
    backgroundColor: "#0a0c12",
  },
};

export default config;
