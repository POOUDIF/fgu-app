"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubNav({ items }: { items: { href: string; label: string; exact?: boolean }[] }) {
  const path = usePathname();
  return (
    <nav className="subnav">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} className={active ? "active" : ""}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
