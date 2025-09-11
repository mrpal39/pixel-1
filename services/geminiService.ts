/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Fix: Import Modality for image editing config.
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an image from a text prompt.
 * @param prompt The text prompt describing the desired image.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const generateImageFromText = async (
    prompt: string,
): Promise<string> => {
    console.log(`Starting text-to-image generation: ${prompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '1:1',
        },
    });
    console.log('Received response from model for text-to-image.', response);

    const firstImage = response.generatedImages?.[0];
    if (firstImage?.image?.imageBytes) {
        return `data:image/png;base64,${firstImage.image.imageBytes}`;
    }

    // Handle cases where no image is returned
    // Fix for Error on line 94, 96, 97: Cast response to 'any' to bypass potential type definition issues with promptFeedback.
    const safetyRatings = (response as any).promptFeedback?.safetyRatings;
    if (safetyRatings && safetyRatings.some((r: { blocked: any; }) => r.blocked)) {
        const reason = (response as any).promptFeedback.blockReason || 'Safety settings';
        const message = (response as any).promptFeedback.blockReasonMessage || 'Your prompt may have violated the safety policy.';
        const errorMessage = `Image generation was blocked. Reason: ${reason}. ${message}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    throw new Error('The AI model did not return an image. Please try a different prompt.');
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        // Fix: Add required responseModalities config for image editing.
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        // Fix: Add required responseModalities config for image editing.
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        // Fix: Add required responseModalities config for image editing.
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Removes the background from an image, making it transparent.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the image with the background removed.
 */
export const removeImageBackground = async (
    originalImage: File,
): Promise<string> => {
    console.log(`Starting background removal`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editing AI. Your task is to perfectly and accurately identify the main subject(s) in the image and completely remove the background. The output image MUST have a transparent background (alpha channel). Do not add any new background or color. The output format should be a PNG to support transparency.

Return ONLY the final image with a transparent background. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image to the model for background removal...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        // Fix: Add required responseModalities config for image editing.
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for background removal.', response);
    
    return handleApiResponse(response, 'background removal');
};

/**
 * Removes an object from an image using a mask.
 * @param originalImage The original image file.
 * @param maskImage The mask image file where white indicates the area to remove.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const removeObjectWithMask = async (
    originalImage: File,
    maskImage: File
): Promise<string> => {
    console.log(`Starting magic erase with mask`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const maskImagePart = await fileToPart(maskImage);
    const prompt = `You are an expert photo editor AI performing an object removal and inpainting task.
You are given two images: the first is the original image, and the second is a mask image.

Your task:
1.  Identify the object(s) in the original image that correspond to the WHITE areas in the mask image.
2.  Completely remove these object(s).
3.  Realistically fill in the removed area with a background that seamlessly matches the surrounding environment.
4.  The areas of the original image corresponding to the BLACK areas in the mask MUST remain absolutely identical and untouched.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and mask to the model for magic erase...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, maskImagePart, textPart] },
        // Fix: Add required responseModalities config for image editing.
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for magic erase.', response);
    
    return handleApiResponse(response, 'magic erase');
};


/**
 * Upscales an image by a given factor, enhancing details and sharpness.
 * @param originalImage The original image file.
 * @param scaleFactor The factor by which to upscale the image (e.g., 2 for 2x).
 * @returns A promise that resolves to the data URL of the upscaled image.
 */
export const upscaleImage = async (
    originalImage: File,
    scaleFactor: number
): Promise<string> => {
    console.log(`Starting upscale generation: ${scaleFactor}x`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI specializing in image upscaling. Your task is to increase the resolution of the provided image by a factor of ${scaleFactor}x.

Upscaling Guidelines:
- The output image resolution must be exactly ${scaleFactor} times the original width and height.
- Intelligently add realistic details and sharpness. Do not simply enlarge the pixels.
- The result must be photorealistic and free of artifacts.
- Preserve the original composition and colors as closely as possible.

Output: Return ONLY the final upscaled image. Do not return text.`;
    const textPart = { text: prompt };

    console.log(`Sending image and ${scaleFactor}x upscale prompt to the model...`);
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        // Fix: Add required responseModalities config for image editing.
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log(`Received response from model for ${scaleFactor}x upscale.`, response);
    
    return handleApiResponse(response, `upscale ${scaleFactor}x`);
};

/**
 * Reimagines an image in a specific artistic style using generative AI.
 * @param originalImage The original image file.
 * @param stylePrompt The text prompt describing the desired art style.
 * @returns A promise that resolves to the data URL of the stylized image.
 */
export const generateArtStyleImage = async (
    originalImage: File,
    stylePrompt: string,
): Promise<string> => {
    console.log(`Starting art style generation: ${stylePrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert AI artist. Your task is to completely repaint the provided image in the following artistic style. The original subject matter and composition must be preserved, but the aesthetic should be transformed entirely.
Art Style Request: "${stylePrompt}"

Output: Return ONLY the final stylized image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and style prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        // Fix: Add required responseModalities config for image editing.
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for art style.', response);
    
    return handleApiResponse(response, 'art style');
};
