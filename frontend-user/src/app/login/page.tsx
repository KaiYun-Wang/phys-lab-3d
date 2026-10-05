import { Suspense } from "react";
import LoginPage from "./LoginPage";
import LoadingScreen from "@/components/LoadingScreen";

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginPage />
    </Suspense>
  );
}
