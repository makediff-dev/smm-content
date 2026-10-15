import { RoleWorkspace } from "@/components/role-workspace/role-workspace";

export default async function ContentRolePage({
  params,
}: {
  params: Promise<{ id: string; contentId: string }>;
}) {
  const { id, contentId } = await params;
  return <RoleWorkspace projectId={id} contentId={contentId} />;
}
