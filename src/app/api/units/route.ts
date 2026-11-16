import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { units } from "@/db/schema";

const DEFAULT_UNITS = [
  { code: "M2-T1-S1", title: "Term 1 - 1st Summative Unit", gradeLevel: "Grade 2", quarter: "Term 1 - 1st Summative", description: "Whole numbers up to 1,000, place value, and reading/writing numerals.", difficulty: 1, orderIndex: 1 },
  { code: "M2-T1-S2", title: "Term 1 - 2nd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 1 - 2nd Summative", description: "Comparing numbers, ordering numbers, and ordinal numbers up to 20th.", difficulty: 2, orderIndex: 2 },
  { code: "M2-T1-S3", title: "Term 1 - 3rd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 1 - 3rd Summative", description: "Addition of 2- to 3-digit numbers with and without regrouping.", difficulty: 2, orderIndex: 3 },
  { code: "M2-T1-S4", title: "Term 1 - 4th Summative Unit", gradeLevel: "Grade 2", quarter: "Term 1 - 4th Summative", description: "Subtraction of 2- to 3-digit numbers and real-world word problems.", difficulty: 3, orderIndex: 4 },

  { code: "M2-T2-S1", title: "Term 2 - 1st Summative Unit", gradeLevel: "Grade 2", quarter: "Term 2 - 1st Summative", description: "Basic multiplication concepts, repeated addition, and arrays.", difficulty: 2, orderIndex: 5 },
  { code: "M2-T2-S2", title: "Term 2 - 2nd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 2 - 2nd Summative", description: "Multiplication tables (2, 3, 4, 5, 10) and mental multiplication.", difficulty: 2, orderIndex: 6 },
  { code: "M2-T2-S3", title: "Term 2 - 3rd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 2 - 3rd Summative", description: "Introduction to division as equal sharing and repeated subtraction.", difficulty: 3, orderIndex: 7 },
  { code: "M2-T2-S4", title: "Term 2 - 4th Summative Unit", gradeLevel: "Grade 2", quarter: "Term 2 - 4th Summative", description: "Fractions of a whole (unit fractions 1/2, 1/3, 1/4) and simple comparisons.", difficulty: 3, orderIndex: 8 },

  { code: "M2-T3-S1", title: "Term 3 - 1st Summative Unit", gradeLevel: "Grade 2", quarter: "Term 3 - 1st Summative", description: "Basic 2D shapes, 3D solids, symmetry, and geometric patterns.", difficulty: 2, orderIndex: 9 },
  { code: "M2-T3-S2", title: "Term 3 - 2nd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 3 - 2nd Summative", description: "Time reading (analog/digital clock), days of the week, and calendar.", difficulty: 2, orderIndex: 10 },
  { code: "M2-T3-S3", title: "Term 3 - 3rd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 3 - 3rd Summative", description: "Linear measurement (meters/centimeters) and comparing lengths.", difficulty: 3, orderIndex: 11 },
  { code: "M2-T3-S4", title: "Term 3 - 4th Summative Unit", gradeLevel: "Grade 2", quarter: "Term 3 - 4th Summative", description: "Data collection, tally charts, pictographs, and bar graphs.", difficulty: 3, orderIndex: 12 },

  { code: "M2-REMED-U1", title: "Remedial Unit", gradeLevel: "Grade 2", quarter: "Remedial", description: "Targeted remedial exercises for missed questions across Terms 1 to 3.", difficulty: 2, orderIndex: 13 },
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
    console.warn("Units DB offline, returning default units");
    return NextResponse.json(DEFAULT_UNITS);
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

