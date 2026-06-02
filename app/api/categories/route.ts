import { NextResponse } from "next/server";
import { listTaskCategories } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ taskCategories: listTaskCategories() });
}
