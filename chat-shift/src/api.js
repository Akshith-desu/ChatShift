import axios from "axios";

const API_URL = "http://localhost:5000/api/chat"; // Change when deployed

export const fetchAIResponse = async (prompt, model) => {
    try {
        const response = await axios.post(API_URL, { prompt, model });
        return response.data.response.text; // Extract AI's response text
    } catch (error) {
        console.error("❌ Error fetching response:", error);
        return "Error fetching AI response.";
    }
};
