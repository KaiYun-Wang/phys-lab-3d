"use client";

import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-5">
      <div className="page-shell text-center">
        <p className="sx-eyebrow text-[#5a5a5f] mb-4">404</p>
        <h1 className="sx-display text-4xl sm:text-5xl mb-4">未找到</h1>
        <p className="text-sm text-[#f0f0fa]/70 mb-10 max-w-sm mx-auto leading-relaxed">
          该页面或实验不存在。
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/" className="btn-ghost gap-2">
            <Home size={14} /> 首页
          </Link>
          <Link href="/#experiments" className="btn-ghost gap-2 opacity-70">
            <ArrowLeft size={14} /> 实验
          </Link>
        </div>
      </div>
    </div>
  );
}
