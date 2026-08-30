import { CustomerProjectDetailPage } from "@/components/customer-portal";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <CustomerProjectDetailPage id={(await params).id} />; }
