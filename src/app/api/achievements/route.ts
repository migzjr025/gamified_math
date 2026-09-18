import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { achievements } from "@/db/schema";

export async function GET() {
  try {
    const data = await db.select().from(achievements);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Achievements fetch error", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await db.insert(achievements).values(body).returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Achievements create error", error);
    return NextResponse.json({ error: "Failed to create achievement" }, { status: 500 });
  }
}
