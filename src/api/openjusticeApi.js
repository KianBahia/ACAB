/**
 * OpenJustice API Client
 * Handles all API interactions with the OpenJustice service
 *
 * Based on the example from OpenJustice API documentation
 */

/**
 * Get API configuration from environment variables
 * All API-related configuration is stored in .env file
 */
export function getApiConfig() {
  const apiKey = import.meta.env.VITE_OPENJUSTICE_API_KEY;
  const apiUrl =
    import.meta.env.VITE_OPENJUSTICE_API_URL ||
    "https://api.staging.openjustice.ai";
  const dialogFlowId = import.meta.env.VITE_DIALOG_FLOW_ID;
  const conversationId = import.meta.env.VITE_CONVERSATION_ID;

  if (!apiKey) {
    throw new Error("API key not found. Please check your .env file.");
  }

  if (!dialogFlowId) {
    throw new Error(
      "Dialog flow ID not found. Please set VITE_DIALOG_FLOW_ID in your .env file."
    );
  }

  if (!conversationId) {
    throw new Error(
      "Conversation ID not found. Please set VITE_CONVERSATION_ID in your .env file."
    );
  }

  return { apiKey, apiUrl, dialogFlowId, conversationId };
}

/**
 * Upload a file to OpenJustice
 * @param {File} file - The file to upload
 * @param {string} apiKey - API key for authentication
 * @param {string} apiUrl - Base API URL
 * @returns {Promise<{resourceId: string, fileName: string}>}
 */
export async function uploadFile(file, apiKey, apiUrl) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiUrl}/conversation/resources/upload-file`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
  }

  const result = await response.json();

  if (!result.ok || !result.resourceId) {
    throw new Error("Failed to upload file: Invalid response");
  }

  return {
    resourceId: result.resourceId,
    fileName: result.fileName,
  };
}

/**
 * Send a message to the conversation
 * @param {string} message - The message to send
 * @param {string} apiKey - API key for authentication
 * @param {string} apiUrl - Base API URL
 * @param {string} conversationId - Conversation ID
 * @param {Array|null} uploadedFiles - Optional array of uploaded file resources [{id, name}]
 * @returns {Promise<string>} The conversation ID
 */
async function sendMessage(
  message,
  apiKey,
  apiUrl,
  conversationId,
  uploadedFiles = null
) {
  const messagePayload = {
    conversationId: conversationId,
    title: null,
    prompt: null,
    messages: [
      {
        role: "user",
        content: message,
        model: "gpt-4o-mini-2024-07-18",
        ...(uploadedFiles &&
          uploadedFiles.length > 0 && {
            metadata: {
              resources: uploadedFiles,
            },
          }),
      },
    ],
  };

  const response = await fetch(`${apiUrl}/conversation/send-message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messagePayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send message: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.conversationId;
}

/**
 * Parse status line from format: ━━━━━━ TYPE: Title (Status) ━━━━━━
 * Returns { type, title, status } or null if not a status line
 */
function parseStatusLine(text) {
  const statusLineRegex = /━━━━━━\s+(.+?)\s+━━━━━━/;
  const match = text.match(statusLineRegex);
  if (!match) return null;

  const content = match[1];
  // Parse format like "SWITCH: Switch (Deciding)" or "OUTCOME: Legal reasoning (Finished)"
  const parts = content.split(":");
  if (parts.length < 2) return null;

  const type = parts[0].trim();
  const rest = parts.slice(1).join(":").trim();

  // Extract title and status from "(Status)" if present
  const statusMatch = rest.match(/^(.+?)\s*\((.+?)\)$/);
  if (statusMatch) {
    return {
      type,
      
      title: statusMatch[1].trim(),
      status: statusMatch[2].trim(),
    };
  }

  return {
    type,
    title: rest,
    status: null,
  };
}

/**
 * Process Server-Sent Events from the stream
 * Based on the example implementation
 * @param {string} eventText - The raw SSE event text
 * @param {Object} fullResponse - The response object being built
 * @param {Function} onUpdate - Callback to update the response (receives { content, status })
 */
