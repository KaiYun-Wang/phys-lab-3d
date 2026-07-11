import { notFound } from "next/navigation";
import { ExperimentDetailsLoader } from "@/components/ExperimentLoader";
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
    title: `${metadata.title} - 实验详情`,
    description: metadata.description,
  };
}

export default async function ExperimentDetailsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidExperimentId(id)) notFound();
  return <ExperimentDetailsLoader id={id} />;
}
