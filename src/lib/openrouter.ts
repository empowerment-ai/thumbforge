/**
 * OpenRouter API client for ThumbForge
 * Handles both text (analysis) and image generation calls
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Models
export const MODELS = {
  // Text analysis
  ANALYSIS: "anthropic/claude-3.5-sonnet",
  // Image generation
  IMAGE_FLASH: "google/gemini-2.5-flash-image-preview",
  IMAGE_PRO: "google/gemini-3-pro-image-preview",
  IMAGE_FLUX: "black-forest-labs/flux-pro-1.1",
} as const;

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenRouter for text completion (video analysis, text suggestions)
 */
export async function textCompletion(
  messages: OpenRouterMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/empowerment-ai/thumbforge",
      "X-Title": "ThumbForge",
    },
    body: JSON.stringify({
      model: options.model || MODELS.ANALYSIS,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${error}`);
  }

  const data: OpenRouterResponse = await response.json();
  const content = data.choices[0]?.message?.content;

  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textPart = content.find((p) => p.type === "text");
    return textPart?.text || "";
  }
  return "";
}

/**
 * Call OpenRouter for image generation (thumbnail creation)
 */
export async function generateImage(
  prompt: string,
  options: {
    model?: string;
    referenceImageBase64?: string;
    aspectRatio?: string;
  } = {}
): Promise<{ imageBase64: string; revisedPrompt?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: prompt },
  ];

  // If a reference face image is provided, include it
  if (options.referenceImageBase64) {
    userContent.unshift({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${options.referenceImageBase64}`,
      },
    });
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/empowerment-ai/thumbforge",
      "X-Title": "ThumbForge",
    },
    body: JSON.stringify({
      model: options.model || MODELS.IMAGE_FLASH,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
      modalities: ["image", "text"],
      ...(options.model?.includes("gemini") && {
        provider: {
          order: ["google"],
        },
      }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter image API error (${response.status}): ${error}`);
  }

  const data: OpenRouterResponse = await response.json();
  const content = data.choices[0]?.message?.content;

  if (Array.isArray(content)) {
    const imagePart = content.find(
      (p) => p.type === "image_url" && p.image_url?.url
    );
    const textPart = content.find((p) => p.type === "text");

    if (imagePart?.image_url?.url) {
      // Extract base64 from data URL
      const base64 = imagePart.image_url.url.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      return {
        imageBase64: base64,
        revisedPrompt: textPart?.text,
      };
    }
  }

  throw new Error("No image returned from OpenRouter");
}
