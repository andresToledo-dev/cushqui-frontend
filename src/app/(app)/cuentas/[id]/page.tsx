import { AccountForm } from "@/components/AccountForm";

export default async function EditAccountPage({ params }: PageProps<"/cuentas/[id]">) {
  const { id } = await params;
  return <AccountForm id={id} />;
}
