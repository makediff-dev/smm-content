import { redirect } from "next/navigation";

export default async function WizardPage({
  params,
}: {
  params: Promise<{ id: string; contentId: string; step: string }>;
}) {
  const { id, contentId } = await params;
  redirect(`/projects/${id}/content/${contentId}`);
}
