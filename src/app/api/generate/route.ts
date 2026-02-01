import { NextRequest, NextResponse } from "next/server";
import {
  generateThumbnails,
  generateCustomThumbnail,
} from "@/lib/thumbnail-generator";
import type { VideoAnalysis } from "@/lib/video-analyzer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysis, customPrompt, faceImageBase64, faceImages, faceDescription, model, count } = body;

    // Support both single image (legacy) and multi-image array
    const primaryFaceImage = faceImageBase64 || (faceImages && faceImages[0]) || undefined;

    if (!analysis && !customPrompt) {
      return NextResponse.json(
        { error: "Please provide video analysis or a custom prompt" },
        { status: 400 }
      );
    }

    let thumbnails;

    if (customPrompt) {
      // Single custom thumbnail
      const thumbnail = await generateCustomThumbnail(customPrompt, {
        faceImageBase64: primaryFaceImage,
        faceDescription,
        model,
      });
      thumbnails = [thumbnail];
    } else {
      // Generate from analysis
      thumbnails = await generateThumbnails(analysis as VideoAnalysis, {
        faceImageBase64: primaryFaceImage,
        faceDescription,
        model,
        count: count || 4,
      });
    }

    // Return thumbnails with base64 images
    return NextResponse.json({
      thumbnails: thumbnails.map((t) => ({
        id: t.id,
        imageDataUrl: `data:image/png;base64,${t.imageBase64}`,
        concept: t.concept,
        textOverlay: t.textOverlay,
        width: t.width,
        height: t.height,
      })),
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate thumbnails. Please try again.",
      },
      { status: 500 }
    );
  }
}
