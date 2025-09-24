// This is a Vercel serverless function.
// It runs in a Node.js environment on the server, not in the browser.
// It has access to server-side environment variables.

// The handler function receives request and response objects.
// We are using JavaScript here, so no type annotations are needed.
export default function handler(req, res) {
  // Retrieve the API_KEY from environment variables on the server.
  const apiKey = process.env.API_KEY;

  // If the API key is not found, return a 500 server error with a helpful message.
  if (!apiKey) {
    return res.status(500).json({ message: "Clé API manquante. Veuillez configurer la variable d'environnement API_KEY dans les paramètres de votre projet Vercel." });
  }

  // If the key is found, return it in a JSON object.
  res.status(200).json({ apiKey });
}
