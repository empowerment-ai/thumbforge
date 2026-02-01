import { NextRequest, NextResponse } from "next/server";
import { analyzeFace } from "@/lib/face-analyzer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { faceImages } = body;

    if (!faceImages || !Array.isArray(faceImages) || faceImages.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one face image (base64)" },
        { status: 400 }
      );
    }

    if (faceImages.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 reference photos allowed" },
        { status: 400 }
      );
    }

    const analysis = await analyzeFace(faceImages);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Face analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze face photos. Please try again.",
      },
      { status: 500 }
    );
  }
}