function processEvent(eventText, fullResponse, onUpdate) {
  const lines = eventText.split("\n").filter((line) => line.trim());
  let eventType = "message"; // Default SSE event type
  let data = "";

  // Parse SSE format: event: <type> and data: <content>
  const dataLines = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("event:")) {
      eventType = trimmedLine.substring(6).trim();
    } else if (trimmedLine.startsWith("data:")) {
      // Handle multi-line data (SSE allows data: on multiple lines)
      const dataContent = trimmedLine.substring(5);
      dataLines.push(dataContent);
    }
  }

  // Join multiple data lines with newline (SSE spec)
  data = dataLines.join("\n");

  if (!data) return;

  try {
    const parsed = JSON.parse(data);

    switch (eventType) {
      case "message":
        if (parsed.text) {
          const text = parsed.text;

          // Check each line for status indicators
          const lines = text.split("\n");
          let hasStatusLine = false;
          let contentToAdd = "";

          for (const line of lines) {
            const statusInfo = parseStatusLine(line);
            if (statusInfo) {
              hasStatusLine = true;
              // Update status indicator
              fullResponse.currentStatus = statusInfo;

              // If this is an OUTCOME with status "Finished", start accumulating content
              if (
                statusInfo.type === "OUTCOME" &&
                statusInfo.status === "Finished"
              ) {
                fullResponse.shouldAccumulate = true;
                fullResponse.currentStatus = null; // Clear status when we start showing content
              } else {
                // For other status lines, just update the status indicator
                fullResponse.shouldAccumulate = false;
              }
            } else {
              // Not a status line - accumulate if we should
              if (fullResponse.shouldAccumulate) {
                contentToAdd += line + "\n";
              }
            }
          }

          // If we found a status line, update status
          if (hasStatusLine) {
            onUpdate({
              content: fullResponse.outputText,
              status: fullResponse.currentStatus,
            });
          }

          // If we should accumulate content, add it
          if (fullResponse.shouldAccumulate && contentToAdd) {
            fullResponse.outputText += contentToAdd;
            onUpdate({
              content: fullResponse.outputText,
              status: null, // Clear status when showing content
            });
          } else if (!hasStatusLine && fullResponse.shouldAccumulate) {
            // If we're accumulating but no status line, add all text
            fullResponse.outputText += text;
            onUpdate({
              content: fullResponse.outputText,
              status: null,
            });
          } else if (!hasStatusLine && fullResponse.awaitingInput) {
            // If we're awaiting input, accumulate all content (even if we haven't seen OUTCOME Finished)
            // This ensures questions/context from the API are displayed
            fullResponse.outputText += text;
            onUpdate({
              content: fullResponse.outputText,
              status: null,
            });
          } else if (!hasStatusLine) {
            // No status line and not accumulating - just update with current status
            onUpdate({
              content: fullResponse.outputText,
              status: fullResponse.currentStatus,
            });
          }
        }
        break;

      case "node-result": {
        const node = parsed;
        // For running nodes, update status
        if (node.status === "running") {
          const description = node.description || "in progress";
          fullResponse.currentStatus = {
            type: node.nodeType?.toUpperCase() || "PROCESSING",
            title: node.title || "Processing",
            status: description,
          };
          fullResponse.shouldAccumulate = false;
          onUpdate({
            content: fullResponse.outputText,
            status: fullResponse.currentStatus,
          });
          break;
        }

        // For completed outcome nodes, start accumulating
        if (node.status === "completed" && node.nodeType === "outcome") {
          fullResponse.shouldAccumulate = true;
          fullResponse.currentStatus = null;
          // Don't add node data to output - wait for actual content
          onUpdate({
            content: fullResponse.outputText,
            status: null,
          });
          break;
        }

        // For other completed nodes, just update status
        if (node.status === "completed") {
          fullResponse.shouldAccumulate = false;
          fullResponse.currentStatus = {
            type: node.nodeType?.toUpperCase() || "COMPLETED",
            title: node.title || "Completed",
            status: "completed",
          };
          onUpdate({
            content: fullResponse.outputText,
            status: fullResponse.currentStatus,
          });
        }
        break;
      }

      case "awaiting-user-input": {
        const input = parsed;
        // When awaiting input, we should show all content accumulated so far
        // This includes any questions or context the API provided
        fullResponse.executionId = input.executionId; // Store execution ID for resuming
        fullResponse.complete = true;
        fullResponse.awaitingInput = true; // Flag to indicate we're waiting for user input
        fullResponse.currentStatus = null;

        // When awaiting input, start accumulating all content from now on
        // This ensures any follow-up messages/questions are captured
        fullResponse.shouldAccumulate = true;

        // If there's a message/question in the input event itself, add it
        if (input.message || input.question || input.prompt) {
          const questionText = input.message || input.question || input.prompt;
          if (questionText && !fullResponse.outputText.includes(questionText)) {
            fullResponse.outputText +=
              (fullResponse.outputText.trim() ? "\n\n" : "") + questionText;
          }
        }

        // Store the question/message for display if available
        fullResponse.awaitingInputMessage =
          input.message || input.question || input.prompt || null;

        // When awaiting input, ensure we show all content (even if we haven't seen OUTCOME Finished)
        // This ensures the user sees what information is needed
        if (!fullResponse.outputText.trim()) {
          // If no content was accumulated, try to get it from the last message event
          // This is a fallback in case content wasn't accumulated properly
          console.warn(
            "No content accumulated when awaiting user input. The API question may not be visible."
          );
        }

        // Final update with all accumulated content (this should include the question/context)
        onUpdate({
          content: fullResponse.outputText,
          status: null,
        });
        break;
      }

      default:
        // Log unhandled events for debugging
        console.log(`Unhandled event type: ${eventType}`, parsed);
    }
  } catch (error) {
    // Silently ignore parse errors for simplicity
    console.debug("Could not parse SSE event:", error);
  }
}

