// public/script.ts
// Function to get a query parameter by name
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
// Assumes that the Socket.io client library is loaded via a <script> tag in index.html
const socket = io();

const input = document.getElementById('input');
const output = document.getElementById('output');
let isTyping = false;
let uid = null;
let name = null;

window.addEventListener('load', () => {
  token = getQueryParam('dream');
  if (token) {
    try {
      const payload = jwt_decode(token);
      console.log(payload);

      uid = payload.uid;
      name = payload.name;

      socket.emit('identify', payload);
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  } else {
    console.warn('No token found in the URL.');
  }
});


// We'll store a reference to the blinking cursor element.
let blinkingCursor = null;

// Helper function: add a blinking cursor to a container if it doesn't already exist.
function addBlinkingCursor(container) {
  if (!blinkingCursor) {
    blinkingCursor = document.createElement('span');
    blinkingCursor.classList.add('blinking-cursor');
    container.appendChild(blinkingCursor);
  }
}

// Helper function: remove the blinking cursor.
function removeBlinkingCursor() {
  if (blinkingCursor && blinkingCursor.parentElement) {
    blinkingCursor.parentElement.removeChild(blinkingCursor);
    blinkingCursor = null;
  }
}


// When the user presses Enter in the input box:
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && input.value.trim() !== '' && isTyping === false) {
    const userMessage = input.value.trim();
    appendMessage('user', userMessage);
    socket.emit('user message', userMessage, uid);
    input.value = '';
    addBlinkingCursor(output);
  }
});

// Append new tokens from the bot as they arrive.
socket.on('bot message', (data) => {
  // Check if the last message in the output is a bot message
  isTyping = true;
  let lastMessageElem = output.querySelector('.message.bot:last-child .content');
  if (!lastMessageElem) {
    removeBlinkingCursor();
    // Create a new message container for the bot's reply
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message', 'bot');
    const label = document.createElement('span');
    label.classList.add('label');
    label.textContent = uid ? 'You?: ' : '???: ';
    const content = document.createElement('span');
    content.classList.add('content');
    messageContainer.appendChild(label);
    messageContainer.appendChild(content);
    output.appendChild(messageContainer);
    lastMessageElem = content;
  }
  addBlinkingCursor(lastMessageElem);
  // Stream the new text to the last bot message
  // lastMessageElem.textContent += data;

  if (blinkingCursor && blinkingCursor.parentElement === lastMessageElem) {
    blinkingCursor.insertAdjacentText('beforebegin', data);
  } else {
    lastMessageElem.textContent += data;
  }

  output.scrollTop = output.scrollHeight;
});

// (Optional) You can use this event if you want to do something when the bot’s response is complete.
socket.on('bot message complete', () => {
  console.log('Bot message complete.');
  isTyping = false;
  removeBlinkingCursor();
});

// Helper function to append a new message (user or bot) to the output.
function appendMessage(role, text) {
  const messageContainer = document.createElement('div');
  messageContainer.classList.add('message', role);
  const label = document.createElement('span');
  label.classList.add('label');
  label.textContent = role === 'user' ? 'You: ' : 'Bot: ';
  const content = document.createElement('span');
  content.classList.add('content');
  content.textContent = text;
  messageContainer.appendChild(label);
  messageContainer.appendChild(content);
  output.appendChild(messageContainer);
  output.scrollTop = output.scrollHeight;
}

