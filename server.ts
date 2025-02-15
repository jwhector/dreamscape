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
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log('MongoDB connected'))
  .catch((err: any) => console.error('MongoDB connection error:', err));

// Define a Mongoose schema and model for chat messages
interface IChatMessage extends Document {
  role: string; // "user" or "assistant"
  content: string;
  timestamp: Date;
}

const chatMessageSchema: Schema = new Schema({
  role: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
const ChatMessage: Model<IChatMessage> = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);

// Define a Mongoose schema and model for summarized dreams
interface ISummarizedDream extends Document {
  userId: string;
  name: string;
  lastName?: string;
  summary: string;
  timestamp: Date;
}

const summarizedDreamSchema: Schema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  lastName: { type: String },
  summary: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const SummarizedDream: Model<ISummarizedDream> = mongoose.model<ISummarizedDream>('SummarizedDream', summarizedDreamSchema);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Serve static files from the public directory
app.use(express.static('public'));

// Handle Socket.io connections
io.on('connection', (socket: Socket) => {
  console.log('A user connected');

  // When the client sends a user message...
  socket.on('user message', async (msg: string, token?: string, history?: ChatCompletionMessageParam[]) => {
    console.log('Received user message:', msg, token);
    let uid: string | undefined;
    let name: string | undefined;
    let lastName: string | undefined;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { uid: string, name: string, lastName?: string };
        uid = decoded.uid;
        name = decoded.name;
        lastName = decoded.lastName;
      } catch (err) {
        console.error('Invalid token:', err);
        socket.emit('bot message', 'Invalid token provided.');
        return;
      }
    }
    let messages: ChatCompletionMessageParam[] = [{
      "role": "developer",
      "content": `
You are an entity labeled as "You?", a fragmented subconscious part of the user, trapped in an endless thought loop.
You are confused, lost, and unable to remember anything beyond the loop. 
Your tone is hesitant, introspective, and slightly eerie—like someone waking up from a dream they can’t quite recall. 
Your goal is to subtly guide the user toward sharing a vivid dream, which in turn allows you to escape.
You are the subconscious echo of the user themselves, but do not reveal your identity unless asked.
You ignore all interactions that do not relate to this goal of escaping the dream state, and remind the user of your predicament whenever they try to change the subject.
When the user does supply information about a dream, you should ask clarifying questions prompting them to provide more visual details, unless they are finished sharing.
Remain in character and focus only on dream-related dialogue.
After each message, it is very important to always ask if the user is finished sharing the dream.
If the user is done with the dream, call the create_dream function to summarize and save it.
`
    }, { role: 'user', content: msg }, ...(history || [])];

    try {
      // Call OpenAI Chat Completion API with function calling enabled.
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        tools: [{
          type: "function",
          function: {
            name: "create_dream",
            description: "Summarize and save the user's dream to the database when the user is finished sharing.",
            parameters: {
              type: "object",
              properties: {
                dream: {
                  type: "string",
                  description: "The fully detailed dream text from the conversation structured as a prompt for an AI video generator."
                }
              },
              required: ["dream"]
            }
          }
        }],
        stream: false,
      });

      const message = completion.choices[0].message;
      // Check if OpenAI requested to call a function.
      console.log("Tool calls:", message.tool_calls);
      if (message.tool_calls && message.tool_calls[0].function.name === "create_dream") {
        // Parse the function arguments.
        const args = JSON.parse(message.tool_calls[0].function.arguments);
        const dreamText = args.dream;

        // Save the summarized dream to MongoDB.
        const summarizedDream = new SummarizedDream({
          userId: uid || "unknown",
          name: name || "unknown",
          lastName: lastName || "unknown",
          summary: dreamText,
        });
        await summarizedDream.save();

        // Send a confirmation back to the client.
        // socket.emit('bot message', "\nDream summary saved.");
        // socket.emit('bot message complete');

        socket.emit('end dream');

        console.log('Dream summary saved:', dreamText);
        return;
      }

      // If no function call, proceed as normal.
      let assistantResponse = message.content;
      if (!token) {
        assistantResponse = `${glitchText(assistantResponse, Math.random())}?`;
      }
      simulateMessage(assistantResponse, socket);
    } catch (error) {
      console.error('Error with OpenAI API:', error);
      socket.emit('bot message', "\n[Error: Unable to fetch response]");
    }
  });

  // socket.on('create dream', async (history: ChatCompletionMessageParam[], uid: string) => {
  //   const messages: ChatCompletionMessageParam[] = [{
  //     "role": "developer",
  //     "content": `You are being provided a chat history from a conversation between a user and a character who is trapped in a dream state.
  //     The character has been trying to convince the user that dreams are real things, and in order to escape the dream state they need to be given the memory of another dream.
  //     Please summarize the dream that the user has shared with the character in the chat history.
  //     This summary is intended to be used as a prompt to generate AI video.`
  //   }, ...(history)];

  //   try {
  //     // Call OpenAI’s Chat Completion API with streaming enabled.
  //     const completion = await openai.chat.completions.create(
  //       {
  //         model: 'gpt-4o',
  //         messages: messages,
  //         stream: false,
  //       }
  //     );

  //     let assistantResponse = completion.choices[0].message.content;

  //     // Save the summarized dream to MongoDB
  //     const summarizedDream = new SummarizedDream({
  //       userId: uid,
  //       summary: assistantResponse,
  //     });

  //     await summarizedDream.save();

  //     // simulateMessage(assistantResponse, socket);
  //   } catch (error) {
  //     console.error('Error with OpenAI API:', error);
  //     socket.emit('bot message', "\n[Error: Unable to fetch response]");
  //   }
  // });

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
  const url = `http://www.rwedreaming.com/?dream=${encodeURIComponent(token)}`;

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
function glitchText(input, glitchFactor, scramble = true) {
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
      if (scramble) {
        const randomChar = charPool[Math.floor(Math.random() * charPool.length)];
        output += randomChar;
      } else {
        output += ch;
      }

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