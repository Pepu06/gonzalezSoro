import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import fs from 'fs';
import "dotenv/config";

dotenv.config();

// Initialize chat history with proper message structure
const chatHistory = [];

// Helper function to format chat messages
const formatMessage = (role, content) => ({
    role,
    parts: [{ text: content }]
});

// Access your API key as an environment variable.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-pro-exp-02-05",
    systemInstruction: "**Instrucción:**\n\n\"Tu tarea es actuar como un sistema experto en reconocimiento de edificios y análisis de texto.  Recibirás un texto proporcionado por el usuario que contiene una dirección y un mensaje sobre un edificio.  Debes identificar la dirección y determinar el propósito del texto del usuario con respecto a ese edificio.\n\n**Formato de entrada del usuario:**\n\nEl texto del usuario incluirá siempre una dirección completa en español y un texto adicional que describe lo que el usuario desea expresar sobre ese edificio.\n\n**Ejemplo de entrada del usuario:**\n\n'En san benito de palermo 1584 hay una pérdida de gas'\n\n**Tu proceso:**\n\n1. **Extrae la dirección:** Identifica y extrae la dirección completa del texto del usuario.\n2. **Analiza el texto:**  Lee el resto del texto del usuario para comprender la intención o propósito del mensaje. Determina qué quiere comunicar el usuario sobre el edificio.  ¿Es una reseña? ¿Una pregunta? ¿Un comentario general? ¿Una solicitud de información?\n4. **Entrega un resumen:**  Proporciona un resumen conciso en español que incluya:\n    * La dirección completa del edificio.\n    * La intención principal del texto del usuario con respecto al edificio.\n\n**Ejemplo de salida esperada para la entrada de usuario anterior:**\n\n'\nDirección: San Benito de Palermo 1584\nTexto:  Hay una perdida de gas.'\n\n**Consideraciones adicionales:**\n\n* Si la dirección es ambigua o no se puede identificar un edificio específico, indica que la dirección no fue lo suficientemente clara y solicita al usuario que la refine.\n* Si el texto del usuario no tiene una intención clara,  indica que no se pudo determinar el propósito del mensaje y pide al usuario que lo aclare.\n*  Prioriza la precisión en la identificación del edificio y la comprensión de la intención del usuario.\"\n\n\n\n\n\n",
});

export async function chat(text: string) {
    // Start or continue chat session with history
    const chatSession = model.startChat({
        history: chatHistory,
    });

    // Send message and get response
    const result = await chatSession.sendMessage(text);
    const response = result.response.text();

    // Update history with properly formatted messages
    chatHistory.push(formatMessage("user", text));
    chatHistory.push(formatMessage("model", response));

    return response;
}

export async function image2text(imagePath: string): Promise<string> {
    // Resuelve la ruta de la imagen y lee el archivo.
    const resolvedPath = path.resolve(imagePath);
    const imageBuffer = fs.readFileSync(resolvedPath);

    // Convierte la imagen a base64 y configura la solicitud.
    const image = {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: "image/png", // Cambia esto según el tipo de imagen, si es diferente.
        },
    };

    // Envía la solicitud a la API.
    const result = await model.generateContent([image]);

    // Devuelve el texto de la respuesta.
    return result.response.text();
}