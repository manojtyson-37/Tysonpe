import { describe, expect, it } from "vitest";
import { GATEWAYS, isGatewayId, resolveGateway } from "./gateways";

describe("gateways", () => {
  it("offers exactly Razorpay and Easebuzz", () => {
    expect(GATEWAYS.map((g) => g.id)).toEqual(["razorpay", "easebuzz"]);
  });
  it("isGatewayId accepts only known ids", () => {
    expect(isGatewayId("razorpay")).toBe(true);
    expect(isGatewayId("easebuzz")).toBe(true);
    for (const bad of ["Razorpay", "stripe", "", null, undefined, 3, {}]) expect(isGatewayId(bad)).toBe(false);
  });
  it("resolveGateway takes the first valid candidate and falls back to razorpay", () => {
    expect(resolveGateway("easebuzz", "razorpay")).toBe("easebuzz");
    expect(resolveGateway("nope", undefined, "easebuzz")).toBe("easebuzz");
    expect(resolveGateway("nope", null)).toBe("razorpay");
    expect(resolveGateway()).toBe("razorpay");
  });
});
