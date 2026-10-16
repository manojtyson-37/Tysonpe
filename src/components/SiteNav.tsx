import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { DEMO_HANDLE } from "@/lib/demo";
import { SiteNavView } from "./SiteNavView";
import { siteNavLinks, storefrontHandleFor } from "./site-nav-links";

export async function SiteNav() {
  const user = await getCurrentUser();
  const storefrontHandle = storefrontHandleFor(user, DEMO_HANDLE);
  return <SiteNavView items={siteNavLinks({ user, storefrontHandle })} logoutAction={logout} />;
}
