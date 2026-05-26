import { redirect } from "next/navigation";

/** @deprecated Use `/sign-in` — kept for invite email links. */
export default function Page() {
  redirect("/sign-in");
}
