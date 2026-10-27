import { describe, expect, it } from "vitest";
import electronBuilderConfig from "../electron-builder.json";
import packageJson from "../package.json";
import { appBuildInfo } from "./build-info";

describe("app build identity", () => {
  it("matches package and macOS bundle metadata", () => {
    expect(appBuildInfo.productName).toBe(electronBuilderConfig.productName);
    expect(appBuildInfo.version).toBe(packageJson.version);
    expect(appBuildInfo.bundleId).toBe(electronBuilderConfig.appId);
  });
});
