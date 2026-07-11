import { notFound } from "next/navigation";
import { ExperimentLoader } from "@/components/ExperimentLoader";
import {
  getAllExperimentIds,
  getExperimentMetadata,
  isValidExperimentId,
} from "@/experiments/registry";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getAllExperimentIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const metadata = getExperimentMetadata(id);
  if (!metadata) return {};
  return {
    title: metadata.title,
    description: metadata.description,
  };
}

export default async function ExperimentRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidExperimentId(id)) notFound();
  return <ExperimentLoader id={id} />;
}
