import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { units } from "@/db/schema";

const DEFAULT_UNITS = [
  { code: "M3-U1", title: "Number and Number Sense", gradeLevel: "Grade 2", quarter: "Quarter 1", description: "Understanding whole numbers up to 10,000 and place value.", difficulty: 1, orderIndex: 1 },
  { code: "M3-U2", title: "Operations and Computations", gradeLevel: "Grade 2", quarter: "Quarter 1", description: "Addition, subtraction, multiplication, and division of whole numbers.", difficulty: 2, orderIndex: 2 },
  { code: "M3-U3", title: "Fractions and Decimals", gradeLevel: "Grade 2", quarter: "Quarter 2", description: "Introduction to fractions, equivalent fractions, and basic decimals.", difficulty: 3, orderIndex: 3 },
  { code: "M4-U1", title: "Patterns and Algebra", gradeLevel: "Grade 1", quarter: "Quarter 2", description: "Identifying patterns and introducing simple algebraic expressions.", difficulty: 2, orderIndex: 1 },
  { code: "M4-U2", title: "Geometry and Measurement", gradeLevel: "Grade 1", quarter: "Quarter 3", description: "Shapes, angles, perimeter, area, and measurement concepts.", difficulty: 3, orderIndex: 2 },
  { code: "M5-U1", title: "Data Handling", gradeLevel: "Grade 2", quarter: "Quarter 3", description: "Collecting, organizing, and interpreting data using tables and graphs.", difficulty: 2, orderIndex: 1 },
  { code: "M5-U2", title: "Mixed Numbers Review", gradeLevel: "Grade 2", quarter: "Summative", description: "Comprehensive review of all Grade 2 Matatag Math topics.", difficulty: 3, orderIndex: 2 },
  { code: "M4-U3", title: "Summative Review", gradeLevel: "Grade 1", quarter: "Summative", description: "Comprehensive review of all Grade 1 Matatag Math topics.", difficulty: 3, orderIndex: 3 },
];

export async function GET() {
  try {
    let data = await db.select().from(units).orderBy(asc(units.orderIndex), asc(units.id));
    // Auto-seed units if the database is empty
    if (data.length === 0) {
      for (const u of DEFAULT_UNITS) {
        try {
          await db.insert(units).values(u);
        } catch (insertErr) {
          console.warn("Skipping default unit duplicate", insertErr);
        }
      }
      data = await db.select().from(units).orderBy(asc(units.orderIndex), asc(units.id));
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Units fetch error", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const title = (body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Unit title is required." }, { status: 400 });
    }

    let code = (body.code || "").trim();
    if (!code) {
      const gradePrefix = (body.gradeLevel || "Grade 2").includes("1") ? "M1" : "M2";
      const qPrefix = (body.quarter || "Quarter 1").replace("Quarter ", "Q").replace("Summative", "SUM");
      code = `${gradePrefix}-${qPrefix}-U${Math.floor(10 + Math.random() * 90)}`;
    }

    // Ensure code uniqueness
    const existing = await db.select().from(units).where(eq(units.code, code)).limit(1);
    if (existing.length > 0) {
      code = `${code}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const payload = {
      code,
      title,
      gradeLevel: body.gradeLevel || "Grade 2",
      quarter: body.quarter || "Quarter 1",
      description: (body.description || "").trim() || `${title} module for ${body.gradeLevel || "Grade 2"}.`,
      difficulty: Math.min(5, Math.max(1, Number(body.difficulty) || 1)),
      orderIndex: Math.max(1, Number(body.orderIndex) || 1),
    };

    const result = await db.insert(units).values(payload).returning();
    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("Units create error", error);
    return NextResponse.json({ error: error?.message || "Failed to create unit" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "Unit ID is required." }, { status: 400 });
    }

    const title = (body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Unit title is required." }, { status: 400 });
    }

    let code = (body.code || "").trim();
    if (!code) {
      code = `U-${id}`;
    }

    // Ensure code uniqueness (excluding current unit)
    const existing = await db.select().from(units).where(eq(units.code, code)).limit(1);
    if (existing.length > 0 && existing[0].id !== id) {
      code = `${code}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const payload = {
      code,
      title,
      gradeLevel: body.gradeLevel || "Grade 2",
      quarter: body.quarter || "Quarter 1",
      description: (body.description || "").trim() || `${title} module.`,
      difficulty: Math.min(5, Math.max(1, Number(body.difficulty) || 1)),
      orderIndex: Math.max(1, Number(body.orderIndex) || 1),
      updatedAt: new Date(),
    };

    const result = await db.update(units).set(payload).where(eq(units.id, id)).returning();
    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error("Units update error", error);
    return NextResponse.json({ error: error?.message || "Failed to update unit" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "Invalid unit ID." }, { status: 400 });
    }
    await db.delete(units).where(eq(units.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Units delete error", error);
    return NextResponse.json({ error: error?.message || "Failed to delete unit" }, { status: 500 });
  }
}

