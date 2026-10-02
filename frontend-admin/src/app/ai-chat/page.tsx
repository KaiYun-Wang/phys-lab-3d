import { redirect } from "next/navigation";

/** 旧入口：试聊已收纳到知识页下的检索试测 */
export default function AiChatRedirectPage() {
  redirect("/knowledge/try");
}
