"use client";

import { authClient } from "@/lib/auth-client";

export async function enableTwoFactorWithPassword(password: string) {
  const { error } = await authClient.twoFactor.enable({ password });
  if (error) {
    throw new Error(error.message ?? "Could not enable two-factor authentication");
  }
}

export async function sendTwoFactorOtp() {
  const { error } = await authClient.twoFactor.sendOtp();
  if (error) {
    throw new Error(error.message ?? "Could not send verification code");
  }
}

export async function verifyTwoFactorOtp(code: string, trustDevice: boolean) {
  const { error } = await authClient.twoFactor.verifyOtp({
    code,
    trustDevice,
  });
  if (error) {
    throw new Error(error.message ?? "Invalid verification code");
  }
}
