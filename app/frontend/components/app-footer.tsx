import Link from "next/link"

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4 md:px-10">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="grid size-5 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="font-mono text-[10px] font-semibold">ST</span>
          </span>
          <span className="font-medium text-foreground">SnapTrip</span>
          <span aria-hidden className="text-muted-foreground/60">·</span>
          <span>Workspace</span>
        </div>
        <nav aria-label="Workspace footer" className="flex items-center gap-4 text-[12px] text-muted-foreground">
          <Link href="/about?as=user" className="hover:text-foreground">
            About
          </Link>
          <Link href="/account" className="hover:text-foreground">
            Settings
          </Link>
          <Link href="/about?as=user#help" className="hover:text-foreground">
            Help
          </Link>
          <span className="hidden text-muted-foreground/60 md:inline">·</span>
          <span className="hidden md:inline">© {new Date().getFullYear()} SnapTrip</span>
        </nav>
      </div>
    </footer>
  )
}
