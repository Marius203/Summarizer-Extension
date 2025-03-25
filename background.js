// The API key should be injected during the build process
// To set this up:
// 1. Create a .env file with your API key: OPENAI_API_KEY=your_key_here
// 2. Use a build tool (like webpack) to inject the environment variables
// 3. Never commit the actual .env file to version control
const API_URL = 'https://api-inference.huggingface.co/models/philschmid/bart-large-cnn-samsum';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Function to generate summary using Hugging Face API with retries
async function generateSummary(transcript) {
  let lastError;
  
  // Get API key from storage
  const { huggingfaceApiKey } = await chrome.storage.sync.get(['huggingfaceApiKey']);
  if (!huggingfaceApiKey) {
    throw new Error('API key not found. Please enter your Hugging Face API key in the extension popup.');
  }
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Truncate transcript if too long (Hugging Face has token limits)
      const truncatedTranscript = transcript.length > 1024
        ? transcript.substring(0, 1024) + '...'
        : transcript;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${huggingfaceApiKey}`
        },
        body: JSON.stringify({
          inputs: truncatedTranscript,
          parameters: {
            max_length: 500,
            min_length: 100,
            do_sample: false
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data[0]?.summary_text) {
        throw new Error('Invalid response format from Hugging Face API');
      }

      return data[0].summary_text;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
    }
  }
  
  throw lastError || new Error('Failed to generate summary after multiple attempts');
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateSummary') {
    generateSummary(request.transcript)
      .then(summary => {
        sendResponse({ success: true, summary });
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error.message || 'Failed to generate summary. Please try again.'
        });
      });

    return true; // Will respond asynchronously
  }

  // Handle API key storage
  if (request.action === 'saveApiKey') {
    chrome.storage.sync.set({ huggingfaceApiKey: request.apiKey })
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Handle API key retrieval
  if (request.action === 'getApiKey') {
    chrome.storage.sync.get(['huggingfaceApiKey'])
      .then(result => sendResponse({ success: true, apiKey: result.huggingfaceApiKey }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
}); 

