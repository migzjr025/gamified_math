import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gameQuestions, units } from "@/db/schema";

const DEFAULT_QUESTIONS = [
  {
    id: 1,
    unitId: 1,
    gradeLevel: "Grade 2",
    quarter: "Quarter 1",
    difficulty: 1,
    prompt: "What is the value of 5 in the number 528?",
    optionA: "5",
    optionB: "50",
    optionC: "500",
    optionD: "5000",
    correctAnswer: "C",
    explanation: "In 528, the digit 5 is in the hundreds place, so its value is 500.",
    isActive: true,
    unitTitle: "Number and Number Sense",
  },
  {
    id: 2,
    unitId: 2,
    gradeLevel: "Grade 2",
    quarter: "Quarter 1",
    difficulty: 1,
    prompt: "What is 45 + 32?",
    optionA: "67",
    optionB: "77",
    optionC: "75",
    optionD: "87",
    correctAnswer: "B",
    explanation: "45 + 32 = 77.",
    isActive: true,
    unitTitle: "Operations and Computations",
  },
  {
    id: 3,
    unitId: 3,
    gradeLevel: "Grade 2",
    quarter: "Quarter 2",
    difficulty: 2,
    prompt: "Which fraction represents half of a whole?",
    optionA: "1/4",
    optionB: "1/3",
    optionC: "1/2",
    optionD: "2/3",
    correctAnswer: "C",
    explanation: "1/2 represents one part out of two equal parts (half).",
    isActive: true,
    unitTitle: "Fractions and Decimals",
  },
  {
    id: 4,
    unitId: 1,
    gradeLevel: "Grade 1",
    quarter: "Quarter 1",
    difficulty: 1,
    prompt: "Count the total: 3 apples + 4 apples = ?",
    optionA: "6",
    optionB: "7",
    optionC: "8",
    optionD: "9",
    correctAnswer: "B",
    explanation: "3 + 4 = 7 apples.",
    isActive: true,
    unitTitle: "Number and Number Sense",
  },
];

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

    return NextResponse.json(data.length > 0 ? data : DEFAULT_QUESTIONS);
  } catch (error) {
    console.warn("Game questions DB offline, returning default questions");
    return NextResponse.json(DEFAULT_QUESTIONS);
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  try {
    const unitId = Number(body.unitId);
    const difficulty = Number(body.difficulty) || 1;
    const quarter = body.quarter || "Quarter 1";
    const prompt = String(body.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "Question prompt is required." }, { status: 400 });
    }

    if (!unitId || isNaN(unitId) || unitId <= 0) {
      return NextResponse.json({ error: "A valid Curriculum Unit is required." }, { status: 400 });
    }

    // Error handler: Prevent exceeding 15 questions per quarter period
    try {
      const existingQuarterQs = await db
        .select()
        .from(gameQuestions)
        .where(eq(gameQuestions.quarter, quarter));

      if (existingQuarterQs.length >= 15) {
        return NextResponse.json(
          {
            error: `Question limit reached! ${quarter} already contains 15 questions. You cannot exceed 15 questions per quarter.`,
          },
          { status: 400 }
        );
      }
    } catch {
      const count = DEFAULT_QUESTIONS.filter((q) => q.quarter === quarter).length;
      if (count >= 15) {
        return NextResponse.json(
          {
            error: `Question limit reached! ${quarter} already contains 15 questions. You cannot exceed 15 questions per quarter.`,
          },
          { status: 400 }
        );
      }
    }

    try {
      const unitCheck = await db.select().from(units).where(eq(units.id, unitId)).limit(1);
      if (unitCheck.length === 0) {
        return NextResponse.json({ error: "The selected Curriculum Unit does not exist." }, { status: 400 });
      }

      const result = await db.insert(gameQuestions).values({
        ...body,
        prompt,
        unitId,
        difficulty,
        quarter,
      }).returning();
      return NextResponse.json(result[0]);
    } catch (dbErr) {
      console.warn("Questions DB offline on create, returning simulated question");
      return NextResponse.json({
        id: Date.now(),
        ...body,
        prompt,
        unitId,
        difficulty,
        quarter,
      });
    }
  } catch (error) {
    console.error("Game question create error", error);
    return NextResponse.json({ error: "Failed to create game question." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  try {
    const id = Number(body.id);
    if (!id || isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "A valid Question ID is required." }, { status: 400 });
    }

    const { id: _id, ...rest } = body;
    if (rest.quarter) {
      try {
        const existingTargetQs = await db
          .select()
          .from(gameQuestions)
          .where(eq(gameQuestions.quarter, rest.quarter));

        const otherQsInQuarter = existingTargetQs.filter((q) => q.id !== id);
        if (otherQsInQuarter.length >= 15) {
          return NextResponse.json(
            {
              error: `Question limit reached! ${rest.quarter} already contains 15 questions. You cannot exceed 15 questions per quarter.`,
            },
            { status: 400 }
          );
        }
      } catch {
        // Fallback for offline mode
      }
    }
    try {
      const result = await db.update(gameQuestions).set(rest).where(eq(gameQuestions.id, id)).returning();
      return NextResponse.json(result[0] || { id, ...rest });
    } catch {
      console.warn("Questions DB offline on update, returning simulated update");
      return NextResponse.json({ id, ...rest });
    }
  } catch (error) {
    console.error("Game question update error", error);
    return NextResponse.json({ error: "Failed to update game question" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  try {
    const id = Number(body.id);
    if (!id || isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "A valid Question ID is required." }, { status: 400 });
    }

    try {
      await db.delete(gameQuestions).where(eq(gameQuestions.id, id));
    } catch {
      console.warn("Questions DB offline on delete, returning simulated success");
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Game question delete error", error);
    return NextResponse.json({ error: "Failed to delete game question" }, { status: 500 });
  }
}
