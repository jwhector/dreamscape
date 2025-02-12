// public/script.ts
// Function to get a query parameter by name
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
// Assumes that the Socket.io client library is loaded via a <script> tag in index.html
const socket = io();

const input = document.getElementById('input');
const submitButton = document.getElementById('submit-button');
const output = document.getElementById('output');
let isTyping = false;
let uid = null;
let name = null;

// Conversation persistence
let conversation = [];

// Save conversation to localStorage
function saveConversation() {
  localStorage.setItem('conversation', JSON.stringify(conversation));
}

// Load conversation from localStorage and render them
function loadConversation() {
  const stored = localStorage.getItem('conversation');
  if (stored) {
    conversation = JSON.parse(stored);
    conversation.forEach(msg => {
      renderMessage(msg.role, msg.text);
    });
  }
}

// Render a message without updating conversation storage
function renderMessage(role, text) {
  const messageContainer = document.createElement('div');
  messageContainer.classList.add('message', role);
  const label = document.createElement('span');
  label.classList.add('label');
  label.textContent = role === 'user' ? 'You: ' : uid ? 'You?: ' : '???: ';
  const content = document.createElement('span');
  content.classList.add('content');
  content.textContent = text;
  messageContainer.appendChild(label);
  messageContainer.appendChild(content);
  output.appendChild(messageContainer);
}

// Call loadConversation on page load
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
  loadConversation();
  output.scrollTop = output.scrollHeight;
});

// Enable and highlight button when input has value
input.addEventListener('input', () => {
  if (input.value.trim() !== '') {
    submitButton.disabled = false;
    submitButton.classList.add('highlight');
  } else {
    submitButton.disabled = true;
    submitButton.classList.remove('highlight');
  }
});

function handleUserInput(input) {
  const userMessage = input.value.trim();
  appendMessage('user', userMessage);
  socket.emit('user message', userMessage, uid);
  input.value = '';
  submitButton.disabled = true;
  submitButton.classList.remove('highlight');
  input.blur();
  createBotMessage();
}

// Trigger message send on button click
submitButton.addEventListener('click', () => {
  if (input.value.trim() !== '' && !isTyping) {
    handleUserInput(input);
  }
});

// When the user presses Enter in the input box:
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && input.value.trim() !== '' && isTyping === false) {
    handleUserInput(input)
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

// Helper function to create a new bot message container and content element.
function createBotMessage() {
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
  // Add new bot message to conversation and save.
  conversation.push({ role: 'bot', text: '' });
  
  addBlinkingCursor(content);
  // Add height and scroll to the bottom of the output container
  const botMessageElems = output.querySelectorAll('.message.bot');
  botMessageElems.forEach(elem => {
    elem.style.minHeight = '';
  });
  const userMessageElems = output.querySelectorAll('.message.user');
  const lastUserMessageElem = userMessageElems[userMessageElems.length - 1];
  const userMessageHeight = lastUserMessageElem.offsetHeight;
  const viewportHeight = document.documentElement.clientHeight;
  const inputBoxHeight = input.offsetHeight;
  const additionalHeight = viewportHeight - userMessageHeight - inputBoxHeight - 200;

  messageContainer.style.minHeight = `${additionalHeight}px`;
  output.scrollTop = output.scrollHeight;

  saveConversation();

  return content;
}

// Append new tokens from the bot as they arrive.
socket.on('bot message', (data) => {
  isTyping = true;
  let lastMessageElem = output.querySelector('.message.bot:last-child .content');
  // If there's no prior bot message, create one and persist an empty string.
  if (!lastMessageElem) {
    lastMessageElem = createBotMessage();
  }

  if (blinkingCursor && blinkingCursor.parentElement === lastMessageElem) {
    blinkingCursor.insertAdjacentText('beforebegin', data);
  } else {
    lastMessageElem.textContent += data;
  }
  // Update last bot message content in the conversation array.
  if (conversation.length > 0 && conversation[conversation.length - 1].role === 'bot') {
    conversation[conversation.length - 1].text = lastMessageElem.textContent;
    saveConversation();
  }
});

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
  // Persist only if this is a fresh user message.
  if (role === 'user') {
    conversation.push({ role, text });
    saveConversation();
  }
  // output.scrollTop = output.scrollHeight;
}

