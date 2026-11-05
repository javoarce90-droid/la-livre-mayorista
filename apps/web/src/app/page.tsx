import { redirect } from "next/navigation";
import { HOME_PATH } from "@/modules/account/domain/portal-sections";

export default function Home() {
  redirect(HOME_PATH);
}
