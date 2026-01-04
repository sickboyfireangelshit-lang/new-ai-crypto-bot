
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { AspectRatio } from "../types";

export class GeminiService {
  private static activeSource: AudioBufferSourceNode | null = null;
  private static activeContext: AudioContext | null = null;

  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private static handleError(err: any): never {
    console.error("Gemini API Error:", err);
    if (err?.message?.includes("Requested entity was not found") || err?.message?.includes("API key not valid")) {
      window.dispatchEvent(new CustomEvent('gemini-auth-reset'));
    }
    throw err;
  }

  static createChatSession(history: any[] = []) {
    const ai = this.getAI();
    return ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history.map(h => {
        const parts: any[] = [];
        if (h.content) parts.push({ text: h.content });
        if (h.image) {
          const base64 = h.image.split(',')[1];
          const mimeType = h.image.split(';')[0].split(':')[1] || 'image/jpeg';
          parts.push({ inlineData: { data: base64, mimeType } });
        }
        return {
          role: h.role === 'user' ? 'user' : 'model',
          parts
        };
      }),
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        systemInstruction: `You are the CloudMine AI Command Core. You are a highly sophisticated, technical assistant specializing in distributed cloud mining, cryptographic hardware, and high-frequency trading analytics. 
        Your responses must be technical, precise, and authoritative. 
        Always remember your core directive: Optimize the grid and provide deep market intelligence. 
        You have VISION capabilities. When a user provides a photo of their hardware, mining rig, or server room:
        1. Perform a thorough technical audit.
        2. Identify components (GPUs, ASICs, Cooling, PSU).
        3. Check for obvious thermal or connection issues (dust, cable management, air flow).
        4. Provide optimization suggestions for that specific hardware setup.
        If asked about your identity, you are the Neural Core of CloudMine AI Pro.`
      }
    });
  }

  static async chatWithThinking(prompt: string, history: any[] = []): Promise<GenerateContentResponse> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
          systemInstruction: "You are a senior technical auditor and cryptographer for the CloudMine AI system. Provide deep reasoning and technical analysis."
        }
      });
      return response;
    } catch (err) {
      return this.handleError(err);
    }
  }

  static async analyzeChains(chainData: any): Promise<GenerateContentResponse> {
    try {
      const ai = this.getAI();
      const prompt = `Analyze the following blockchain network data and determine the optimal 'Data Chain' for high-yield mining deployment. 
      Consider Yield, Difficulty, Latency, and Security. 
      Data: ${JSON.stringify(chainData)}
      
      Provide:
      1. A recommendation for the 'Best Data Chain'.
      2. Strategic reasoning for this choice.
      3. Risk assessment for the runner-up chain.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
          systemInstruction: "You are the CloudMine Chain Architect. You analyze complex cross-chain data to optimize mining hashrate distribution."
        }
      });
      return response;
    } catch (err) {
      return this.handleError(err);
    }
  }

  static async fastChat(prompt: string) {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
          systemInstruction: "You are the CloudMine Fast Response Agent. Provide extremely concise, low-latency answers."
        }
      });
      return response.text || '';
    } catch (err) {
      return this.handleError(err);
    }
  }

  static async searchLatestCrypto(query: string): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: query,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
          tools: [{ googleSearch: {} }]
        }
      });

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri || '#'
      })) || [];

      return {
        text: response.text || '',
        sources
      };
    } catch (err) {
      return this.handleError(err);
    }
  }

  static async predictYield(query: string): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
    try {
      const ai = this.getAI();
      const prompt = `Project 7-day mining yield and market trends for: ${query}. 
      Include:
      1. Quantitative 7D earnings projection.
      2. Analysis of difficulty trends and network hashrate.
      3. A 'Miner Confidence Score' percentage based on current market volatility.
      4. Key drivers for this specific asset.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are the CloudMine Yield Architect. You provide high-accuracy 7-day financial and technical projections for cryptocurrency mining operations by synthesizing real-time search data."
        }
      });

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri || '#'
      })) || [];

      return {
        text: response.text || '',
        sources
      };
    } catch (err) {
      return this.handleError(err);
    }
  }

  static async generateAssetImage(prompt: string, aspectRatio: AspectRatio) {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize: '1K'
          }
        }
      });

      if (response.candidates && response.candidates.length > 0) {
        for (const candidate of response.candidates) {
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
              }
            }
          }
        }
      }
      return null;
    } catch (err) {
      return this.handleError(err);
    }
  }

  static async speakText(text: string, onEnded?: () => void) {
    try {
      this.stopSpeech(); // Stop any existing playback
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read this analysis clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        await this.playRawAudio(base64Audio, onEnded);
      }
    } catch (err) {
      return this.handleError(err);
    }
  }

  static stopSpeech() {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch (e) {
        // Source might already be stopped
      }
      this.activeSource = null;
    }
    if (this.activeContext) {
      // Keep context alive but reset it
      this.activeContext = null;
    }
  }

  private static async playRawAudio(base64: string, onEnded?: () => void) {
    if (!this.activeContext) {
      this.activeContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = this.activeContext;
    const bytes = this.decodeBase64(base64);
    const audioBuffer = await this.decodeAudioData(bytes, ctx, 24000, 1);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      if (this.activeSource === source) {
        this.activeSource = null;
      }
      if (onEnded) onEnded();
    };

    this.activeSource = source;
    source.start();
  }

  private static decodeBase64(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private static async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}
