import type { ASTNode } from '../gfl/types';
import { parseGFL, ParseError } from '../gfl/parser';
import { serializeGFL } from '../gfl/parser';

export interface VisionGeneratorContext {
  targetImageBase64: string; // The target image encoded as a base64 string
  grammarSummary: string;
  currentProgram?: ASTNode;
  metrics?: {
    error: number;
    complexity: number;
    cost: number;
  };
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export interface VisionTransportConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface VisionTransport {
  send(messages: Message[], config: VisionTransportConfig): Promise<string>;
}

export class FetchVisionTransport implements VisionTransport {
  async send(messages: Message[], config: VisionTransportConfig): Promise<string> {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Vision API error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}

function extractGFL(responseContent: string): string {
  // Try to find code block
  const match = responseContent.match(/```(?:gfl|lisp)?\s*([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  return responseContent.trim();
}

export class VisionProgramGenerator {
  private transport: VisionTransport;

  constructor(transport: VisionTransport = new FetchVisionTransport()) {
    this.transport = transport;
  }

  private getConfig(): VisionTransportConfig {
    const apiKey = process.env.GFL_VISION_API_KEY;
    if (!apiKey) {
      throw new Error('GFL_VISION_API_KEY environment variable is required');
    }

    return {
      apiKey,
      baseUrl: process.env.GFL_VISION_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
      model: process.env.GFL_VISION_MODEL || 'gemini-3.5-flash',
    };
  }

  private buildInitialMessages(context: VisionGeneratorContext): Message[] {
    let prompt = `You are a Geometric Function Language (GFL) generator.
Your goal is to generate a GFL program that recreates the provided target image.
Respond ONLY with the raw GFL code, optionally wrapped in a markdown code block. Do not include any explanations.

Grammar Summary:
${context.grammarSummary}
`;

    if (context.currentProgram) {
      prompt += `\nCurrent Program:\n${serializeGFL(context.currentProgram)}\n`;
    }

    if (context.metrics) {
      prompt += `\nCurrent Metrics:\nError: ${context.metrics.error}\nComplexity: ${context.metrics.complexity}\nCost: ${context.metrics.cost}\n`;
    }

    return [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Generate a GFL program that looks like this image.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${context.targetImageBase64}` } }
        ]
      }
    ];
  }

  async generate(context: VisionGeneratorContext): Promise<ASTNode> {
    const config = this.getConfig();
    const messages = this.buildInitialMessages(context);

    // Initial attempt
    let responseContent = await this.transport.send(messages, config);
    let programStr = extractGFL(responseContent);

    try {
      return parseGFL(programStr);
    } catch (err) {
      if (err instanceof ParseError) {
        // Retry logic on parse error
        messages.push({ role: 'assistant', content: responseContent });
        messages.push({ 
          role: 'user', 
          content: `The GFL parser threw an error: ${err.message}. Please fix the syntax and provide only the corrected GFL program.` 
        });

        responseContent = await this.transport.send(messages, config);
        programStr = extractGFL(responseContent);
        return parseGFL(programStr); // If it fails again, we let it throw
      }
      throw err;
    }
  }
}
