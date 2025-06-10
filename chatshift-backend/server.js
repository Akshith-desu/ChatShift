require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync('./firebaseConfig.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.post('/api/chat', async (req, res) => {
    const { prompt, model } = req.body;

    if (!prompt || !model) {
        return res.status(400).json({ error: "Prompt and model are required" });
    }

    let apiUrl, apiKey, requestData;
    let headers = { "Content-Type": "application/json" };

    console.log(`🔍 Received request for model: ${model} with prompt: ${prompt}`);

    try {
        let responseData;
        if (model === "Falcon-7B-Instruct") {
            apiUrl = "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct";
            apiKey = process.env.HUGGINGFACE_API_KEY;
            if (!apiKey) return res.status(500).json({ error: "Missing HUGGINGFACE_API_KEY" });
            requestData = { inputs: prompt, parameters: { max_new_tokens: 500 } };
            headers["Authorization"] = `Bearer ${apiKey}`;
            const response = await axios.post(apiUrl, requestData, { headers });
            responseData = response.data?.[0]?.generated_text || "No response from Falcon";
        } else if (model === "Gemini") {
            apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            requestData = { contents: [{ parts: [{ text: prompt }] }] };
            const response = await axios.post(apiUrl, requestData, { headers });
            responseData = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
        } else if (model === "Mistral") {
            apiUrl = "https://api.mistral.ai/v1/chat/completions";
            apiKey = process.env.MISTRAL_API_KEY;
            if (!apiKey) return res.status(500).json({ error: "Missing MISTRAL_API_KEY" });
            requestData = { model: "mistral-medium", messages: [{ role: "user", content: prompt }], max_tokens: 500 };
            headers["Authorization"] = `Bearer ${apiKey}`;
            const response = await axios.post(apiUrl, requestData, { headers });
            responseData = response.data?.choices?.[0]?.message?.content || "No response from Mistral";
        } else {
            return res.status(400).json({ error: "Invalid model selection" });
        }

        // Store chat in Firebase Firestore
        await db.collection('chats').add({
            prompt,
            model,
            response: responseData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.json({ response: { text: responseData, model, raw: responseData } });
    } catch (error) {
        console.error("❌ Error fetching AI response:", error);
        // Send back a more useful error message
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            "Unknown server error";
        return res.status(500).json({ error: errorMessage });
    }
});

// Test route to check if the server is running
app.get("/", (req, res) => {
    res.send("✅ Server is running! Use POST /api/chat to send requests.");
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});