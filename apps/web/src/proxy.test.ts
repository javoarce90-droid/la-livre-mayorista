import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/modules/auth/infrastructure/session-cookie";
import { proxy } from "./proxy";

function request(path: string, withSession = false) {
  const req = new NextRequest(new URL(path, "http://localhost:3000"));
  if (withSession) req.cookies.set(SESSION_COOKIE, "token");
  return req;
}

describe("proxy", () => {
  it("redirects anonymous visitors of portal routes to /login keeping the target", () => {
    const response = proxy(request("/pedido?x=1"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fpedido%3Fx%3D1");
  });

  it("lets /login through", () => {
    expect(proxy(request("/login")).headers.get("location")).toBeNull();
  });

  it("lets requests with a session cookie through", () => {
    expect(proxy(request("/dashboard", true)).headers.get("location")).toBeNull();
  });
});
