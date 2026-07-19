"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchLatestAnnouncement, type Announcement } from "@/lib/api";
import { clearPendingAnnouncement, hasPendingAnnouncement } from "@/lib/auth";
import AnnouncementDetailModal from "@/components/AnnouncementDetailModal";

export default function AnnouncementPopup() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    if (!hasPendingAnnouncement()) return;
    let cancelled = false;
    fetchLatestAnnouncement()
      .then((data) => {
        if (cancelled) return;
        clearPendingAnnouncement();
        if (data) setAnnouncement(data);
      })
      .catch(() => {
        if (!cancelled) clearPendingAnnouncement();
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!announcement) return null;

  return (
    <AnnouncementDetailModal announcement={announcement} onClose={() => setAnnouncement(null)} />
  );
}
