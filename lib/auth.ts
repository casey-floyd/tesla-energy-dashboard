import NextAuth, { type NextAuthConfig } from "next-auth"

const TESLA_FLEET_BASE_URL =
  process.env.TESLA_FLEET_BASE_URL ?? "https://fleet-api.prd.na.vn.cloud.tesla.com"

async function refreshTeslaToken(token: Record<string, unknown>) {
  try {
    const response = await fetch("https://auth.tesla.com/oauth2/v3/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.TESLA_CLIENT_ID!,
        client_secret: process.env.TESLA_CLIENT_SECRET!,
        refresh_token: token.refreshToken as string,
      }),
    })
    const refreshed = await response.json()
    if (!response.ok) throw refreshed
    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      error: undefined,
    }
  } catch {
    return { ...token, error: "RefreshAccessTokenError" as const }
  }
}

export const config: NextAuthConfig = {
  providers: [
    {
      id: "tesla",
      name: "Tesla",
      type: "oauth",
      issuer: "https://auth.tesla.com/oauth2/v3/nts",
      authorization: {
        url: "https://auth.tesla.com/oauth2/v3/authorize",
        params: {
          scope: "openid email offline_access energy_device_data vehicle_device_data",
          response_type: "code",
        },
      },
      token: {
        url: "https://auth.tesla.com/oauth2/v3/token",
        // Tesla requires credentials in the request body (client_secret_post),
        // not as an HTTP Basic auth header (client_secret_basic).
        params: {
          audience: TESLA_FLEET_BASE_URL,
          client_id: process.env.TESLA_CLIENT_ID,
          client_secret: process.env.TESLA_CLIENT_SECRET,
        },
      },
      userinfo: "https://auth.tesla.com/oauth2/v3/userinfo",
      clientId: process.env.TESLA_CLIENT_ID,
      clientSecret: process.env.TESLA_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub as string,
          name: (profile.name as string) ?? (profile.email as string),
          email: profile.email as string,
        }
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        }
      }
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token
      }
      return await refreshTeslaToken(token as Record<string, unknown>)
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        error: token.error as string | undefined,
      }
    },
  },
  pages: {
    signIn: "/login",
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
