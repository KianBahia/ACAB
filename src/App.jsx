import { useState, useEffect, useRef } from "react";
import LandingPage from "./LandingPage";
import HomeButton from "./components/HomeButton";
import ModeToggle from "./components/ModeToggle";
import titleLogo from "../public/title2.svg";
import titleLogoCute from "../public/title3.svg";
import { processTextMessage } from "./api/openjusticeApi";

function App() {
  const [hasLaunched, setHasLaunched] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]); // Chat messages array
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleGoHome = () => {
    setHasLaunched(false);
    setImage(null);
    setImagePreview(null);
    setMessage("");
    setMessages([]);
    setError(null);
    setIsLoading(false);
  };

  const panelBase = "border-4 rounded-xl p-6";
  const panelDark = "bg-black/20 border-black/30 backdrop-blur-sm";
  const panelLight = "bg-white/60 border-white/20 backdrop-blur-md shadow-sm";

  const chatBase = "w-full md:w-1/2 flex flex-col border-4 rounded-xl overflow-hidden";
  const chatPanelClasses = `${chatBase} ${isDarkMode ? panelDark : panelLight}`;
  const uploadPanelClasses = `w-full md:w-1/2 flex flex-col ${panelBase} ${isDarkMode ? panelDark : panelLight}`;

  const dashedBorderClass = isDarkMode ? "border-dashed border-black/30" : "border-dashed border-white/30";

  const userBubble = isDarkMode
    ? "max-w-[80%] rounded-lg p-3 bg-black/40 text-white"
    : "max-w-[80%] rounded-lg p-3 bg-white/90 text-black shadow-sm border border-white/10";

  const assistantBubble = isDarkMode
    ? "max-w-[80%] rounded-lg p-3 bg-black/30 text-black"
    : "max-w-[80%] rounded-lg p-3 bg-white/80 text-black shadow-sm border border-white/10";

  const textareaClass = isDarkMode
    ? "flex-1 p-3 border-4 border-black/30 rounded-lg bg-black/20 backdrop-blur-sm text-black font-inherit text-sm resize-none transition-all duration-300 focus:outline-none focus:border-black/50 focus:bg-black/30 placeholder:text-black/50"
    : "flex-1 p-3 border-4 border-white/20 rounded-lg bg-white/50 backdrop-blur-md text-black font-inherit text-sm resize-none transition-all duration-300 focus:outline-none focus:border-white/30 focus:bg-white/70 placeholder:text-black/50";

  const sendButtonClass = isDarkMode
    ? "px-6 py-3 font-bold text-white bg-black border-4 border-white rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-gray-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    : "px-6 py-3 font-bold text-black bg-white border-4 border-white/30 rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";

  if (!hasLaunched) {
    return (
      <LandingPage
        onLaunch={() => setHasLaunched(true)}
        onHome={handleGoHome}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
    );
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    // Reset file input
    const fileInput = document.getElementById("image-upload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    const currentImage = image;

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        image: currentImage ? imagePreview : null,
      },
    ]);

    // Clear input only (keep image for next message)
    setMessage("");
    // Don't clear image - it stays in the upload area until user replaces it

    setIsLoading(true);
    setError(null);

    // Add placeholder for AI response
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
        isLoading: true,
      },
    ]);

    try {
      await processTextMessage(userMessage, currentImage, (updatedResponse) => {
        // Update the last AI message as it streams
        setMessages((prev) => {
          const newMessages = [...prev];
          // Find the last assistant message and update it
          for (let i = newMessages.length - 1; i >= 0; i--) {
            if (newMessages[i].role === "assistant") {
              newMessages[i] = {
                role: "assistant",
                content: updatedResponse,
                isLoading: false,
              };
              break;
            }
          }
          return newMessages;
        });
      });
    } catch (err) {
      setError(
        err.message || "An error occurred while processing your request."
      );
      // Update the last AI message with error
      setMessages((prev) => {
        const newMessages = [...prev];
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === "assistant") {
            newMessages[i] = {
              role: "assistant",
              content: `Error: ${err.message || "An error occurred"}`,
              isLoading: false,
            };
            break;
          }
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen flex flex-col ${isDarkMode ? 'bg-[#ff4201]' : 'vichy-bg'}`}>
      <div className="pt-4 w-full max-w-6xl mx-auto px-4">
      {/* Home button and Toggle switch in top left */}
      <div className="absolute top-6 left-6 z-40 flex gap-3 items-center">
        <HomeButton onHome={handleGoHome} isDarkMode={isDarkMode} />
        <ModeToggle isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      </div>

      
        <h1 className="text-center mb-8 text-5xl md:text-6xl font-black text-black tracking-tight drop-shadow-lg">
          <img src={isDarkMode ? titleLogo : titleLogoCute} alt="title2" className="w-56 md:w-72 mx-auto select-none" draggable={false} />
        </h1>
        {isDarkMode ? (
          <p className="text-center text-black/80 mb-12 text-lg md:text-xl font-medium">
            Enter your message
          </p>
        ) : (
          <p className="text-center mb-12 text-lg md:text-xl font-bold">
            <span className="inline-block bg-white/70 backdrop-blur-md px-4 py-2 rounded-full shadow-sm text-black/90 transform transition-all hover:scale-105">
              ✦ Enter your message ✦
            </span>
          </p>
        )}

        {/* Two Column Layout */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Side: File Upload */}
          <div className={uploadPanelClasses}>
            <label
              htmlFor="image-upload"
              className="font-bold text-base text-black mb-3"
            >
              Upload Image
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <label
              htmlFor="image-upload"
              className={`flex flex-col items-center justify-center border-4 ${dashedBorderClass} rounded-lg p-8 cursor-pointer hover:border-black/50 transition-colors min-h-[200px]`}
            >
              {imagePreview ? (
                <div className="relative w-full">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full max-h-64 mx-auto rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveImage();
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="text-center text-black/60">
                  <p className="text-lg font-medium mb-2">
                    Click to upload an image
                  </p>
                  <p className="text-sm">or drag and drop</p>
                </div>
              )}
            </label>
          </div>

          {/* Right Side: Chat Interface */}
          <div
            className={chatPanelClasses}
            style={{ height: "calc(100vh - 200px)", maxHeight: "800px" }}
          >
            {/* Chat Messages Area - Fixed height with internal scrolling */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-black/60">
                  <p>Start a conversation...</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className={msg.role === "user" ? userBubble : assistantBubble}>
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="User uploaded"
                            className="max-w-full max-h-48 rounded mb-2 object-contain"
                          />
                        )}
                        <div className="whitespace-pre-wrap font-mono text-sm">
                          {msg.content || (msg.isLoading ? "..." : "")}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
              {isLoading && messages.length > 0 && (
                <div className="flex justify-start">
                  <div className={isDarkMode ? "bg-black/30 text-black rounded-lg p-3" : "bg-white/80 text-black rounded-lg p-3 shadow-sm border border-white/10"}>
                    <div className="flex gap-1">
                      <span className="animate-bounce">.</span>
                      <span
                        className="animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      >
                        .
                      </span>
                      <span
                        className="animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      >
                        .
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="mx-4 mb-2 p-3 bg-red-500/20 border-2 border-red-500 rounded-lg">
                <p className="text-red-800 font-bold text-sm">Error:</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Input Area */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t-4 border-black/30"
            >
              <div className="flex gap-2">
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className={textareaClass}
                  rows="2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  className={sendButtonClass}
                  disabled={!message.trim() || isLoading}
                >
                  {isLoading ? "..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// HomeButton moved to `src/components/HomeButton.jsx`

// ModeToggle moved to `src/components/ModeToggle.jsx`

export default App;
