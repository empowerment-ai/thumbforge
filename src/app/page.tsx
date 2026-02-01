"use client";

import { useState, useRef, useCallback } from "react";
import type { VideoAnalysis, ThumbnailConcept } from "@/lib/video-analyzer";

// --- Types ---
interface GeneratedThumbnail {
  id: string;
  imageDataUrl: string;
  concept: ThumbnailConcept;
  textOverlay: string;
  width: number;
  height: number;
}

type AppStep = "input" | "analyzing" | "analysis" | "generating" | "results";

// --- Icons (inline SVG) ---
function IconYoutube() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

// --- Main App ---
export default function Home() {
  const [step, setStep] = useState<AppStep>("input");
  const [inputMode, setInputMode] = useState<"url" | "describe">("url");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [thumbnails, setThumbnails] = useState<GeneratedThumbnail[]>([]);
  const [faceImages, setFaceImages] = useState<string[]>([]);
  const [facePreviews, setFacePreviews] = useState<string[]>([]);
  const [faceDescription, setFaceDescription] = useState<string | null>(null);
  const [faceAnalyzing, setFaceAnalyzing] = useState(false);
  const [faceAnalysisDetails, setFaceAnalysisDetails] = useState<{
    keyFeatures: string[];
    photoCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingIndex, setGeneratingIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle face image upload (supports multiple)
  const handleFaceUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const remaining = 5 - faceImages.length;
      if (remaining <= 0) {
        setError("Maximum 5 reference photos allowed");
        return;
      }

      const filesToProcess = Array.from(files).slice(0, remaining);
      
      for (const file of filesToProcess) {
        if (!file.type.startsWith("image/")) {
          setError("Please upload image files only");
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setFacePreviews((prev) => [...prev, dataUrl]);
          setFaceImages((prev) => [...prev, dataUrl.split(",")[1]]);
          // Clear any existing analysis since photos changed
          setFaceDescription(null);
          setFaceAnalysisDetails(null);
        };
        reader.readAsDataURL(file);
      }

      // Reset file input so same file can be selected again
      e.target.value = "";
    },
    [faceImages.length]
  );

  // Remove a face photo
  const removeFacePhoto = useCallback((index: number) => {
    setFaceImages((prev) => prev.filter((_, i) => i !== index));
    setFacePreviews((prev) => prev.filter((_, i) => i !== index));
    setFaceDescription(null);
    setFaceAnalysisDetails(null);
  }, []);

  // Analyze uploaded face photos
  const handleFaceAnalysis = async () => {
    if (faceImages.length === 0) return;
    setFaceAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/face-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceImages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Face analysis failed");
      }

      setFaceDescription(data.analysis.description);
      setFaceAnalysisDetails({
        keyFeatures: data.analysis.keyFeatures,
        photoCount: data.analysis.photoCount,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Face analysis failed"
      );
    } finally {
      setFaceAnalyzing(false);
    }
  };

  // Analyze video (and face if photos uploaded)
  const handleAnalyze = async () => {
    setError(null);
    setStep("analyzing");

    try {
      // If face photos are uploaded but not yet analyzed, do that first
      if (faceImages.length > 0 && !faceDescription) {
        try {
          const faceResp = await fetch("/api/face-analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ faceImages }),
          });
          const faceData = await faceResp.json();
          if (faceResp.ok && faceData.analysis) {
            setFaceDescription(faceData.analysis.description);
            setFaceAnalysisDetails({
              keyFeatures: faceData.analysis.keyFeatures,
              photoCount: faceData.analysis.photoCount,
            });
          }
        } catch {
          // Non-fatal — continue without face analysis
          console.warn("Face analysis failed, continuing without it");
        }
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          inputMode === "url" ? { youtubeUrl } : { description }
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysis(data.analysis);
      setStep("analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStep("input");
    }
  };

  // Generate thumbnails
  const handleGenerate = async () => {
    if (!analysis) return;
    setError(null);
    setStep("generating");
    setGeneratingIndex(0);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          faceImageBase64: faceImages[0] || undefined,
          faceImages: faceImages.length > 0 ? faceImages : undefined,
          faceDescription: faceDescription || undefined,
          count: 4,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setThumbnails(data.thumbnails);
      setStep("results");
      setGeneratingIndex(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("analysis");
      setGeneratingIndex(-1);
    }
  };

  // Download thumbnail
  const downloadThumbnail = (thumbnail: GeneratedThumbnail) => {
    const link = document.createElement("a");
    link.href = thumbnail.imageDataUrl;
    link.download = `thumbforge-${thumbnail.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset
  const handleReset = () => {
    setStep("input");
    setAnalysis(null);
    setThumbnails([]);
    setError(null);
    setGeneratingIndex(-1);
    setFaceImages([]);
    setFacePreviews([]);
    setFaceDescription(null);
    setFaceAnalysisDetails(null);
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚒️</div>
            <div>
              <h1 className="text-xl font-bold">
                <span className="text-[var(--cyan)]">Thumb</span>Forge
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                AI YouTube Thumbnail Generator
              </p>
            </div>
          </div>
          <a
            href="https://github.com/empowerment-ai/thumbforge"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm"
          >
            GitHub →
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Step 1: Input */}
        {step === "input" && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">
                Create Click-Worthy Thumbnails with{" "}
                <span className="text-[var(--cyan)]">AI</span>
              </h2>
              <p className="text-[var(--text-muted)]">
                Paste a YouTube URL or describe your video. Our AI analyzes your
                content and generates scroll-stopping thumbnails.
              </p>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex gap-2 mb-6 bg-[var(--bg-card)] rounded-lg p-1 max-w-xs mx-auto">
              <button
                onClick={() => setInputMode("url")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  inputMode === "url"
                    ? "bg-[var(--cyan)] text-black"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                YouTube URL
              </button>
              <button
                onClick={() => setInputMode("describe")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  inputMode === "describe"
                    ? "bg-[var(--cyan)] text-black"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Describe
              </button>
            </div>

            {/* URL Input */}
            {inputMode === "url" && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 glow-cyan">
                <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">
                  YouTube Video URL
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center gap-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-4 py-3 focus-within:border-[var(--cyan)] transition-colors">
                    <IconYoutube />
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1 bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Description Input */}
            {inputMode === "describe" && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 glow-cyan">
                <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">
                  Describe Your Video
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., A tutorial about 5 hidden Python tricks that most developers don't know about. The tone is exciting and educational..."
                  rows={4}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-4 py-3 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)] transition-colors resize-none"
                />
              </div>
            )}

            {/* Face Upload — Multi-photo */}
            <div className="mt-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
              <label className="block text-sm font-medium mb-1 text-[var(--text-muted)]">
                Your Reference Photos{" "}
                <span className="text-[var(--text-muted)] font-normal">
                  (optional — up to 5 photos for best results)
                </span>
              </label>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                More photos from different angles &amp; lighting = more accurate face in thumbnails. 
                {faceImages.length === 0 && " At least 1 photo recommended."}
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                {faceImages.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg hover:border-[var(--cyan)] transition-colors text-sm"
                  >
                    <IconUpload />
                    {faceImages.length === 0 ? "Upload Photos" : "Add More"}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFaceUpload}
                  className="hidden"
                />
                {facePreviews.map((preview, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={preview}
                      alt={`Reference photo ${i + 1}`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[var(--cyan)]"
                    />
                    <button
                      onClick={() => removeFacePhoto(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {faceImages.length > 0 && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {faceImages.length}/5 photos
                  </span>
                )}
              </div>

              {/* Face Analysis Status */}
              {faceImages.length > 0 && !faceDescription && !faceAnalyzing && (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={handleFaceAnalysis}
                    className="text-xs px-3 py-1.5 bg-[var(--cyan)]/20 text-[var(--cyan)] rounded-lg hover:bg-[var(--cyan)]/30 transition-colors"
                  >
                    ✨ Analyze Face
                  </button>
                  <span className="text-xs text-[var(--text-muted)]">
                    AI will study your features for accurate reproduction
                  </span>
                </div>
              )}
              {faceAnalyzing && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--cyan)] rounded-full animate-pulse" />
                  <span className="text-xs text-[var(--cyan)]">
                    Analyzing your features...
                  </span>
                </div>
              )}
              {faceDescription && faceAnalysisDetails && (
                <div className="mt-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--green)]/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--green)] font-medium">
                      ✓ Face analyzed ({faceAnalysisDetails.photoCount} photo{faceAnalysisDetails.photoCount !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {faceAnalysisDetails.keyFeatures.slice(0, 5).map((f, i) => (
                      <span
                        key={i}
                        className="text-xs bg-[var(--bg-card)] px-2 py-0.5 rounded text-[var(--text-muted)]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Analyze Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleAnalyze}
                disabled={
                  inputMode === "url"
                    ? !youtubeUrl.trim()
                    : !description.trim()
                }
                className="flex items-center gap-2 px-8 py-3 bg-[var(--cyan)] text-black font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg"
              >
                <IconSparkles />
                Analyze & Generate Concepts
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Analyzing (Loading) */}
        {step === "analyzing" && (
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-[var(--bg-card)] border border-[var(--cyan)]/30 rounded-full mb-6">
              <div className="w-3 h-3 bg-[var(--cyan)] rounded-full animate-pulse-glow" />
              <span className="text-[var(--cyan)]">Analyzing video content...</span>
            </div>
            <p className="text-[var(--text-muted)]">
              Extracting transcript, identifying key themes, and generating
              thumbnail concepts. This takes about 10-15 seconds.
            </p>
            <div className="mt-8 grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-video skeleton rounded-lg"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Analysis Results */}
        {step === "analysis" && analysis && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{analysis.title}</h2>
                <p className="text-[var(--text-muted)]">
                  {analysis.topic} · {analysis.mood} · {analysis.targetEmotion}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                ← Start Over
              </button>
            </div>

            {/* Analysis Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[var(--cyan)] mb-2">
                  Hook
                </h3>
                <p className="text-sm">{analysis.hook}</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[var(--cyan)] mb-2">
                  Visual Elements
                </h3>
                <div className="flex flex-wrap gap-1">
                  {analysis.visualElements.slice(0, 5).map((el, i) => (
                    <span
                      key={i}
                      className="text-xs bg-[var(--bg-primary)] px-2 py-1 rounded"
                    >
                      {el}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[var(--cyan)] mb-2">
                  Color Palette
                </h3>
                <div className="flex gap-2">
                  {analysis.colorPalette.map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-lg border border-[var(--border)]"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Thumbnail Concepts */}
            <h3 className="text-lg font-semibold mb-4">
              Thumbnail Concepts{" "}
              <span className="text-[var(--text-muted)] font-normal text-sm">
                ({analysis.thumbnailConcepts.length} ideas)
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {analysis.thumbnailConcepts.map((concept, i) => (
                <div
                  key={i}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--cyan)]/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-[var(--cyan)]/20 text-[var(--cyan)] px-2 py-0.5 rounded">
                      Concept {i + 1}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {concept.visualStyle}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{concept.description}</p>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>
                      Text:{" "}
                      <span className="text-[var(--amber)] font-semibold">
                        &quot;{concept.textOverlay}&quot;
                      </span>
                    </span>
                    <span>Face: {concept.faceExpression}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Text Suggestions */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 mb-6">
              <h3 className="text-sm font-medium text-[var(--amber)] mb-2">
                Text Overlay Suggestions
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysis.textSuggestions.map((text, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-[var(--amber)]/10 border border-[var(--amber)]/30 rounded-lg text-sm text-[var(--amber)] font-semibold cursor-pointer hover:bg-[var(--amber)]/20 transition-colors"
                  >
                    {text}
                  </span>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-8 py-3 bg-[var(--amber)] text-black font-semibold rounded-lg hover:brightness-110 transition-all text-lg"
              >
                <IconSparkles />
                Generate Thumbnails
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Generating */}
        {step === "generating" && (
          <div className="max-w-4xl mx-auto text-center py-16">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-[var(--bg-card)] border border-[var(--amber)]/30 rounded-full mb-6">
              <div className="w-3 h-3 bg-[var(--amber)] rounded-full animate-pulse-glow" />
              <span className="text-[var(--amber)]">
                Generating thumbnails... {generatingIndex >= 0 && `(${generatingIndex + 1}/4)`}
              </span>
            </div>
            <p className="text-[var(--text-muted)]">
              Creating AI-powered thumbnails based on your video analysis. Each
              thumbnail takes about 10-20 seconds.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-video skeleton rounded-lg"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Results */}
        {step === "results" && thumbnails.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  Your Thumbnails{" "}
                  <span className="text-[var(--green)]">✓</span>
                </h2>
                <p className="text-[var(--text-muted)]">
                  {thumbnails.length} thumbnails generated · Click to download
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("analysis")}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:border-[var(--amber)] transition-colors text-sm"
                >
                  <IconRefresh />
                  Regenerate
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:border-[var(--cyan)] transition-colors text-sm"
                >
                  New Video
                </button>
              </div>
            </div>

            {/* Thumbnail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {thumbnails.map((thumbnail, i) => (
                <div
                  key={thumbnail.id}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--cyan)]/50 transition-all group"
                >
                  {/* Image */}
                  <div className="relative aspect-video bg-[var(--bg-primary)]">
                    <img
                      src={thumbnail.imageDataUrl}
                      alt={`Thumbnail ${i + 1}: ${thumbnail.concept.description}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => downloadThumbnail(thumbnail)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--cyan)] text-black font-medium rounded-lg hover:brightness-110 transition-all"
                      >
                        <IconDownload />
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-[var(--cyan)]/20 text-[var(--cyan)] px-2 py-0.5 rounded">
                        #{i + 1}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {thumbnail.concept.visualStyle}
                      </span>
                      {thumbnail.textOverlay && (
                        <span className="text-xs bg-[var(--amber)]/20 text-[var(--amber)] px-2 py-0.5 rounded">
                          &quot;{thumbnail.textOverlay}&quot;
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                      {thumbnail.concept.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Download All */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => thumbnails.forEach(downloadThumbnail)}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--cyan)] text-black font-semibold rounded-lg hover:brightness-110 transition-all"
              >
                <IconDownload />
                Download All ({thumbnails.length})
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[var(--border)] text-center text-sm text-[var(--text-muted)]">
          <p>
            Built with ❤️ by{" "}
            <a
              href="https://empowerment-ai.com"
              className="text-[var(--cyan)] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Empowerment AI
            </a>
            {" · "}
            <a
              href="https://github.com/empowerment-ai/thumbforge"
              className="hover:text-[var(--text-primary)] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Source on GitHub
            </a>
          </p>
          <p className="mt-1 text-xs">
            Powered by OpenRouter · Gemini · Claude
          </p>
        </footer>
      </div>
    </main>
  );
}
