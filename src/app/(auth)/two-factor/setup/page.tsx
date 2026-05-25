import { redirect } from "next/navigation";

/** Legacy route — first-time setup is handled on sign-up or sign-in. */
export default function Page() {
  redirect("/dashboard");
}
