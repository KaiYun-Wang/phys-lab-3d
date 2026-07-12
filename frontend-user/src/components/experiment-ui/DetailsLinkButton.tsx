"use client";

import { useRouter } from "next/navigation";

export function DetailsLinkButton({
  href,
  children = "查看实验详情",
}: {
  href: string;
  children?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="btn-ghost w-full !min-h-[40px] !text-[11px]"
    >
      {children}
    </button>
  );
}
