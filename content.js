// Function to check if we're on a YouTube video page
function isYouTubeVideo() {
  return window.location.pathname === '/watch';
}

// Function to get video title
function getVideoTitle() {
  const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer');
  return titleElement ? titleElement.textContent.trim() : '';
}

// Function to wait for an element to appear
async function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

// Function to click the "More" button in description
async function expandDescription() {
  const moreButton = await waitForElement('#expand');
  if (moreButton) {
    moreButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Function to enable captions
async function enableCaptions() {
  try {
    // Click the settings button
    const settingsButton = await waitForElement('.ytp-settings-button');
    if (settingsButton) {
      settingsButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Click the subtitles/CC button
      const subtitlesButton = await waitForElement('.ytp-menuitem[aria-label*="Subtitles"]');
      if (subtitlesButton) {
        subtitlesButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));

        // Try to find and click the first available subtitle option
        const subtitleOptions = document.querySelectorAll('.ytp-menuitem[aria-label*="Subtitles"]');
        for (const option of subtitleOptions) {
          if (!option.textContent.includes('Off')) {
            option.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
          }
        }
      }
    }
  } catch (error) {
    console.log('Error enabling captions:', error);
  }
  return false;
}

// Function to get video transcript
async function getTranscript() {
  try {
    console.log('Starting transcript extraction...');
    
    // First, try to enable captions
    await enableCaptions();
    
    // Try different methods to get the transcript
    let transcript = '';

    // Method 1: Try the transcript panel
    console.log('Trying transcript panel...');
    const showTranscriptButton = await waitForElement('button[aria-label*="transcript"]');
    if (showTranscriptButton) {
      showTranscriptButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const transcriptPanel = await waitForElement('ytd-transcript-renderer');
      if (transcriptPanel) {
        const segments = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer');
        if (segments.length > 0) {
          console.log('Found transcript segments:', segments.length);
          transcript = Array.from(segments)
            .map(segment => {
              const textElement = segment.querySelector('#content');
              return textElement ? textElement.textContent.trim() : '';
            })
            .filter(text => text.length > 0)
            .join(' ');
        }
      }
    }

    // Method 2: Try the captions container
    if (!transcript) {
      console.log('Trying captions container...');
      const captionsContainer = await waitForElement('.ytp-caption-window-container');
      if (captionsContainer) {
        const captionSegments = captionsContainer.querySelectorAll('.ytp-caption-segment');
        if (captionSegments.length > 0) {
          console.log('Found caption segments:', captionSegments.length);
          transcript = Array.from(captionSegments)
            .map(segment => segment.textContent.trim())
            .filter(text => text.length > 0)
            .join(' ');
        }
      }
    }

    // Method 3: Try the description section
    if (!transcript) {
      console.log('Trying description section...');
      await expandDescription();
      
      const description = document.querySelector('#description-text');
      if (description) {
        console.log('Found description');
        transcript = description.textContent.trim();
      }
    }

    // Method 4: Try the video chapters
    if (!transcript) {
      console.log('Trying video chapters...');
      const chapters = document.querySelectorAll('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-chapters"]');
      if (chapters.length > 0) {
        transcript = Array.from(chapters)
          .map(chapter => chapter.textContent.trim())
          .filter(text => text.length > 0)
          .join(' ');
      }
    }

    // If no transcript was found through any method
    if (!transcript) {
      console.error('No transcript found through any method');
      throw new Error('No transcript found. Please make sure the video has captions or description available. If the video has captions, try enabling them in the video player settings.');
    }

    console.log('Successfully extracted transcript');
    return transcript;
  } catch (error) {
    console.error('Error getting transcript:', error);
    throw error;
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTranscript') {
    if (!isYouTubeVideo()) {
      sendResponse({ error: 'Please navigate to a YouTube video page' });
      return true;
    }

    getTranscript()
      .then(transcript => {
        sendResponse({
          success: true,
          transcript,
          title: getVideoTitle()
        });
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });

    return true; // Will respond asynchronously
  }
}); 