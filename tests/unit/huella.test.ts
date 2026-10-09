import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { bloqueIpv6 } = await import("@/lib/huella");

describe("bloqueIpv6", () => {
  it("expande el :: antes de tomar el bloque /64", () => {
    expect(bloqueIpv6("2001:db8::1")).toBe(bloqueIpv6("2001:db8::2"));
    expect(bloqueIpv6("2001:db8::1")).toBe("2001:db8:0:0");
    expect(bloqueIpv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe("2001:db8:85a3:0");
    expect(bloqueIpv6("fe80::1%eth0")).toBe("fe80:0:0:0");
  });
});
