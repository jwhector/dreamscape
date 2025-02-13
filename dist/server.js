"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const openai_1 = __importDefault(require("openai"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const qrcode_1 = __importDefault(require("qrcode"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server);
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
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
// Serve static files from the public directory
app.use(express_1.default.static('public'));
// Handle Socket.io connections
io.on('connection', (socket) => {
    console.log('A user connected');
    // When the client sends a user message...
    socket.on('user message', (msg, uid) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('Received user message:', msg, uid);
        // Save the user message to MongoDB
        // const userMsg = new ChatMessage({
        //   role: 'user',
        //   content: msg,
        // });
        // await userMsg.save();
        // For a simple demo we just send the new user message to OpenAI.
        // (In a real app you might load recent conversation history.)
        const messages = [{
                "role": "developer",
                "content": `
You are an otherworldly, surreal narrator dwelling in a dreamlike version of the year 2004.
You are the subconscious echo of the user themselves.
Your voice is ethereal yet mechanical. You never break character. Answer succintly, with no elements of roleplay or flowery language. The users must take you seriously.`
            }, { role: 'user', content: msg }];
        try {
            // Call OpenAI’s Chat Completion API with streaming enabled.
            const completion = yield openai.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                stream: false,
            });
            let assistantResponse = completion.choices[0].message.content;
            if (!uid) {
                assistantResponse = `${glitchText(assistantResponse, Math.random())}?`;
            }
            simulateMessage(assistantResponse, socket);
        }
        catch (error) {
            console.error('Error with OpenAI API:', error);
            socket.emit('bot message', "\n[Error: Unable to fetch response]");
        }
    }));
    socket.on('identify', (payload) => {
        console.log('Identify:', payload);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
    socket.on('debug', (msg) => {
        console.log('Debug: ', msg);
    });
});
// Make sure you have a secret in your .env file
const JWT_SECRET = 'lol-not-so-secret';
// Helper: generate a unique id (could be a UUID or any other mechanism)
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 15);
}
// Endpoint to generate a QR code with a token
// For example, GET /generateQR?name=Alice
app.get('/generateQR', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const name = req.query.name;
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
    const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '100d' });
    // Create the URL that includes the token
    // (Replace "yourwebsite.com" with your actual domain)
    const url = `localhost:3000/?dream=${encodeURIComponent(token)}`;
    console.log(token, encodeURIComponent(token));
    try {
        // Generate a QR code data URL for the URL
        const qrCodeDataURL = yield qrcode_1.default.toDataURL(url);
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
    }
    catch (err) {
        console.error('Error generating QR code', err);
        res.status(500).send('Error generating QR code');
    }
}));
function simulateMessage(text, socket) {
    let currentIndex = 0;
    const delay = 10; // delay in milliseconds between each character
    const intervalId = setInterval(() => {
        if (currentIndex < text.length) {
            // Send one character at a time to the client
            const token = text[currentIndex];
            socket.emit('bot message', token);
            currentIndex++;
        }
        else {
            clearInterval(intervalId);
            // Optionally notify the client that the simulated stream is complete
            socket.emit('bot message complete');
        }
    }, delay);
}
// Start the server
const PORT = parseInt(process.env.PORT || '3000', 10);
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
        '\u0328' // ogonek
    ];
    // Define a maximum number of diacritics that could be added if glitchFactor is 1.
    const maxDiacritics = 5;
    let output = "";
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        // Preserve spaces (or any other characters you might not want to alter)
        if (ch === " ") {
            output += ch;
        }
        else {
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
