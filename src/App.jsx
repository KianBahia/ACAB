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
  const [pendingExecutionId, setPendingExecutionId] = useState(null); // Track execution ID for resuming
  const [currentStatus, setCurrentStatus] = useState(null); // Track current processing status
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
    setPendingExecutionId(null); // Clear execution ID when going home
  };

  const panelBase = "border-4 rounded-xl p-6";
  const panelDark = "bg-black/20 border-black/30 backdrop-blur-sm";
  const panelLight = "bg-white/60 border-white/20 backdrop-blur-md shadow-sm";

  const chatBase =
    "w-full md:w-1/2 flex flex-col border-4 rounded-xl overflow-hidden";
  const chatPanelClasses = `${chatBase} ${isDarkMode ? panelDark : panelLight}`;
  const uploadPanelClasses = `w-full md:w-1/2 flex flex-col ${panelBase} ${
    isDarkMode ? panelDark : panelLight
  }`;

  const dashedBorderClass = isDarkMode
    ? "border-dashed border-black/30"
    : "border-dashed border-white/30";

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

  const handleDownloadPDF = async () => {
    try {
      // Find the last assistant message (the final response)
      const lastAssistantMessage = [...messages]
        .reverse()
        .find((msg) => msg.role === "assistant" && msg.content);

      if (!lastAssistantMessage || !lastAssistantMessage.content) {
        setError("No message content available to download");
        return;
      }

      setIsLoading(true);
      setError(null);

      // Prepare data for PDF generation
      const pdfData = {
        imageData: imagePreview || null, // Base64 image data (optional)
        message: lastAssistantMessage.content,
        fileName: `hackab-document-${
          new Date().toISOString().split("T")[0]
        }.pdf`,
      };

      // Call server endpoint to generate and sign PDF
      const serverUrl = import.meta.env.VITE_PDF_SERVER_URL || "http://localhost:3000";
      const response = await fetch(`${serverUrl}/api/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pdfData),
      }).catch((fetchError) => {
        // Handle network errors (server not running, CORS, etc.)
        if (fetchError.name === "TypeError" && fetchError.message.includes("fetch")) {
          throw new Error(
            "Cannot connect to PDF server. Please make sure the server is running on port 3000. Run 'npm run server' in a separate terminal."
          );
        }
        throw fetchError;
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          } catch (e2) {
            // Ignore
          }
        }
        throw new Error(errorMessage);
      }

      // Get PDF blob
      const blob = await response.blob();

      // Verify we got a PDF
      if (blob.type !== "application/pdf" && blob.size === 0) {
        throw new Error("Server did not return a valid PDF file");
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfData.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setIsLoading(false);
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError(
        err.message ||
          "Failed to generate PDF. Make sure the server is running on port 3000. Run 'npm run server' in a separate terminal."
      );
      setIsLoading(false);
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
    setCurrentStatus(null); // Clear any previous status

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
      // Use pendingExecutionId if available (for resuming conversations)
      const executionIdToUse = pendingExecutionId;

      // Clear the pending execution ID since we're using it now
      if (executionIdToUse) {
        setPendingExecutionId(null);
      }

      const response = await processTextMessage(
        userMessage,
        currentImage,
        (updatedResponse) => {
          // updatedResponse is now an object with { content, status }
          const { content, status } = updatedResponse;

          // Update status indicator
          setCurrentStatus(status);

          // Update the last AI message as it streams
          setMessages((prev) => {
            const newMessages = [...prev];
            // Find the last assistant message and update it
            for (let i = newMessages.length - 1; i >= 0; i--) {
              if (newMessages[i].role === "assistant") {
                newMessages[i] = {
                  role: "assistant",
                  content: content || "",
                  isLoading: false,
                };
                break;
              }
            }
            return newMessages;
          });
        },
        executionIdToUse // Pass execution ID to resume conversation if available
      );

      // If the response includes an executionId (API is awaiting more input), store it
      if (response.executionId && response.awaitingInput) {
        setPendingExecutionId(response.executionId);
        console.log("Stored execution ID for resuming:", response.executionId);
        // The content should already be in the last assistant message
        // Make sure it's visible by ensuring the message is updated
      } else if (response.executionId) {
        // If we got an executionId but not awaiting input, clear any pending one
        // (execution completed)
        setPendingExecutionId(null);
      }
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
      setCurrentStatus(null); // Clear status when done
    }
  };

  return (
    <div
      className={`relative min-h-screen flex flex-col ${
        isDarkMode ? "bg-[#ff4201]" : "vichy-bg"
      }`}
    >
      <div className="pt-4 w-full max-w-6xl mx-auto px-4">
        {/* Home button and Toggle switch in top left */}
        <div className="absolute top-6 left-6 z-40 flex gap-3 items-center">
          <HomeButton onHome={handleGoHome} isDarkMode={isDarkMode} />
          <ModeToggle isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        </div>

        <h1 className="text-center mb-8 text-5xl md:text-6xl font-black text-black tracking-tight drop-shadow-lg">
          <img
            src={isDarkMode ? titleLogo : titleLogoCute}
            alt="title2"
            className="w-56 md:w-72 mx-auto select-none"
            draggable={false}
          />
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
                <div className="flex items-center justify-center h-full">
                  <div
                    className={`max-w-md p-6 rounded-lg ${
                      isDarkMode
                        ? "bg-black/30 text-black/90 border-2 border-black/20"
                        : "bg-white/70 text-black/90 border-2 border-white/30 shadow-sm"
                    }`}
                  >
                    <p className="font-bold text-lg mb-4 text-center">
                      Start a conversation...
                    </p>
                    <div className="text-sm space-y-2">
                      <p className="font-semibold mb-2">
                        When describing your situation, please include:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>
                          <strong>People in the photo:</strong> Who is involved,
                          their roles, and any identifying features
                        </li>
                        <li>
                          <strong>Location:</strong> Where the event took place
                          (address, building, area, etc.)
                        </li>
                        <li>
                          <strong>Behavior:</strong> What actions or behaviors
                          are occurring
                        </li>
                        <li>
                          <strong>Harming event:</strong> What specific harmful
                          incident or event happened
                        </li>
                        <li>
                          <strong>Effect of the event:</strong> What impact or
                          consequences resulted
                        </li>
                        <li>
                          <strong>Time context:</strong> When this occurred
                          (date, time, duration)
                        </li>
                        <li>
                          <strong>General surroundings:</strong> The
                          environment, setting, and context of the situation
                        </li>
                      </ul>
                      <p className="text-xs mt-3 italic text-center">
                        Be as detailed as possible to help us understand your
                        situation.
                      </p>
                    </div>
                  </div>
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
                      <div
                        className={
                          msg.role === "user" ? userBubble : assistantBubble
                        }
                      >
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
              {/* Status indicator - shows current processing step */}
              {currentStatus && (
                <div className="flex justify-start">
                  <div className="text-sm font-medium italic">
                    <span
                      className="text-[#8B0000] dark:text-[#8B0000]"
                      style={{
                        textShadow:
                          "0 0 8px rgba(139, 0, 0, 0.8), 0 0 12px rgba(139, 0, 0, 0.6), 0 0 16px rgba(139, 0, 0, 0.4)",
                        animation: "pulse 2s ease-in-out infinite",
                      }}
                    >
                      {currentStatus.type}: {currentStatus.title}
                      {currentStatus.status && ` (${currentStatus.status})`}
                    </span>
                  </div>
                </div>
              )}

              {isLoading && messages.length > 0 && !currentStatus && (
                <div className="flex justify-start">
                  <div
                    className={
                      isDarkMode
                        ? "bg-black/30 text-black rounded-lg p-3"
                        : "bg-white/80 text-black rounded-lg p-3 shadow-sm border border-white/10"
                    }
                  >
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

            {/* Awaiting input indicator */}
            {pendingExecutionId && !isLoading && (
              <div className="mx-4 mb-2 p-3 bg-blue-500/20 border-2 border-blue-500 rounded-lg">
                <p className="text-blue-800 font-bold text-sm">
                  ⏳ Waiting for your response...
                </p>
                <p className="text-blue-700 text-xs">
                  Please provide the requested information above. Type your
                  reply below to continue.
                </p>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="mx-4 mb-2 p-3 bg-red-500/20 border-2 border-red-500 rounded-lg">
                <p className="text-red-800 font-bold text-sm">Error:</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Download PDF button - show when there's a final assistant message */}
            {messages.some(
              (msg) => msg.role === "assistant" && msg.content && !msg.isLoading
            ) &&
              !isLoading &&
              !pendingExecutionId && (
                <div className="mx-4 mb-2 flex justify-center">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isLoading}
                    className={`px-6 py-3 font-bold rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDarkMode
                        ? "bg-red-600 text-white border-2 border-red-700 hover:bg-red-700"
                        : "bg-red-500 text-white border-2 border-red-600 hover:bg-red-600 shadow-sm"
                    }`}
                  >
                    📄 Download Signed PDF
                  </button>
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
