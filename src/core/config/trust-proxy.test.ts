import { describe, expect, it } from "vitest";
import { parseTrustProxy } from "./trust-proxy";

describe("parseTrustProxy", () => {
  it("is off by default", () => {
    expect(parseTrustProxy("")).toBe(false);
    expect(parseTrustProxy("  ")).toBe(false);
    expect(parseTrustProxy("false")).toBe(false);
  });

  it("parses booleans and hop counts", () => {
    expect(parseTrustProxy("true")).toBe(true);
    expect(parseTrustProxy("1")).toBe(1);
    expect(parseTrustProxy("2")).toBe(2);
  });

  it("parses an IP / CIDR list", () => {
    expect(parseTrustProxy("10.0.0.0/8, 172.16.0.0/12")).toEqual([
      "10.0.0.0/8",
      "172.16.0.0/12",
    ]);
  });
});
