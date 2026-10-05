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
      className="w-full rounded-lg border border-[#27354f] bg-[#131b2b] px-4 py-2 text-xs font-medium text-[#d1d5db] transition-colors hover:border-[#4b5563] hover:bg-[#1c273e] hover:text-white"
    >
      {children}
    </button>
  );
}
