import { redirect } from "next/navigation";

/**
 * Legacy experiment route redirector.
 * Old URLs like /experiment/pendulum now redirect to /experiments/pendulum
 */
export default async function ExperimentRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/experiments/${id}`);
}
