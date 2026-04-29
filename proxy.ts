import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard")
  const isOnLogin = req.nextUrl.pathname === "/login"

  // Pre-stored token mode: dashboard is always accessible, no login needed
  if (process.env.TESLA_REFRESH_TOKEN) {
    if (isOnLogin) return NextResponse.redirect(new URL("/dashboard", req.url))
    return NextResponse.next()
  }

  // Session-based auth
  const isLoggedIn = !!req.auth
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }
})

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
}
