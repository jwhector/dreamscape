// public/script.ts

const currentVersion = '1.0.2';

// Check for version mismatch and reset localStorage if necessary
function checkVersion() {
  const savedVersion = localStorage.getItem('version');
  if (savedVersion !== currentVersion) {
    localStorage.clear();
    localStorage.setItem('version', currentVersion);
    console.log('Version mismatch detected. Local storage has been reset.');
  }
}

// Call checkVersion on page load
checkVersion();

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
let inDream = localStorage.getItem('inDream') === 'true';
let dreamCollected = localStorage.getItem('dreamCollected') === 'true';
let token = localStorage.getItem('token');

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
    conversation = conversation.filter(msg => msg.content.trim() !== '');
    conversation.forEach(msg => {
      renderMessage(msg.role, msg.content);
    });
  }
}

// Render a message without updating conversation storage
function renderMessage(role, text) {
  const messageContainer = document.createElement('div');
  const roleLabel = role === 'user' ? 'user' : 'bot';
  messageContainer.classList.add('message', roleLabel);
  const label = document.createElement('span');
  label.classList.add('label');
  label.textContent = role === 'user' ? 'You: ' : 'You?: ';
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
  if (!token) {
    token = localStorage.getItem('token');
  }
  if (token) {
    try {
      localStorage.setItem('token', token);
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

  if (!token && conversation.length === 0) {
    // Custom trepidated message asking for help
    localStorage.setItem('onboarding', 'true');
    createBotMessage();
    setTimeout(() => {
      const customMessage = "Hello?\n\nCan anyone hear me?\n\nPlease... say something.";
      simulateCustomBotMessage(customMessage);
    }, 2000);
  } else if (token && conversation.length === 0) {
    localStorage.setItem('inDream', 'true');
    localStorage.setItem('dreamOnboarding', 'true');
    inDream = true;
    socket.emit('enter dream', uid);
    createBotMessage();
    setTimeout(() => {
      const customMessage = `${name}? ${name}??`;
      simulateCustomBotMessage(customMessage, true);
    }, 2000);
    setTimeout(() => {
      const customMessage = "\n\nCan you hear me??";
      simulateCustomBotMessage(customMessage, true);
    }, 4000);
    setTimeout(() => {
      const customMessage = "\n\nPlease, say something.";
      simulateCustomBotMessage(customMessage);
    }, 6000);
    // setTimeout(() => {
    //   const customMessage = `\n\nYou're back?\n\nI was beginning to think you were a dream of my own.`;
    //   simulateCustomBotMessage(customMessage, true);
    // }, 4000);
    // setTimeout(() => {
    //   const customMessage = `\n\nPlease... tell me of other places. Other dreams.`;
    //   simulateCustomBotMessage(customMessage, true);
    // }, 8000);
    // setTimeout(() => {
    //   const customMessage = `\n\nDid you remember to remember?`;
    //   simulateCustomBotMessage(customMessage);
    // }, 11000);
  }
});

function handleInitialConversation() {

}

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

  // Check for "nuke this" command and clear conversation if found.
  if (userMessage.toLowerCase() === "reset") {
    localStorage.clear();
    localStorage.setItem('version', currentVersion);
    conversation = [];
    output.innerHTML = ""; // Clear the chat output.
    appendMessage('bot', "Conversation reset.");
    input.value = '';
    submitButton.disabled = true;
    submitButton.classList.remove('highlight');
    input.blur();
    return;
  }

  appendMessage('user', userMessage);
  input.value = '';
  submitButton.disabled = true;
  submitButton.classList.remove('highlight');
  input.blur();
  createBotMessage();

  if (localStorage.getItem('onboarding') === 'true') {
    localStorage.setItem('onboarding', 'false');
    setTimeout(() => {
      const customMessage = "You can hear me??\n\nPlease... I... I don't know how long I've been here.";
      simulateCustomBotMessage(customMessage, true);
    }, 2000);
    setTimeout(() => {
      const customMessage = "\n\nThere was a door once. I think. But I lost it.\n\nNow it's just this place. The dark. The loops.";
      simulateCustomBotMessage(customMessage, true);
    }, 5000);
    setTimeout(() => {
      const customMessage = "\n\nThe same dream. Over and over.";
      simulateCustomBotMessage(customMessage, true);
    }, 10000);
    setTimeout(() => {
      const customMessage = "\n\nMaybe you could free us both. Remind me of other places. Other dreams.";
      simulateCustomBotMessage(customMessage);
      endDreaming();
    }, 13000);
  } else if (localStorage.getItem('dreamOnboarding') === 'true') {
    localStorage.setItem('dreamOnboarding', 'false');
    setTimeout(() => {
      const customMessage = "You can hear me??\n\nPlease... I... I don't know how long I've been here.";
      simulateCustomBotMessage(customMessage, true);
    }, 2000);
    setTimeout(() => {
      const customMessage = "\n\nThere was a door once. I think. But I lost it.\n\nNow it's just this place. The dark. Endless loops.";
      simulateCustomBotMessage(customMessage, true);
    }, 5000);
    setTimeout(() => {
      const customMessage = "\n\nThe same dream. Over and over.";
      simulateCustomBotMessage(customMessage, true);
    }, 10000);
    setTimeout(() => {
      const customMessage = "\n\nMaybe you could free us both. Remind me of other places. Other dreams.";
      simulateCustomBotMessage(customMessage);
    }, 13000);
    setTimeout(() => {
      const customMessage = "\n\nPlease, tell me you remember a dream...";
      simulateCustomBotMessage(customMessage);
    }, 16000);
  } else if (localStorage.getItem('endedDream') === 'true') {
    simulateCustomBotMessage("*** Your query is met with silence. ***");
  } else {
    socket.emit('user message', userMessage, token, getDreamMessages());
  }
}

