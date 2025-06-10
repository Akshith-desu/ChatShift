import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Sun, Moon, Mic, Loader2 } from "lucide-react";
import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs } from "firebase/firestore";
import "./ChatShift.css";

export default function ChatShift() {
  const [darkMode, setDarkMode] = useState(false);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("Gemini");
  const [history, setHistory] = useState({
    "Falcon-7B-Instruct": [],
    "Gemini": [],
    "Mistral": [],
  });
  const [latestResponse, setLatestResponse] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef(null);

  // Fetch chat history from Firebase
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, `chats/${model}/messages`));
        const chatData = querySnapshot.docs.map(doc => doc.data());
        setHistory(prevHistory => ({
          ...prevHistory,
          [model]: chatData
        }));
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };
    fetchHistory();
  }, [model]);

  // Speech recognition setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error("Speech recognition not supported in this browser");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onresult = (event) => setInput(prev => prev + " " + event.results[0][0].transcript);
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser");
      return;
    }
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, model }),
      });

      const data = await response.json();
      if (response.ok) {
        const newEntry = { input, output: data.response.text };

        // Update local state
        setHistory(prevHistory => ({
          ...prevHistory,
          [model]: [...prevHistory[model], newEntry]
        }));
        setLatestResponse(newEntry);

        // Store in Firestore
        await addDoc(collection(db, `chats/${model}/messages`), newEntry);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      //alert("Failed to get a response from the server.");
    } finally {
      setIsLoading(false);
    }

    setInput("");
  };

  return (
    <div className={`app-container ${darkMode ? "dark-mode" : "light-mode"}`}>
      {/* Sidebar for Chat History */}
      <div className={`sidebar ${darkMode ? "sidebar-dark" : "sidebar-light"}`}>
        <h2 className="sidebar-title">Chat History</h2>
        {history[model].length === 0 ? (
          <p className="no-history">No conversations yet</p>
        ) : (
          <ul className="history-list">
            {history[model].map((item, index) => (
              <li key={index} className="history-item">
                <p><strong>You:</strong> {item.input}</p>
                <div className="ai-response">
                  <ReactMarkdown>{item.output}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="main-content">
        <div className="chat-container">
          <div className="header">
            <h1 className="app-title">ChatShift</h1>
            <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="chat-box">
            <div className="input-container">
              <Mic 
                size={24} 
                className={`mic-icon ${isListening ? 'mic-active' : ''}`} 
                onClick={toggleListening}
              />
              <textarea
                className={`text-input ${darkMode ? "dark-input" : ""}`}
                rows="3"
                placeholder="Type your message here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <div className="control-bar">
              <select
                className={`model-select ${darkMode ? "dark-select" : ""}`}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="Falcon-7B-Instruct">Falcon-7B-Instruct</option>
                <option value="Gemini">Gemini</option>
                <option value="Mistral">Mistral</option>
              </select>
              <button 
                className="generate-button" 
                onClick={handleGenerate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="loading-spinner" size={20} /> Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Output area (Only latest response for selected model) */}
        <div className={`output-area ${darkMode ? "output-dark" : "output-light"}`}>
          {latestResponse ? (
            <div className="message">
              <p><strong>You:</strong> {latestResponse.input}</p>
              <div className="ai-response">
                <ReactMarkdown>{latestResponse.output}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <p>No response yet. Start by entering a prompt above!</p>
          )}
        </div>
      </div>
    </div>
  );
}
