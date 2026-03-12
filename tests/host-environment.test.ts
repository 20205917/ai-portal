import { describe, expect, it } from "vitest";

import { resolveHostEnvironment } from "../src/main/host-environment";

describe("resolveHostEnvironment", () => {
  it("builds linux summary without hardcoded Ubuntu text", () => {
    const environment = resolveHostEnvironment({
      platform: "linux",
      env: {
        XDG_SESSION_TYPE: "x11",
        DESKTOP_SESSION: "ubuntu",
        XDG_CURRENT_DESKTOP: "GNOME"
      } as NodeJS.ProcessEnv
    });

    expect(environment.summary).toContain("Linux");
    expect(environment.summary).toContain("GNOME");
    expect(environment.summary).toContain("X11");
    expect(environment.summary).not.toContain("Ubuntu GNOME");
  });

  it("builds windows summary", () => {
    const environment = resolveHostEnvironment({
      platform: "win32",
      env: {
        SESSIONNAME: "Console",
        USERDOMAIN: "WORKGROUP"
      } as NodeJS.ProcessEnv
    });

    expect(environment.summary).toContain("Windows");
    expect(environment.currentDesktop).toBe("windows");
  });
});
