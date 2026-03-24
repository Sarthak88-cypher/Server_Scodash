import type { PrismaClient } from "@prisma/client";
import type { ParsedProfile } from "../../types/profile.js";
import { extractPdfText, extractDocxText, parseResumeWithAI } from "../ai/resume-parser.js";
import { sha256 } from "../../lib/utils.js";
import { AppError, ErrorCode } from "../../lib/errors.js";

interface ResumeProcessResult {
  parsedProfile: ParsedProfile;
  resumeId: string;
  resumeHash: string;
}

/**
 * Process a resume upload:
 * 1. Extract text from PDF/DOCX
 * 2. Parse with Claude Sonnet
 * 3. Store resume record
 * 4. Return parsed profile
 */
export async function processResume(
  db: PrismaClient,
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
): Promise<ResumeProcessResult> {
  // Extract text based on file type
  let text: string;
  if (fileType === "application/pdf") {
    text = await extractPdfText(fileBuffer);
  } else if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    text = await extractDocxText(fileBuffer);
  } else {
    throw new AppError(ErrorCode.VALIDATION_ERROR, `Unsupported file type: ${fileType}`, 400);
  }

  if (!text || text.trim().length < 50) {
    throw new AppError(
      ErrorCode.RESUME_PARSE_FAILED,
      "Could not extract meaningful text from the resume",
      422,
    );
  }

  // Generate hash for deduplication
  const resumeHash = await sha256(text);

  // Check if we've already processed this exact resume
  const existingResume = await db.resume.findFirst({
    where: {
      profile: { resumeHash },
    },
    include: { profile: true },
  });

  if (existingResume?.parsedData && existingResume.parseStatus === "COMPLETED") {
    return {
      parsedProfile: existingResume.parsedData as unknown as ParsedProfile,
      resumeId: existingResume.id,
      resumeHash,
    };
  }

  // Create resume record
  const resume = await db.resume.create({
    data: {
      fileName,
      fileType,
      fileSizeBytes: fileBuffer.length,
      parseStatus: "PROCESSING",
    },
  });

  // Parse with AI
  let parsedProfile: ParsedProfile;
  try {
    parsedProfile = await parseResumeWithAI(text);
  } catch (error) {
    await db.resume.update({
      where: { id: resume.id },
      data: { parseStatus: "FAILED" },
    });
    throw new AppError(
      ErrorCode.RESUME_PARSE_FAILED,
      "AI resume parsing failed",
      500,
      { originalError: String(error) },
    );
  }

  // Update resume with parsed data
  await db.resume.update({
    where: { id: resume.id },
    data: {
      parseStatus: "COMPLETED",
      parsedData: parsedProfile as object,
    },
  });

  return { parsedProfile, resumeId: resume.id, resumeHash };
}
