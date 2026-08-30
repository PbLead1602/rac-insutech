import { CustomerEnquiryDetailPage } from "@/components/customer-portal";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <CustomerEnquiryDetailPage id={(await params).id} />; }
