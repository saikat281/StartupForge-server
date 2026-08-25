const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors")

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

// Middleware
app.use(cors())

app.use(express.json());



// MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Collection declerartion
let myStartupCollection;
let addOpportunityCollection;
let applicationCollection

// Connect to MongoDB
async function run() {
  try {
    await client.connect();

    const db = client.db("startupforge");

    // Collections
    myStartupCollection = db.collection("mystartup");
    addOpportunityCollection = db.collection("addOpportunity")
    applicationCollection = db.collection("application")




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

app.get("/mystartup", async (req, res) => {
  try {
    const result = await myStartupCollection.find().toArray();
    res.send(result)
  } catch (error) {
    console.error("Get startup error:", error);

    res.status(500).json({
      message: "Failed to get startup",
      error: error.message,
    });
  }
})

app.post("/opportunity", async (req, res) => {
  try {

    const data = req.body;
    const result = await addOpportunityCollection.insertOne(data);
    res.status(201).json(result);

  } catch (error) {
    console.error("Create Opportunity error:", error);

    res.status(500).json({
      message: "Failed to Create Opportunity",
      error: error.message,
    });
  }
})

app.get("/opportunity", async (req, res) => {
  try {
    const result = await addOpportunityCollection.find().toArray();
    res.send(result)
  } catch (error) {
    console.error("Get opportunity error:", error);

    res.status(500).json({
      message: "Failed to get opportunity",
      error: error.message,
    });
  }
})

app.get("/opportunity/:id", async (req, res) => {
  try {

    const {id} = req.params;

    const result = await addOpportunityCollection.findOne({_id: new ObjectId(id)})
    res.send(result)
  } catch (error) {
    console.error("Get opportunity error:", error);

    res.status(500).json({
      message: "Failed to get opportunity",
      error: error.message,
    });
  }
})


app.post("/application", async (req, res) => {
  try {
    const data = req.body;

    console.log("Received data:", data);

    const result = await applicationCollection.insertOne(data);

    res.status(201).json(result);
  } catch (error) {
    console.error("Create application error:", error);

    res.status(500).json({
      message: "Failed to create application",
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
