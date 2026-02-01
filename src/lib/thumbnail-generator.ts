/**
 * Thumbnail Generation Pipeline
 * Converts video analysis into AI-generated thumbnail images
 */

import { generateImage, MODELS } from "./openrouter";
import type { ThumbnailConcept, VideoAnalysis } from "./video-analyzer";

export interface GeneratedThumbnail {
  id: string;
  imageBase64: string;
  concept: ThumbnailConcept;
  textOverlay: string;
  width: number;
  height: number;
}

/**
 * Build an optimized image generation prompt from a thumbnail concept
 */
function buildImagePrompt(
  concept: ThumbnailConcept,
  analysis: VideoAnalysis,
  faceDescription?: string
): string {
  const parts: string[] = [];

  // Core instruction
  parts.push(
    "Generate a professional YouTube thumbnail image at 1280x720 resolution (16:9 aspect ratio)."
  );

  // Visual style
  parts.push(`Visual style: ${concept.visualStyle}.`);

  // Scene description
  parts.push(`Scene: ${concept.description}`);

  // Face/person
  if (faceDescription) {
    parts.push(
      `The main person in the thumbnail: ${faceDescription}. Their expression should be ${concept.faceExpression}. The person's face should occupy about 30-40% of the frame, positioned on one side with their eyes in the upper third.`
    );
  } else {
    parts.push(
      `Include a person with a ${concept.faceExpression} expression. The person's face should occupy about 30-40% of the frame, positioned on one side.`
    );
  }

  // Color and mood
  parts.push(`Mood: ${concept.mood}. Use high-contrast colors from this palette: ${analysis.colorPalette.join(", ")}.`);

  // Thumbnail best practices
  parts.push(
    "IMPORTANT THUMBNAIL RULES: Single clear focal point. High contrast between subject and background. Bold, attention-grabbing composition. The image should make viewers curious and want to click. Professional YouTube thumbnail quality."
  );

  // Text overlay instruction
  if (concept.textOverlay) {
    parts.push(
      `Include bold text overlay reading "${concept.textOverlay}" in large, high-contrast letters with a dark outline/stroke for readability. Position the text prominently but don't cover the person's face. Use Impact or a similar bold sans-serif font style.`
    );
  }

  // Avoid
  parts.push(
    "DO NOT include: small or unreadable text, cluttered backgrounds, more than 4 words of text, anything in the bottom-right corner (YouTube puts duration badge there)."
  );

  return parts.join("\n\n");
}

/**
 * Generate thumbnails from video analysis
 */
export async function generateThumbnails(
  analysis: VideoAnalysis,
  options: {
    faceImageBase64?: string;
    faceDescription?: string;
    model?: string;
    count?: number;
  } = {}
): Promise<GeneratedThumbnail[]> {
  const count = Math.min(options.count || 4, analysis.thumbnailConcepts.length);
  const concepts = analysis.thumbnailConcepts.slice(0, count);

  // Generate thumbnails sequentially to avoid rate limits
  const results: GeneratedThumbnail[] = [];

  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i];
    const prompt = buildImagePrompt(
      concept,
      analysis,
      options.faceDescription
    );

    try {
      const { imageBase64, revisedPrompt } = await generateImage(prompt, {
        model: options.model || MODELS.IMAGE_FLASH,
        referenceImageBase64: options.faceImageBase64,
      });

      results.push({
        id: `thumb-${Date.now()}-${i}`,
        imageBase64,
        concept: {
          ...concept,
          description: revisedPrompt || concept.description,
        },
        textOverlay: concept.textOverlay,
        width: 1280,
        height: 720,
      });
    } catch (error) {
      console.error(`Failed to generate thumbnail ${i + 1}:`, error);
      // Continue with remaining thumbnails even if one fails
    }
  }

  if (results.length === 0) {
    throw new Error("Failed to generate any thumbnails. Please try again.");
  }

  return results;
}

/**
 * Generate a single thumbnail with a custom prompt
 */
export async function generateCustomThumbnail(
  prompt: string,
  options: {
    faceImageBase64?: string;
    model?: string;
  } = {}
): Promise<GeneratedThumbnail> {
  const fullPrompt = `Generate a professional YouTube thumbnail image at 1280x720 resolution (16:9 aspect ratio).

${prompt}

IMPORTANT: High contrast, single focal point, bold composition. Professional YouTube thumbnail quality. Avoid cluttering the bottom-right corner.`;

  const { imageBase64 } = await generateImage(fullPrompt, {
    model: options.model || MODELS.IMAGE_FLASH,
    referenceImageBase64: options.faceImageBase64,
  });

  return {
    id: `thumb-custom-${Date.now()}`,
    imageBase64,
    concept: {
      description: prompt,
      textOverlay: "",
      mood: "custom",
      visualStyle: "custom",
      faceExpression: "natural",
    },
    textOverlay: "",
    width: 1280,
    height: 720,
  };
}
