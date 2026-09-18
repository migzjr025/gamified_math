import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gameQuestions, units } from "@/db/schema";

export async function GET() {
  try {
    const data = await db
      .select({
        id: gameQuestions.id,
        unitId: gameQuestions.unitId,
        gradeLevel: gameQuestions.gradeLevel,
        quarter: gameQuestions.quarter,
        difficulty: gameQuestions.difficulty,
        prompt: gameQuestions.prompt,
        optionA: gameQuestions.optionA,
        optionB: gameQuestions.optionB,
        optionC: gameQuestions.optionC,
        optionD: gameQuestions.optionD,
        correctAnswer: gameQuestions.correctAnswer,
        explanation: gameQuestions.explanation,
        isActive: gameQuestions.isActive,
        unitTitle: units.title,
      })
      .from(gameQuestions)
      .leftJoin(units, eq(gameQuestions.unitId, units.id))
      .orderBy(gameQuestions.id);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Game questions fetch error", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const unitId = Number(body.unitId);
    const difficulty = Number(body.difficulty) || 1;
    const quarter = body.quarter || "Quarter 1";

    if (!unitId || isNaN(unitId)) {
      return NextResponse.json({ error: "A valid Curriculum Unit is required." }, { status: 400 });
    }

    const unitCheck = await db.select().from(units).where(eq(units.id, unitId)).limit(1);
    if (unitCheck.length === 0) {
      return NextResponse.json({ error: "The selected Curriculum Unit does not exist in the database." }, { status: 400 });
    }

    const result = await db.insert(gameQuestions).values({
      ...body,
      unitId,
      difficulty,
      quarter,
    }).returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Game question create error", error);
    return NextResponse.json({ error: "Failed to create game question. Check server logs." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...rest } = body;
    const result = await db.update(gameQuestions).set(rest).where(eq(gameQuestions.id, id)).returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Game question update error", error);
    return NextResponse.json({ error: "Failed to update game question" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    await db.delete(gameQuestions).where(eq(gameQuestions.id, body.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Game question delete error", error);
    return NextResponse.json({ error: "Failed to delete game question" }, { status: 500 });
  }
}
