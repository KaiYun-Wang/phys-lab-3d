import { Suspense } from "react";
import LoginPage from "./LoginPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="sx-eyebrow text-[#8a8a96]">加载中…</p>
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
