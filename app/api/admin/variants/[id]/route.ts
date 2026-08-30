import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { updateAdminVariant } from "@/lib/repositories/variants";
import { adminVariantPatchSchema } from "@/lib/validation/admin-variants";
export const dynamic="force-dynamic";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){if(!await getAdminRequestContext(request))return NextResponse.json({ok:false,message:"Authorised Admin access is required."},{status:401});const parsed=adminVariantPatchSchema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({ok:false,message:parsed.error.issues[0]?.message||"Check the variant update."},{status:400});try{const variant=await updateAdminVariant((await params).id,parsed.data);return variant?NextResponse.json({ok:true,variant}):NextResponse.json({ok:false,message:"Variant not found."},{status:404})}catch(error){return NextResponse.json({ok:false,message:error instanceof Error?error.message:"Could not update the variant."},{status:500})}}
