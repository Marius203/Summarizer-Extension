document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const summarizeBtn = document.getElementById('summarize-btn');
  const statusDiv = document.getElementById('status');
  const summaryContent = document.getElementById('summary-content');
  const loadingSpinner = document.getElementById('loading');
  const errorModal = document.getElementById('error-modal');
  const errorMessage = document.getElementById('error-message');
  const closeModalBtn = document.querySelector('.close-modal');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const apiKeyStatus = document.getElementById('api-key-status');

  // Check for existing API key on load
  chrome.runtime.sendMessage({ action: 'getApiKey' }, (response) => {
    if (response.success && response.apiKey) {
      apiKeyStatus.textContent = 'API key is saved';
      apiKeyStatus.className = 'status success';
      apiKeyInput.value = response.apiKey;
    }
  });

  // Function to show error modal
  function showError(message) {
    errorMessage.textContent = message;
    errorModal.style.display = 'flex';
  }

  // Function to hide error modal
  function hideError() {
    errorModal.style.display = 'none';
  }

  // Function to update status message
  function updateStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${isError ? 'error' : 'success'}`;
  }

  // Function to show/hide loading spinner
  function toggleLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
    summarizeBtn.disabled = show;
  }

  // Function to get the active tab
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab found');
    }
    return tab;
  }

  // Function to check if we're on a YouTube video page
  async function isYouTubeVideo(tab) {
    return tab.url && tab.url.includes('youtube.com/watch');
  }

  // Function to generate summary
  async function generateSummary() {
    try {
      // Check if API key exists
      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'getApiKey' }, resolve);
      });
      
      if (!response.success || !response.apiKey) {
        throw new Error('Please enter and save your Hugging Face API key first');
      }

      toggleLoading(true);
      updateStatus('Checking video page...');

      const tab = await getActiveTab();
      
      if (!await isYouTubeVideo(tab)) {
        throw new Error('Please navigate to a YouTube video page');
      }

      updateStatus('Getting transcript...');
      
      // Inject content script if not already injected
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (error) {
        // Script might already be injected, continue
        console.log('Script injection status:', error.message);
      }

      const transcriptResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getTranscript' });

      if (!transcriptResponse || !transcriptResponse.success) {
        throw new Error(transcriptResponse?.error || 'Failed to get transcript');
      }

      updateStatus('Generating summary...');
      
      const summaryResponse = await chrome.runtime.sendMessage({
        action: 'generateSummary',
        transcript: transcriptResponse.transcript
      });

      if (!summaryResponse.success) {
        throw new Error(summaryResponse.error);
      }

      summaryContent.innerHTML = summaryResponse.summary.replace(/\n/g, '<br>');
      updateStatus('Summary generated successfully!');
    } catch (error) {
      console.error('Error:', error);
      showError(error.message);
      updateStatus('', true);
      summaryContent.innerHTML = '';
    } finally {
      toggleLoading(false);
    }
  }

  // Event Listeners
  summarizeBtn.addEventListener('click', generateSummary);
  closeModalBtn.addEventListener('click', hideError);
  errorModal.addEventListener('click', (e) => {
    if (e.target === errorModal) hideError();
  });

  // Save API key
  saveApiKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      apiKeyStatus.textContent = 'Please enter an API key';
      apiKeyStatus.className = 'status error';
      return;
    }

    try {
      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage({ 
          action: 'saveApiKey',
          apiKey: apiKey
        }, resolve);
      });

      if (response.success) {
        apiKeyStatus.textContent = 'API key saved successfully';
        apiKeyStatus.className = 'status success';
      } else {
        throw new Error(response.error || 'Failed to save API key');
      }
    } catch (error) {
      apiKeyStatus.textContent = 'Failed to save API key';
      apiKeyStatus.className = 'status error';
    }
  });
}); 