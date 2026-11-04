import { IntegrationForm } from "@/components/IntegrationForm";

export default async function EditIntegrationPage({ params }: PageProps<"/integraciones/[id]">) {
  const { id } = await params;
  return <IntegrationForm id={id} />;
}
