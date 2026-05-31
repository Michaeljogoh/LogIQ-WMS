import { requireOperatorAccountOwnerPage } from "@/server/helpers/require-operator-account-owner-page";

export default async function UsersSettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireOperatorAccountOwnerPage();
  return children;
}
