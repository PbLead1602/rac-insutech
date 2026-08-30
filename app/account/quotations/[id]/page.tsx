import { CustomerQuotationDetailPage } from "@/components/customer-portal";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <CustomerQuotationDetailPage id={(await params).id} />; }
