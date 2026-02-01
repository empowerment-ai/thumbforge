/**
 * Video Analysis Pipeline
 * Extracts transcript from YouTube URL and analyzes content for thumbnail generation
 */

import { textCompletion } from "./openrouter";

export interface VideoAnalysis {
  title: string;
  topic: string;
  hook: string;
  mood: string;
  keyMoments: string[];
  visualElements: string[];
  textSuggestions: string[];
  colorPalette: string[];
  targetEmotion: string;
  thumbnailConcepts: ThumbnailConcept[];
}

export interface ThumbnailConcept {
  description: string;
  textOverlay: string;
  mood: string;
  visualStyle: string;
  faceExpression: string;
}

/**
 * Extract transcript from YouTube video using VTD or fallback
 */
export async function extractTranscript(youtubeUrl: string): Promise<string> {
  // Use youtube-transcript-api via a simple fetch to a public API
  // For server-side, we'll shell out to our VTD tool or use the npm package
  
  // Extract video ID from URL
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) throw new Error("Invalid YouTube URL");

  // Try fetching transcript via youtube-transcript-api endpoint
  // In production, we'd use the npm package directly
  try {
    const response = await fetch(
      `https://www.youtube-transcript.io/api/transcript?url=${encodeURIComponent(youtubeUrl)}`,
      { signal: AbortSignal.timeout(15000) }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.transcript || data.text) {
        return data.transcript || data.text;
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback: try Supadata free tier
  try {
    const response = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(youtubeUrl)}`,
      { signal: AbortSignal.timeout(15000) }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.content) {
        return typeof data.content === "string" 
          ? data.content 
          : data.content.map((c: { text: string }) => c.text).join(" ");
      }
    }
  } catch {
    // Continue to next fallback
  }

  throw new Error(
    "Could not extract transcript. The video may not have captions available."
  );
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get video metadata (title, description) from YouTube oEmbed
 */
export async function getVideoMetadata(youtubeUrl: string): Promise<{ title: string; author: string }> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (response.ok) {
      const data = await response.json();
      return { title: data.title || "", author: data.author_name || "" };
    }
  } catch {
    // Silent fail
  }
  return { title: "", author: "" };
}

/**
 * Analyze video content and generate thumbnail concepts
 */
export async function analyzeVideo(
  youtubeUrl: string
): Promise<VideoAnalysis> {
  // Get transcript and metadata in parallel
  const [transcript, metadata] = await Promise.all([
    extractTranscript(youtubeUrl).catch(() => ""),
    getVideoMetadata(youtubeUrl),
  ]);

  if (!transcript && !metadata.title) {
    throw new Error(
      "Could not extract any information from this video. Please provide a video with captions or try describing your video instead."
    );
  }

  const analysisPrompt = `You are a YouTube thumbnail expert. Analyze this video content and generate thumbnail concepts.

VIDEO TITLE: ${metadata.title || "Unknown"}
CHANNEL: ${metadata.author || "Unknown"}
TRANSCRIPT (first 3000 chars): ${transcript.substring(0, 3000)}

Based on this content, provide a JSON response with the following structure:
{
  "title": "video title",
  "topic": "main topic in 2-3 words",
  "hook": "the main hook/value proposition of the video in one sentence",
  "mood": "primary mood (exciting/educational/shocking/funny/inspirational/dramatic)",
  "keyMoments": ["3-5 key moments or topics covered"],
  "visualElements": ["5-7 specific visual elements that would work in a thumbnail"],
  "textSuggestions": ["4-6 short text overlays (1-4 words each) that would grab attention"],
  "colorPalette": ["3-4 hex colors that match the video's mood and topic"],
  "targetEmotion": "the emotion the thumbnail should evoke in viewers",
  "thumbnailConcepts": [
    {
      "description": "detailed description of the thumbnail scene/composition",
      "textOverlay": "the text to show on the thumbnail (1-4 words)",
      "mood": "mood of this specific concept",
      "visualStyle": "style description (cinematic/cartoon/minimalist/bold/etc)",
      "faceExpression": "what expression the person should have (shocked/excited/curious/etc)"
    }
  ]
}

Generate exactly 4 thumbnail concepts. Each should be distinctly different in approach.
Focus on what would get HIGH CLICK-THROUGH RATES based on proven YouTube thumbnail principles:
- Strong facial expressions (30-50% of frame)
- High contrast colors
- Minimal but impactful text
- Curiosity gap
- Clear focal point

Return ONLY valid JSON, no markdown or explanation.`;

  const result = await textCompletion(
    [{ role: "user", content: analysisPrompt }],
    { temperature: 0.8, maxTokens: 2048 }
  );

  try {
    // Try to parse JSON, handling potential markdown code blocks
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as VideoAnalysis;
  } catch {
    throw new Error("Failed to parse video analysis. Please try again.");
  }
}

/**
 * Analyze a text description instead of a video URL
 */
export async function analyzeDescription(
  description: string
): Promise<VideoAnalysis> {
  const analysisPrompt = `You are a YouTube thumbnail expert. Based on this video description, generate thumbnail concepts.

VIDEO DESCRIPTION: ${description}

Provide a JSON response with the following structure:
{
  "title": "suggested video title",
  "topic": "main topic in 2-3 words",
  "hook": "the main hook/value proposition",
  "mood": "primary mood (exciting/educational/shocking/funny/inspirational/dramatic)",
  "keyMoments": ["3-5 potential key points"],
  "visualElements": ["5-7 specific visual elements for thumbnails"],
  "textSuggestions": ["4-6 short text overlays (1-4 words each)"],
  "colorPalette": ["3-4 hex colors matching the mood"],
  "targetEmotion": "emotion to evoke in viewers",
  "thumbnailConcepts": [
    {
      "description": "detailed thumbnail scene description",
      "textOverlay": "text overlay (1-4 words)",
      "mood": "concept mood",
      "visualStyle": "style (cinematic/cartoon/minimalist/bold/etc)",
      "faceExpression": "expression (shocked/excited/curious/etc)"
    }
  ]
}

Generate exactly 4 distinctly different thumbnail concepts.
Return ONLY valid JSON, no markdown.`;

  const result = await textCompletion(
    [{ role: "user", content: analysisPrompt }],
    { temperature: 0.8, maxTokens: 2048 }
  );

  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as VideoAnalysis;
  } catch {
    throw new Error("Failed to parse analysis. Please try again.");
  }
}
