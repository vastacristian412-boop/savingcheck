
import { GoogleGenAI, Type } from "@google/genai";
import { ImageAnalysis, ProductionMode, AIModel, AspectRatio, AdStyle } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const getPhotographicDirectives = (analysis: ImageAnalysis | null): string => {
  return `
    PHOTOGRAPHIC STANDARDS: 
    - Use high-end commercial lenses (85mm/100mm Macro).
    - Shallow depth of field (f/2.8) for precise subject isolation.
    - Master color grading matching: ${analysis?.emotionalEssence || 'Luxury Editorial'}.
    - Hero lighting: Cinematic highlights to emphasize material textures and premium finish.
    - IMPORTANT: Do NOT include any text, logos, or graphic overlays.
  `;
};

const getModelDirectives = (model: AIModel | undefined): string => {
  if (!model) return "";
  return `
    EDITORIAL CASTING (STRICT ADHERENCE): 
    The model MUST have the following traits:
    - Persona: ${model.age} ${model.gender}, ${model.ethnicity} ethnicity.
    - Physiology: ${model.skinTone} skin tone, ${model.eyeColor} eyes, ${model.faceShape}-shaped face.
    - Hair: ${model.hairColor} color, ${model.hairStyle} style.
    - Build: ${model.bodyType} physique, ${model.height} height.
    The model should be posed in a professional fashion editorial manner, interacting naturally with the product as a hero subject.
  `;
};

