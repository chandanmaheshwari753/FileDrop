import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

import {
  MessageCircle,
  X,
  Send,
  FileText,
  Image,
  Loader2,
  LogOut,
  Sparkles,
} from "lucide-react";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! I'm your AI assistant. I can help you search for files or answer general questions. What can I help you with today?",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
  const FASTAPI_URL = process.env.REACT_APP_FASTAPI_URL;

  // --- Extract keywords using Gemini ---
  const extractKeywords = async (prompt) => {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Extract keywords from this user query for searching files.
Normalize synonyms: "document" -> "file", "doc" -> "file", "picture/photo" -> "image". 
Return ONLY a JSON array of single words (no extra text).
Example: "any spiderman document" -> ["spiderman","file"]

Query: "${prompt}"`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const match = text.match(/\[.*\]/s);
      if (match) {
        text = match[0];
      }
      const keywords = JSON.parse(text);
      return keywords;
    } catch (err) {
      return [];
    }
  };

  // --- Handle Send ---
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = {
      sender: "user",
      text: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    if (sessionId) {
      await askFastAPI(input);
    } else {
      const keywords = await extractKeywords(input);
      console.log("Extracted keywords:", keywords);

      if (
        keywords.some((k) => ["file", "image", "pdf", "document"].includes(k))
      ) {
        await searchFiles(keywords);
      } else {
        await chatWithGemini(input);
      }
    }

    setInput("");
    setIsTyping(false);
  };

  // --- Search Files in Supabase ---
  const searchFiles = async (keywords) => {
    if (!keywords || keywords.length === 0) return;

    try {
      const ors = keywords
        .map(
          (word) =>
            `name.ilike.%${word}%,tags.cs.{${word}},categories.cs.{${word}}`
        )
        .join(",");

      const { data, error } = await supabase.from("files").select("*").or(ors);

      if (error) {
        console.error("Supabase search error:", error);
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "❌ Error searching files",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        return;
      }

      if (!data || data.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "No matching files found. Try different keywords or check if files are properly tagged.",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `I found ${data.length} matching file${
              data.length > 1 ? "s" : ""
            }. Click on any file below to analyze it:`,
            files: data,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    } catch (err) {
      console.error("Search threw:", err);
    }
  };

  // --- Gemini API Chat ---
  const chatWithGemini = async (prompt) => {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await res.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't generate a response.";
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Error connecting to AI service. Please try again.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  };

  // --- Ask FastAPI for Q/A ---
  const askFastAPI = async (question) => {
    try {
      const res = await fetch(`${FASTAPI_URL}/ask/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Error connecting to document analysis service. Please try again.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  };

  // --- Handle File Selection ---
  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    setMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: `📁 Processing "${file.name}"... This may take a few moments.`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    try {
      console.log("Processing file:", file.name);

      const { data, error } = await supabase.storage
        .from("uploads")
        .download(file.name);

      if (error) {
        console.error("Supabase download error:", error);
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `❌ Error downloading file: ${error.message}`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        return;
      }

      const fileExtension = file.name.toLowerCase().split(".").pop();
      let mimeType = data.type || "application/octet-stream";

      if (!data.type || data.type === "application/octet-stream") {
        switch (fileExtension) {
          case "pdf":
            mimeType = "application/pdf";
            break;
          case "jpg":
          case "jpeg":
            mimeType = "image/jpeg";
            break;
          case "png":
            mimeType = "image/png";
            break;
          case "txt":
            mimeType = "text/plain";
            break;
          default:
            mimeType = "application/octet-stream";
        }
      }

      const downloadedFile = new File([data], file.name, { type: mimeType });
      const formData = new FormData();
      formData.append("file", downloadedFile);

      const res = await fetch(`${FASTAPI_URL}/process-file/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("FastAPI error response:", errorText);
        throw new Error(`Processing failed: ${res.status}`);
      }

      const result = await res.json();
      console.log("FastAPI response:", result);

      if (result.error) {
        throw new Error(result.error);
      }

      setSessionId(result.session_id);

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `✅ Successfully processed "${file.name}"! You can now ask me specific questions about the content of this file.`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      console.error("Process file error:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `❌ Error processing file: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  };

  const exitFileMode = () => {
    setSessionId(null);
    setSelectedFile(null);
    setMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: "✅ Exited document analysis mode. I'm back to general assistance and file searching.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.toLowerCase().split(".").pop();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Help Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span className="hidden group-hover:inline-block text-sm font-medium whitespace-nowrap">
              Need help?
            </span>
          </div>
        </button>
      )}

      {/* Chatbot Interface */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Assistant</h3>
                <p className="text-xs text-purple-100">
                  {sessionId
                    ? `Analyzing: ${selectedFile?.name}`
                    : "Ready to help"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* File Mode Banner */}
          {sessionId && (
            <div className="bg-purple-50 border-b border-purple-100 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-purple-700">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Document Analysis Mode
                  </span>
                </div>
                <button
                  onClick={exitFileMode}
                  className="text-xs bg-purple-200 hover:bg-purple-300 text-purple-800 px-2 py-1 rounded-lg transition-colors"
                >
                  <LogOut className="w-3 h-3 inline mr-1" />
                  Exit
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-slate-50 via-purple-50/10 to-slate-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.sender === "user"
                      ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white"
                      : "bg-white border border-slate-200 text-slate-800 shadow-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>

                  {/* File List */}
                  {message.files && (
                    <div className="mt-3 space-y-2">
                      {message.files.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleFileSelect(file)}
                          className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-purple-200 transition-all duration-200 group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-slate-500 group-hover:text-purple-600 transition-colors">
                              {getFileIcon(file.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                Click to analyze
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs mt-2 opacity-60">{message.timestamp}</p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm text-slate-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    sessionId
                      ? "Ask about the document..."
                      : "Search files or ask anything..."
                  }
                  className="w-full p-3 pr-12 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  rows="1"
                  style={{ minHeight: "44px", maxHeight: "100px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-slate-300 disabled:to-slate-400 text-white p-2 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;
