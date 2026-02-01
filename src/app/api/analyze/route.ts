import { NextRequest, NextResponse } from "next/server";
import { analyzeVideo, analyzeDescription } from "@/lib/video-analyzer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeUrl, description } = body;

    if (!youtubeUrl && !description) {
      return NextResponse.json(
        { error: "Please provide a YouTube URL or video description" },
        { status: 400 }
      );
    }

    let analysis;

    if (youtubeUrl) {
      analysis = await analyzeVideo(youtubeUrl);
    } else {
      analysis = await analyzeDescription(description);
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze video. Please try again.",
      },
      { status: 500 }
    );
  }
}
