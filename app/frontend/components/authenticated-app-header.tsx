import { AppHeader, type AppHeaderActive } from "@/components/app-header"
import type { AuthAction } from "@/lib/auth-context"
import { requireAppHeaderUser } from "@/lib/server-auth"

export async function AuthenticatedAppHeader({
  active,
  next = "/explore?as=user",
  action = "trips",
}: {
  active?: AppHeaderActive
  next?: string
  action?: AuthAction
}) {
  const user = await requireAppHeaderUser(next, action)
  return <AppHeader active={active} user={user} />
}