export const generateModelHeadshot = async (model: AIModel): Promise<string> => {
  const ai = getAI();
  const prompt = `A professional high-end fashion editorial headshot of a model. 
  Features: ${model.age} ${model.gender}, ${model.ethnicity} ethnicity, ${model.skinTone} skin, ${model.eyeColor} eyes, ${model.faceShape} face shape.
  Hair: ${model.hairStyle} style, ${model.hairColor} color.
  Lighting: Soft studio butterfly lighting, neutral grey background. 
  Style: High-end commercial photography, 8k resolution, sharp focus on eyes, ultra-realistic textures.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: '1:1' } }
    });
    const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!imgPart?.inlineData) throw new Error("Synthesis error");
    return `data:image/png;base64,${imgPart.inlineData.data}`;
  } catch (error) {
    console.error("Headshot generation failed:", error);
    throw error;
  }
};

export const analyzeProductImage = async (base64Image: string, mode: ProductionMode): Promise<ImageAnalysis> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: `Art Director Scan. Identify product DNA, materials, and colors.
          Design a HERO environment and suggest exactly 4 concise thematic props (max 3 words each) that would enhance the product's story.
          Generate a 1-sentence marketing headline (max 10 words).
          Return JSON: productType, materials, colors, lightingSuggestion, description, emotionalEssence, thematicProps, suggestedBackground, suggestedAtmosphere, suggestedAdCopy.` }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 24576 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productType: { type: Type.STRING },
            materials: { type: Type.ARRAY, items: { type: Type.STRING } },
            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
            lightingSuggestion: { type: Type.STRING },
            description: { type: Type.STRING },
            emotionalEssence: { type: Type.STRING },
            thematicProps: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedBackground: { type: Type.STRING },
            suggestedAtmosphere: { type: Type.STRING },
            suggestedAdCopy: { type: Type.STRING }
          },
          required: ['productType', 'materials', 'colors', 'lightingSuggestion', 'description', 'emotionalEssence', 'thematicProps', 'suggestedBackground', 'suggestedAtmosphere', 'suggestedAdCopy']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateAdHeadline = async (base64Image: string, analysis: ImageAnalysis | null): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: `Generate a premium marketing headline for this ${analysis?.productType || 'product'}. Tone: ${analysis?.emotionalEssence || 'Professional'}. Max 10 words. JSON: headline.` }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { headline: { type: Type.STRING } },
          required: ['headline']
        }
      }
    });
    return JSON.parse(response.text || '{}').headline || "";
  } catch (e) { return "Visionary excellence."; }
};

export const refreshSingleProp = async (base64Image: string, currentAnalysis: ImageAnalysis, propToReplace: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: `New decorative prop to replace "${propToReplace}" for a ${currentAnalysis.productType} photo shoot. Max 3 words. JSON: newProp.` }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { newProp: { type: Type.STRING } },
          required: ['newProp']
        }
      }
    });
    return JSON.parse(response.text || '{}').newProp || propToReplace;
  } catch (error) { return propToReplace; }
};

export const refreshAnalysisSuggestion = async (base64Image: string, mode: ProductionMode, currentAnalysis: ImageAnalysis): Promise<{ background: string; atmosphere: string; adCopy: string; emotionalEssence: string }> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: `New set design concept for ${currentAnalysis.productType}. Provide a high-end architectural description for the background and atmosphere. JSON: background, atmosphere, adCopy, emotionalEssence.` }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            background: { type: Type.STRING },
            atmosphere: { type: Type.STRING },
            adCopy: { type: Type.STRING },
            emotionalEssence: { type: Type.STRING }
          },
          required: ['background', 'atmosphere', 'adCopy', 'emotionalEssence']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) { throw error; }
};

export const editProductImage = async (
  base64Image: string, 
  prompt: string, 
  mode: ProductionMode,
  analysis: ImageAnalysis | null,
  options: { 
    aspectRatio: AspectRatio;
    adHeadline?: string;
    adCta?: string;
    styleTemplateImage?: string;
    logoImage?: string;
    aiModel?: AIModel;
    isRefinement?: boolean;
    count?: number;
    selectedProps?: string[];
  }
): Promise<string[]> => {
  const ai = getAI();
  const count = options.count || 1;
  const base64Product = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  const photoExpertise = getPhotographicDirectives(analysis);
  const modelExpertise = (mode === ProductionMode.FASHION) ? getModelDirectives(options.aiModel) : "";
  const selectedPropsStr = options.selectedProps?.length ? `MANDATORY DECORATIVE ELEMENTS: You MUST include ${options.selectedProps.join(', ')} in the scene composition.` : "";
  
  const contents: any = {
    parts: [
      { inlineData: { data: base64Product, mimeType: 'image/jpeg' } },
    ]
  };

  let templateDirective = "";
  let finalMarketingTask = "";

  // TEXT AND LOGO ARE ONLY ALLOWED IN AD_GEN MODE
  if (mode === ProductionMode.AD_GEN) {
    if (options.styleTemplateImage) {
      const base64Template = options.styleTemplateImage.includes(',') ? options.styleTemplateImage.split(',')[1] : options.styleTemplateImage;
      contents.parts.push({ inlineData: { data: base64Template, mimeType: 'image/jpeg' } });
      templateDirective = `
        TEMPLATE EMULATION & NEURAL SANITIZATION (STRICT):
        1. Analyze the REFERENCE TEMPLATE (the second image). 
        2. REPLICATE: Use the exact font styles, weights, colors, and the precise graphic positioning from the template for the text "${options.adHeadline || ''}".
        3. SANITIZATION: If the template image contains a different product or subject, you MUST COMPLETELY REMOVE IT and replace it with the hero product from image 1.
        4. GRAPHICS: Keep all background textures, graphic overlays, and design elements from the template.
      `;
    }

    if (options.logoImage) {
      const base64Logo = options.logoImage.includes(',') ? options.logoImage.split(',')[1] : options.logoImage;
      contents.parts.push({ inlineData: { data: base64Logo, mimeType: 'image/png' } });
      templateDirective += `
        BRAND LOGO INTEGRATION: Detect the brand logo provided. Place it professionally according to the layout.
      `;
    }

    finalMarketingTask = `FINAL AD TASK: Seamlessly integrate the headline "${options.adHeadline || ''}" and the CTA button "${options.adCta || ''}" into the composition following the brand's aesthetic.`;
  } else {
    // FOR STUDIO AND FASHION: ABSOLUTELY NO TEXT
    finalMarketingTask = "STRICT CLEANLINESS RULE: This is a pure photographic render. ABSOLUTELY NO TEXT, NO HEADLINES, NO LOGOS, AND NO CTA BUTTONS allowed in the final image.";
  }

  const coreDirective = `
    MASTER PRODUCTION: Generate a world-class commercial image.
    Hero Subject: Asset from image 1.
    ${templateDirective}
    ENVIRONMENT: ${prompt}
    ${selectedPropsStr}
    ${modelExpertise}
    ${photoExpertise}
    ${finalMarketingTask}
  `;

  contents.parts.push({ text: coreDirective });

  const tasks = Array.from({ length: count }).map(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents,
        config: { imageConfig: { aspectRatio: options.aspectRatio } }
      });
      const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (!imgPart?.inlineData) throw new Error("Synthesis error");
      return `data:image/png;base64,${imgPart.inlineData.data}`;
    } catch (error) {
      console.error("Generation failed:", error);
      throw error;
    }
  });

  return Promise.all(tasks);
};