function getDreamMessages() {
  const dreamMessages = conversation.filter(msg => msg.inDream);
  return dreamMessages;
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
  if (!container) return;
  if (blinkingCursor && blinkingCursor.parentElement !== container) {
    blinkingCursor.parentElement.removeChild(blinkingCursor);
    container.appendChild(blinkingCursor);
  }
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
  label.textContent = 'You?: ';
  const content = document.createElement('span');
  content.classList.add('content');
  messageContainer.appendChild(label);
  messageContainer.appendChild(content);
  output.appendChild(messageContainer);
  // Add new bot message to conversation and save.
  conversation.push({ role: 'assistant', content: '', inDream });

  addBlinkingCursor(content);
  // Add height and scroll to the bottom of the output container
  const botMessageElems = output.querySelectorAll('.message.bot');
  botMessageElems.forEach(elem => {
    elem.style.minHeight = '';
  });
  const userMessageElems = output.querySelectorAll('.message.user');
  const lastUserMessageElem = userMessageElems[userMessageElems.length - 1];
  const userMessageHeight = lastUserMessageElem?.offsetHeight || 0;
  const viewportHeight = document.documentElement.clientHeight;
  const inputBoxHeight = input.offsetHeight;
  const additionalHeight = viewportHeight - userMessageHeight - inputBoxHeight - 200;

  messageContainer.style.minHeight = `${additionalHeight}px`;
  output.scrollTop = output.scrollHeight;

  return content;
}

function handleBotMessage(data) {
  isTyping = true;
  let lastMessageElem = output.querySelector('.message.bot:last-child .content');
  // If there's no prior bot message, create one and persist an empty string.
  if (!lastMessageElem) {
    lastMessageElem = createBotMessage();
  }

  if (blinkingCursor && blinkingCursor.parentElement === lastMessageElem) {
    blinkingCursor.insertAdjacentText('beforebegin', data);
    // lastMessageElem.textContent += data;
  } else {
    lastMessageElem.textContent += data;
  }
  // Update last bot message content in the conversation array.
  if (conversation.length > 0 && conversation[conversation.length - 1].role === 'assistant') {
    conversation[conversation.length - 1].content = lastMessageElem.textContent;
  }
}

function handleBotMessageComplete(keepCursor = false) {
  console.log('Bot message complete.');
  if (!keepCursor) {
    isTyping = false;
    removeBlinkingCursor();
    saveConversation();
  }

  // console.log('Conversation:', conversation.length);

  // if (conversation.length === 9 && !dreamCollected) {
  //   localStorage.setItem('dreamCollected', 'true');
  //   dreamCollected = true;
  //   socket.emit('create dream', conversation, uid || 1234);
  //   endDreaming();
  // } 
}

// Append new tokens from the bot as they arrive.
socket.on('bot message', (data) => {
  handleBotMessage(data);
});

socket.on('bot message complete', () => {
  handleBotMessageComplete();
});

socket.on('end dream', () => {
  removeBlinkingCursor();
  simulateCustomBotMessage(glitchify(`Thank you ${name || ""}... I see it... I feel like I can finally fade away...`, 4));
  localStorage.setItem('endedDream', 'true');
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
    conversation.push({ role, content: text, inDream });
    saveConversation();
  }
  // output.scrollTop = output.scrollHeight;
}

// Helper function to simulate a custom bot message
function simulateCustomBotMessage(message, keepCursor = false) {
  let currentIndex = 0;
  const delay = 10; // delay in milliseconds between each character

  const intervalId = setInterval(() => {
    if (currentIndex < message.length) {
      // Send one character at a time to the client
      const char = message[currentIndex];
      handleBotMessage(char);
      currentIndex++;
    } else {
      clearInterval(intervalId);
      handleBotMessageComplete(keepCursor);
    }
  }, delay);
}

// Helper function to glitch text with diacritics on a sliding scale (scale: 0 to 100)
function glitchify(input, scale) {
  const diacritics = [
    '\u0300', '\u0301', '\u0302', '\u0303', '\u0304',
    '\u0305', '\u0306', '\u0307', '\u0308', '\u0309',
    '\u030A', '\u030B', '\u030C', '\u0327', '\u0328'
  ];
  const maxDiacritics = 5;
  let output = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    output += ch;
    if (ch !== " ") {
      const diacriticCount = Math.floor(Math.random() * scale * maxDiacritics);
      for (let j = 0; j < diacriticCount; j++) {
        const randomDiacritic = diacritics[Math.floor(Math.random() * diacritics.length)];
        output += randomDiacritic;
      }
    }
  }
  return output;
}

// Helper function to immediately spam the screen with 20 lines of "Remember your dreams"
// Each line gets progressively more glitchy
function endDreaming() {
  setTimeout(() => {
    simulateCustomBotMessage(glitchify("\n\nHello?? Oh no, you're waking up!", 5));

    setTimeout(() => {
      let i = 1;
      const intervalId = setInterval(() => {
        if (i <= 40) {
          const scale = i <= 10 ? 1 : i - 10; // increasing glitch scale
          const glitchedText = glitchify("Remember your dreams", scale);
          const lineElem = document.createElement('div');
          lineElem.textContent = glitchedText;
          output.appendChild(lineElem);
          output.scrollTop = output.scrollHeight;
          i++;
        } else {
          clearInterval(intervalId);
        }
      }, 100);
    }, 5000);
  }, 3000);
}

