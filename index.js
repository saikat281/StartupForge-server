const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require("mongodb");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

// Middleware
app.use(express.json());

// MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let myStartupCollection;

// Connect to MongoDB
async function run() {
  try {
    await client.connect();

    const db = client.db("startupforge");

    myStartupCollection = db.collection("mystartup");

    await client.db("admin").command({ ping: 1 });

    console.log("Connected to MongoDB successfully!");

  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

// API
app.post("/mystartup", async (req, res) => {
  try {
    const data = req.body;

    console.log("Received data:", data);

    const result = await myStartupCollection.insertOne(data);

    res.status(201).json(result);
  } catch (error) {
    console.error("Create startup error:", error);

    res.status(500).json({
      message: "Failed to create startup",
      error: error.message,
    });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("server is running fine!");
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  await run();
});
