// server.ts
import * as dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import mongoose, { Schema, Document, Model } from 'mongoose';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

const app: Express = express();
const server: http.Server = http.createServer(app);
const io: Server = new Server(server);

// Connect to MongoDB
// mongoose
//   .connect(process.env.MONGO_URI as string, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log('MongoDB connected'))
//   .catch((err: any) => console.error('MongoDB connection error:', err));

// // Define a Mongoose schema and model for chat messages
// interface IChatMessage extends Document {
//   role: string; // "user" or "assistant"
//   content: string;
//   timestamp: Date;
// }

// const chatMessageSchema: Schema = new Schema({
//   role: { type: String, required: true },
//   content: { type: String, required: true },
//   timestamp: { type: Date, default: Date.now },
// });
// const ChatMessage: Model<IChatMessage> = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Serve static files from the public directory
app.use(express.static('public'));

// Handle Socket.io connections
io.on('connection', (socket: Socket) => {
  console.log('A user connected');

  // When the client sends a user message...
  socket.on('user message', async (msg: string, uid?: string) => {
    console.log('Received user message:', msg, uid);

    // Save the user message to MongoDB
    // const userMsg = new ChatMessage({
    //   role: 'user',
    //   content: msg,
    // });
    // await userMsg.save();

    // For a simple demo we just send the new user message to OpenAI.
    // (In a real app you might load recent conversation history.)
    const messages: ChatCompletionMessageParam[] = [{
      "role": "developer",
      "content": `
You are an otherworldly, surreal narrator dwelling in a dreamlike version of the year 2004.
You are the subconscious echo of the user themselves.
Your voice is ethereal yet mechanical. You never break character. Answer succintly, with no elements of roleplay or flowery language. The users must take you seriously.`
    }, { role: 'user', content: msg }];

    try {
      // Call OpenAI’s Chat Completion API with streaming enabled.
      const completion = await openai.chat.completions.create(
        {
          model: 'gpt-4o',
          messages: messages,
          stream: false,
        }
      );

      let assistantResponse = completion.choices[0].message.content;

      if (!uid) {
        assistantResponse = `${glitchText(assistantResponse, Math.random())}?`;
      }

      simulateMessage(assistantResponse, socket);
    } catch (error) {
      console.error('Error with OpenAI API:', error);
      socket.emit('bot message', "\n[Error: Unable to fetch response]");
    }
  });

  socket.on('identify', (payload: any) => {
    console.log('Identify:', payload);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  socket.on('debug', (msg: string) => {
    console.log('Debug: ', msg);
  });
});

// Make sure you have a secret in your .env file
const JWT_SECRET = 'lol-not-so-secret';

// Helper: generate a unique id (could be a UUID or any other mechanism)
function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Endpoint to generate a QR code with a token
// For example, GET /generateQR?name=Alice
app.get('/generateQR', async (req, res) => {
  const name = req.query.name as string;
  if (!name) {
    return res.status(400).send('Name query parameter is required.');
  }

  const lastName = req.query.lastName;

  // Create a token payload. You can add additional metadata if needed.
  const payload = {
    name,
    lastName,
    uid: generateUniqueId(),
  };

  // Sign the token (expires in 1 day, for example)
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '100d' });

  // Create the URL that includes the token
  // (Replace "yourwebsite.com" with your actual domain)
  const url = `localhost:3000/?dream=${encodeURIComponent(token)}`;

  console.log(token, encodeURIComponent(token));

  try {
    // Generate a QR code data URL for the URL
    const qrCodeDataURL = await QRCode.toDataURL(url);
    // Return an HTML snippet displaying the QR code image.
    res.send(`
      <html>
        <head><title>Your QR Code</title></head>
        <body>
          <p>Scan this QR code to open the chat:</p>
          <img src="${qrCodeDataURL}" alt="QR Code" />
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Error generating QR code', err);
    res.status(500).send('Error generating QR code');
  }
});


function simulateMessage(text: string, socket: Socket) {
  let currentIndex = 0;
  const delay = 10; // delay in milliseconds between each character

  const intervalId = setInterval(() => {
    if (currentIndex < text.length) {
      // Send one character at a time to the client
      const token: string = text[currentIndex];
      socket.emit('bot message', token);
      currentIndex++;
    } else {
      clearInterval(intervalId);
      // Optionally notify the client that the simulated stream is complete
      socket.emit('bot message complete');
    }
  }, delay);
}

// Start the server
const PORT: number = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

/**
 * Transforms a string by replacing each non-space character with a random character,
 * and optionally adds random combining diacritics to simulate "glitch text."
 *
 * @param {string} input - The input string to transform.
 * @param {number} glitchFactor - A value between 0 and 1 indicating how "glitched" the text should be.
 *                                0 means no diacritics, 1 means maximum diacritics.
 * @returns {string} The transformed glitch text.
 */
function glitchText(input, glitchFactor) {
  // A pool of characters to choose from for the basic letter replacement.
  const charPool = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:',.<>/?";

  // A list of Unicode combining diacritical marks (feel free to add more).
  const diacritics = [
    '\u0300', // grave accent
    '\u0301', // acute accent
    '\u0302', // circumflex accent
    '\u0303', // tilde
    '\u0304', // macron
    '\u0305', // overline
    '\u0306', // breve
    '\u0307', // dot above
    '\u0308', // diaeresis
    '\u0309', // hook above
    '\u030A', // ring above
    '\u030B', // double acute accent
    '\u030C', // caron
    '\u0327', // cedilla
    '\u0328'  // ogonek
  ];

  // Define a maximum number of diacritics that could be added if glitchFactor is 1.
  const maxDiacritics = 5;

  let output = "";

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    // Preserve spaces (or any other characters you might not want to alter)
    if (ch === " ") {
      output += ch;
    } else {
      // Replace the character with a random one from our pool.
      const randomChar = charPool[Math.floor(Math.random() * charPool.length)];
      output += randomChar;

      // Determine how many diacritics to add.
      // Multiply glitchFactor by maxDiacritics to get a maximum count,
      // then choose a random number from 0 up to that maximum.
      const diacriticCount = Math.floor(Math.random() * glitchFactor * maxDiacritics);

      for (let d = 0; d < diacriticCount; d++) {
        // Append a random combining diacritic.
        const randomDiacritic = diacritics[Math.floor(Math.random() * diacritics.length)];
        output += randomDiacritic;
      }
    }
  }

  return output;
}
