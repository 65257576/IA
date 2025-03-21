import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyAY-vsM5Nhnve6DiKwe3MMBXgxvJsp2gCY";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

let messages = { history: [] };
let userScrolling = false; 


const languageMap = {
    "fr": ["bonjour", "salut", "merci", "oui", "non", "comment", "quoi"],
    "en": ["hello", "hi", "thanks", "yes", "no", "how", "what"],
    "es": ["hola", "gracias", "sí", "no", "cómo", "qué"],
    "ar": ["مرحبا", "شكرا", "نعم", "لا", "كيف", "ماذا"]
};


function detectLanguage(text) {
    const words = text.toLowerCase().split(" ");
    for (const [lang, keywords] of Object.entries(languageMap)) {
        if (words.some(word => keywords.includes(word))) {
            return lang;
        }
    }
    return "fr"; 
}

// Fonction pour faire défiler vers le bas automatiquement
function scrollToBottom(force = true) {
    setTimeout(() => {
        const chatContainer = document.querySelector(".chat-window .chat");
        if (force || !userScrolling) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, 100);
}

//chatContainer.addEventListener("wheel", (event) => {
//    if (event.deltaY !== 0) { 
//        userScrolling = true; 
//    }
//});

const chatContainer = document.querySelector(".chat-window .chat");
chatContainer.addEventListener("touchstart", () => userScrolling = true); // Mobile
chatContainer.addEventListener("wheel", () => userScrolling = true); // Ordinateur
chatContainer.addEventListener("scroll", () => {
    userScrolling = chatContainer.scrollTop + chatContainer.clientHeight < chatContainer.scrollHeight;
});

async function sendMessage() {
    const userMessage = document.querySelector(".chat-window input").value.trim();
    if (!userMessage) return;

    userScrolling = true;

    try {
        document.querySelector(".chat-window input").value = "";
        document.querySelector(".chat-window .chat").insertAdjacentHTML("beforeend", `
            <div class="user">
                <p>${userMessage}</p>
            </div>
        `);
        scrollToBottom(true);

        document.querySelector(".chat-window .chat").insertAdjacentHTML("beforeend", `
            <div class="loader"></div>
        `);
        scrollToBottom();

        const chat = model.startChat(messages);
        const detectedLang = detectLanguage(userMessage);

        let result = await chat.sendMessageStream(`Réponds uniquement en ${detectedLang} : ${userMessage}`);
        document.querySelector(".chat-window .chat .loader").remove();
        document.querySelector(".chat-window .chat").insertAdjacentHTML("beforeend", `
            <div class="model">
                <p></p>
            </div>
        `);
        scrollToBottom();

        let modelMessages = "";
        let messageElement = document.querySelectorAll(".chat-window .chat div.model p");
        messageElement = messageElement[messageElement.length - 1];

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            modelMessages += chunkText;
            
            for (let i = 0; i < chunkText.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 30)); // Effet de saisie
                messageElement.insertAdjacentHTML("beforeend", chunkText[i]);
                scrollToBottom();
            }
        }

        setTimeout(() => {
            scrollToBottom(true); // Force le scroll à la fin
        }, 200);

        messages.history.push({ role: "user", parts: [{ text: userMessage }] });
        messages.history.push({ role: "model", parts: [{ text: modelMessages }] });
    } catch (error) {
        console.error("Erreur d'envoi :", error);
        document.querySelector(".chat-window .chat").insertAdjacentHTML("beforeend", `
            <div class="error">
                <p>Le message n'a pas pu être envoyé. Veuillez réessayer.</p>
            </div>
        `);
        scrollToBottom();
    }
}

document.querySelector(".chat-window .input-area button").addEventListener("click", sendMessage);
