import jwt from "jsonwebtoken";
import fs from 'fs';
import path from 'path';

const JWT_SECRET = "lol-not-so-secret";

function generateUID(): string {
    return 'uid_' + Math.random().toString(36).substr(2, 9);
}

function generateJWTs(jsonInput: string) {
    const payloads = JSON.parse(jsonInput);
    if (!Array.isArray(payloads)) {
        throw new Error("JSON input must be an array of objects.");
    }

    return payloads.map((payload: { name: string; uid?: string; lastName?: string }) => {
        if (!payload.uid) {
            payload.uid = generateUID();
        }
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '100d' });
        return { 
          name: payload.name, 
          lastName: payload.lastName, 
          token,
          url: `http://www.rwedreaming.com/?dream=${encodeURIComponent(token)}`
        };
    });
}

interface Person {
    name: string;
    lastName?: string;
    uid?: string;
}

const jsonData: Person[] = [];

const additionalPeople: Person[] = [
    { name: "Jeff", lastName: "Schwab" },
    { name: "Jeff", lastName: "Moonski" },
    { name: "Vince" },
    { name: "Aadi" },
    { name: "Jimmy" },
    { name: "Jim" },
    { name: "Aidan" },
    { name: "Jake" },
    { name: "Tina" },
    { name: "Drake" },
    { name: "Suzanne" },
    { name: "Ren" },
    { name: "Abraham" },
    { name: "Danielle" },
    { name: "Scott" },
    { name: "Kendall" }
];

additionalPeople.forEach(person => {
    person.uid = generateUID();
    jsonData.push(person);
});

const tokens = generateJWTs(JSON.stringify(jsonData));

const outputPath = path.join(__dirname, 'tokensOutput.json');
fs.writeFileSync(outputPath, JSON.stringify(tokens, null, 2), 'utf-8');

console.log(`Tokens saved to ${outputPath}`);
console.log(tokens);