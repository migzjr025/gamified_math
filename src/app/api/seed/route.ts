import { NextResponse } from "next/server";
import { seedData } from "@/lib/seed";

export async function POST() {
  try {
    await seedData();
    return NextResponse.json({ success: true, message: "Database seeded successfully" });
  } catch (error: any) {
    console.error("Seed error", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to seed database" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await seedData();
    return NextResponse.json({ success: true, message: "Database seeded successfully with Units, Students, Questions, and Assessments!" });
  } catch (error: any) {
    console.error("Seed error", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to seed database" }, { status: 500 });
  }
}

