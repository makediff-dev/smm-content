import { RoleWorkspace } from "@/components/role-workspace/role-workspace";
import { parseWorkflowStage } from "@/lib/role-workspace";

export default async function ContentRolePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; contentId: string }>;
  searchParams: Promise<{ stage?: string | string[] }>;
}) {
  const { id, contentId } = await params;
  const query = await searchParams;
  return (
    <RoleWorkspace
      projectId={id}
      contentId={contentId}
      requestedStage={parseWorkflowStage(query.stage)}
    />
  );
}
