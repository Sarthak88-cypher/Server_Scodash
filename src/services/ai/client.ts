import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env } from "../../config/env.js";

let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _openai;
}