/**
 * Stream the dialog flow execution
 * Based on the example implementation
 * @param {string} conversationId - The conversation ID (required for new execution)
 * @param {string} apiKey - API key for authentication
 * @param {string} apiUrl - Base API URL
 * @param {string|null} dialogFlowId - Dialog flow ID (required for new execution, not needed for resume)
 * @param {string|null} executionId - Execution ID (required for resume, not needed for new execution)
 * @param {Function} onUpdate - Callback to update the response as it streams
 * @returns {Promise<Object>} The complete response object
 */
async function startStream(
  conversationId,
  apiKey,
  apiUrl,
  dialogFlowId,
  executionId,
  onUpdate
) {
  let url;

  // If we have an executionId, resume the existing execution
  if (executionId) {
    url = `${apiUrl}/nap/stream?executionId=${encodeURIComponent(executionId)}`;
    console.log("Resuming stream with executionId:", executionId);
    console.log("Stream URL:", url);
  } else {
    // Otherwise, start a new execution (requires dialogFlowId and conversationId)
    if (!dialogFlowId) {
      throw new Error(
        "dialogFlowId is required for new execution. Please set VITE_DIALOG_FLOW_ID in your .env file.\n" +
          "You can find your dialogFlowId in the OpenJustice dashboard where you created the API key."
      );
    }
    if (!conversationId) {
      throw new Error(
        "conversationId is required for new execution. Please set VITE_CONVERSATION_ID in your .env file."
      );
    }

    url = `${apiUrl}/nap/stream?dialogFlowId=${encodeURIComponent(
      dialogFlowId
    )}&conversationId=${encodeURIComponent(conversationId)}`;

    console.log("Starting new stream for conversation:", conversationId);
    console.log("Using dialogFlowId:", dialogFlowId);
    console.log("Stream URL:", url);
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/event-stream",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP ${response.status}: ${errorText}`);
      throw new Error(
        `Failed to start stream: ${response.status} ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const fullResponse = {
      success: true,
      conversationId: conversationId,
      executionId: executionId || null,
      outputText: "",
      complete: false,
      awaitingInput: false,
      currentStatus: null, // Current processing status (e.g., "Thinking", "Gathering facts")
      shouldAccumulate: false, // Whether to accumulate content (only after OUTCOME Finished)
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    console.log("Reading stream...");

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (buffer.trim()) processEvent(buffer, fullResponse, onUpdate);
        fullResponse.complete = true;
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const eventText of events) {
        if (eventText.trim()) {
          processEvent(eventText, fullResponse, onUpdate);
        }
      }
    }

    console.log("Stream completed");
    return fullResponse;
  } catch (error) {
    console.error(
      `Stream error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    throw error;
  }
}

/**
 * Process a text message through the OpenJustice API
 * Main function that sends a message and streams the response
 *
 * @param {string} message - User's text message
 * @param {File|null} image - Optional image file to upload and attach
 * @param {Function} onUpdate - Callback to update the response as it streams (receives text string)
 * @param {string|null} executionId - Optional execution ID to resume an existing conversation
 * @returns {Promise<Object>} The complete response
 */
export async function processTextMessage(
  message,
  image = null,
  onUpdate,
  executionId = null
) {
  const { apiKey, apiUrl, dialogFlowId, conversationId } = getApiConfig();

  // If we have an executionId, we're resuming a conversation
  // First, send the user's response message, then resume the stream
  if (executionId) {
    console.log("Resuming conversation with executionId:", executionId);

    // Step 1: Upload image if provided
    let uploadedFiles = null;
    if (image) {
      console.log("Uploading image file...");
      try {
        const uploadedFile = await uploadFile(image, apiKey, apiUrl);
        console.log("Image uploaded:", uploadedFile);
        uploadedFiles = [
          {
            id: uploadedFile.resourceId,
            name: uploadedFile.fileName,
          },
        ];
      } catch (error) {
        console.error("Failed to upload image:", error);
        throw error;
      }
    }

    // Step 2: Send the user's response message
    console.log(
      `Sending response message to conversation ${conversationId}...`
    );
    let returnedConversationId;
    try {
      returnedConversationId = await sendMessage(
        message,
        apiKey,
        apiUrl,
        conversationId,
        uploadedFiles
      );
      console.log(
        "Response message sent. Conversation ID:",
        returnedConversationId
      );
    } catch (error) {
      console.error("Failed to send response message:", error);
      throw error;
    }

    // Step 3: Resume the stream with the executionId
    console.log("Resuming stream with executionId...");
    const fullResponse = await startStream(
      returnedConversationId,
      apiKey,
      apiUrl,
      dialogFlowId,
      executionId,
      onUpdate
    );

    fullResponse.message = message;
    if (uploadedFiles) {
      fullResponse.uploadedFile = uploadedFiles[0];
    }
    return fullResponse;
  }

  // Step 1: Upload image if provided
  let uploadedFiles = null;
  if (image) {
    console.log("Uploading image file...");
    try {
      const uploadedFile = await uploadFile(image, apiKey, apiUrl);
      console.log("Image uploaded:", uploadedFile);
      uploadedFiles = [
        {
          id: uploadedFile.resourceId,
          name: uploadedFile.fileName,
        },
      ];
    } catch (error) {
      console.error("Failed to upload image:", error);
      throw error;
    }
  }

  // Step 2: Send message to the conversation (with image if provided)
  console.log(`Sending message to conversation ${conversationId}...`);
  let returnedConversationId;
  try {
    returnedConversationId = await sendMessage(
      message,
      apiKey,
      apiUrl,
      conversationId,
      uploadedFiles
    );
    console.log("Message sent. Conversation ID:", returnedConversationId);
  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }

  // Step 3: Start streaming the response
  console.log("Starting stream...");
  const fullResponse = await startStream(
    returnedConversationId,
    apiKey,
    apiUrl,
    dialogFlowId,
    null, // No executionId for new conversation
    onUpdate
  );

  fullResponse.message = message;
  if (uploadedFiles) {
    fullResponse.uploadedFile = uploadedFiles[0];
  }
  return fullResponse;
}
