import { Suspense } from "react";
import LoginPage from "./LoginPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--sx-void)] flex items-center justify-center">
          <p className="sx-eyebrow text-[#8d90a0]">加载中…</p>
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
