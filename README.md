# AI Video Summarizer Chrome Extension

A Chrome extension that uses AI to generate concise summaries of YouTube video transcripts using Hugging Face's API.

## Features

- Automatically extracts transcripts from YouTube videos
- Generates AI-powered summaries using Hugging Face's BART model
- Clean and minimalist user interface
- Real-time status updates
- Error handling and user feedback

## Setup Instructions

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. Get an API key from [Hugging Face](https://huggingface.co/settings/tokens)
6. Open the extension popup and enter your Hugging Face API key

## Usage

1. Navigate to any YouTube video
2. Click the extension icon in your Chrome toolbar
3. Click the "Generate Summary" button
4. Wait for the summary to be generated
5. Read the AI-generated summary of the video transcript

## Requirements

- Chrome browser
- Hugging Face API key
- YouTube video with available transcripts

## Note

This extension requires an active internet connection and a valid Hugging Face API key to function. The API key is used to generate summaries using Hugging Face's BART model.

## Privacy

- The extension only processes transcripts from the current YouTube video
- No data is stored locally or sent to any servers except Hugging Face's API
- Your Hugging Face API key is only used for generating summaries
