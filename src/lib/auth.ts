import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins/custom-session";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { magicLink } from "better-auth/plugins/magic-link";
import { organization } from "better-auth/plugins/organization";
import { twoFactor } from "better-auth/plugins/two-factor";
import { db } from "@/lib/db";
import {
  sendMerchantInviteEmail,
  sendResetPasswordEmail,
  sendTwoFactorOtpEmail,
  sendVerificationEmail,
} from "@/lib/email";
import { ensureOperatorWorkspaceForUser } from "@/server/helpers/ensure-operator-workspace";
import { buildSessionTenantFields } from "@/server/helpers/session-enrichment";
import {
  syncAccountUserForMember,
  upsertLogiqAccount,
} from "@/server/helpers/tenant-sync";

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

const upsConfigured =
  Boolean(process.env.UPS_CLIENT_ID) && Boolean(process.env.UPS_CLIENT_SECRET);

export const auth = betterAuth({
  appName: "LogIQ WMS",
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-insecure-change-me",
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendResetPasswordEmail({
        to: user.email,
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        to: user.email,
        url,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  ...(googleConfigured
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          },
        },
      }
    : {}),
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      membershipRequiresApproval: false,
      organizationHooks: {
        afterCreateOrganization: async ({ organization, member, user }) => {
          await upsertLogiqAccount({
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          });
          await syncAccountUserForMember(
            {
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
            },
            { role: member.role },
            { id: user.id, email: user.email, name: user.name },
          );
        },
        afterAddMember: async ({ organization, member, user }) => {
          await syncAccountUserForMember(
            {
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
            },
            { role: member.role },
            { id: user.id, email: user.email, name: user.name },
          );
        },
      },
    }),
    twoFactor({
      issuer: "LogIQ WMS",
      otpOptions: {
        async sendOTP({ user, otp }) {
          await sendTwoFactorOtpEmail({
            to: user.email,
            otp,
          });
        },
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMerchantInviteEmail({ to: email, url });
      },
    }),
    ...(upsConfigured
      ? [
          genericOAuth({
            config: [
              {
                providerId: "ups",
                clientId: process.env.UPS_CLIENT_ID as string,
                clientSecret: process.env.UPS_CLIENT_SECRET as string,
                authorizationUrl: "https://www.ups.com/lasso/signin",
                tokenUrl: "https://www.ups.com/security/v1/oauth/token",
                userInfoUrl: "https://onlinetools.ups.com/api/track/v1/details",
                scopes: ["read"],
                mapProfileToUser: (profile) => {
                  const p = profile as Record<string, unknown>;
                  const id =
                    typeof p.sub === "string"
                      ? p.sub
                      : typeof p.id === "string"
                        ? p.id
                        : "unknown";
                  return {
                    email:
                      typeof p.email === "string"
                        ? p.email
                        : `ups-oauth-${id}@placeholder.logiqwms.local`,
                    name:
                      typeof p.name === "string"
                        ? p.name
                        : "UPS-connected user",
                    emailVerified: true,
                  };
                },
              },
            ],
          }),
        ]
      : []),
    customSession(async ({ user, session }) => {
      let tenant = await buildSessionTenantFields(user.id);
      if (!tenant) {
        tenant = await ensureOperatorWorkspaceForUser(user.id);
      }

      const authUser = await db.user.findUnique({
        where: { id: user.id },
        select: {
          twoFactorEnabled: true,
          twoFactorSetupCompleted: true,
        },
      });

      const twoFactorFields = {
        twoFactorEnabled: authUser?.twoFactorEnabled ?? false,
        twoFactorSetupCompleted: authUser?.twoFactorSetupCompleted ?? false,
      };

      if (!tenant) {
        return {
          session,
          user: {
            ...user,
            ...twoFactorFields,
          },
        };
      }
      return {
        session,
        user: {
          ...user,
          ...twoFactorFields,
          accountId: tenant.accountId,
          systemRole: tenant.systemRole,
          managedWarehouseIds: tenant.managedWarehouseIds,
          warehouseAssignments: tenant.warehouseAssignments,
          merchantId: tenant.merchantId,
          merchantPermissions: tenant.merchantPermissions,
        },
      };
    }),
    nextCookies(),
  ],
});
