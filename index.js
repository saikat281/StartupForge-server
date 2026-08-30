const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

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
let applicationCollection;
let userCollection;
let proPlanCollection

// Connect to MongoDB
async function run() {
  try {
    await client.connect();

    const db = client.db("startupforge");

    // Collections
    myStartupCollection = db.collection("mystartup");
    addOpportunityCollection = db.collection("addOpportunity")
    applicationCollection = db.collection("application")
    userCollection = db.collection("user")
    proPlanCollection = db.collection("proPlan")




    await client.db("admin").command({ ping: 1 });

    console.log("Connected to MongoDB successfully!");

  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}


const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
     return res.status(401).send({ msg: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
     return res.status(401).send({ msg: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS)
    console.log(payload)
    next();
  } catch (error) {
     return res.status(401).send({ msg: "Unauthorized" });
  }

  // console.log(AuthHeader);

}

// API

app.post("/payment", verifyToken, async (req, res) => {
  const { user, session_id, Current_date } = req.body;

  const isExistSession = await proPlanCollection.findOne({ session_id });

  if (isExistSession) {
    return res.status(201).json("Session already exist");
  }


  const payment_result = await proPlanCollection.insertOne({ user: user.name, amount: 14, Date: Current_date, payment_status: "completed", userId: user.id, session_id })

  // Update User_status

  const user_result = await userCollection.updateOne(
    { _id: new ObjectId(user.id) },
    { $set: { plan: "pro" } },
  )

  res.status(201).json({ payment_result, user_result });
})

app.get("/payment", verifyToken, async (req, res) => {
  try {
    const result = await proPlanCollection.find().toArray();
    res.send(result)
  } catch (error) {
    console.error("Get proPlan error:", error);

    res.status(500).json({
      message: "Failed to get proPlan",
      error: error.message,
    });
  }
})




app.post("/mystartup",  async (req, res) => {
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

app.get("/mystartup/:id",  async (req, res) => {
  try {

    const { id } = req.params;

    const result = await myStartupCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)
  } catch (error) {
    console.error("Get startup error:", error);

    res.status(500).json({
      message: "Failed to get startup",
      error: error.message,
    });
  }
})


// To Get All opportunities under specific Startup 
app.get("/startups/:sid", async (req, res) => {
  try {

    const { sid } = req.params;

    const result = await addOpportunityCollection.find({ startupId: sid }).toArray();
    res.send(result)
  } catch (error) {
    console.error("Get opportunities error:", error);

    res.status(500).json({
      message: "Failed to get opportunities",
      error: error.message,
    });
  }
})


app.delete("/mystartup/:id", verifyToken, async (req, res) => {
  try {

    const { id } = req.params;

    const result = await myStartupCollection.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
  } catch (error) {
    console.error("Delete startup error:", error);

    res.status(500).json({
      message: "Failed to Delete startup",
      error: error.message,
    });
  }
})

app.patch("/mystartup/:id", verifyToken, async (req, res) => {

  try {
    const { id } = req.params;
    const UpdatedData = req.body;

    const result = await myStartupCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: UpdatedData }
    )
    res.status(201).json(result);
  } catch (error) {
    console.error("update Status error:", error);

    res.status(500).json({
      message: "Failed to Update status",
      error: error.message,
    });
  }

})

app.post("/opportunity", verifyToken, async (req, res) => {  //verifyToken
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

    const searchText = req.query.search || "";
    const workType = req.query.workType || "";
    let query = {};

    query.$or = [
      { roleTitle: { $regex: searchText, $options: "i" } },
      { skills: { $regex: searchText, $options: "i" } },

    ]


    if (workType) query.workType = workType;

    const limit = Number(req.query.limit) || 10;
    const current_page = Number(req.query.page) || 1;

    const totalData = await addOpportunityCollection.countDocuments();

    const total_page = Math.ceil(totalData / limit);
    const skip = (current_page - 1) * limit;

    const result = await addOpportunityCollection.find(query).skip(skip).limit(limit).toArray();
    res.send({ total_page, skip, totalData, result, workType })
  } catch (error) {
    console.error("Get opportunity error:", error);

    res.status(500).json({
      message: "Failed to get opportunity",
      error: error.message,
    });
  }
})

app.get("/opportunity/:id", verifyToken, async (req, res) => {
  try {

    const { id } = req.params;

    const result = await addOpportunityCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)
  } catch (error) {
    console.error("Get opportunity error:", error);

    res.status(500).json({
      message: "Failed to get opportunity",
      error: error.message,
    });
  }
})

app.delete("/opportunity/:userId",  async (req, res) => {
  try {

    const { userId } = req.params;

    const result = await addOpportunityCollection.deleteMany({ userId: userId })
    res.send(result)
  } catch (error) {
    console.error("Delete opportunities error:", error);

    res.status(500).json({
      message: "Failed to Delete opportunities",
      error: error.message,
    });
  }
})




app.post("/application", verifyToken,  async (req, res) => {
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

app.get("/application", verifyToken,  async (req, res) => {
  try {
    const result = await applicationCollection.find().toArray();
    res.send(result)
  } catch (error) {
    console.error("Get application error:", error);

    res.status(500).json({
      message: "Failed to get applications",
      error: error.message,
    });
  }
})

app.patch("/application/:id", async (req, res) => {

  try {
    const { id } = req.params;
    const UpdatedData = req.body;

    const result = await applicationCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: UpdatedData }
    )
    res.status(201).json(result);
  } catch (error) {
    console.error("update application error:", error);

    res.status(500).json({
      message: "Failed to Update application",
      error: error.message,
    });
  }

})

app.get("/users", verifyToken,  async (req, res) => {
  try {
    const result = await userCollection.find().toArray();
    res.send(result)
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      message: "Failed to get users",
      error: error.message,
    });
  }
})

app.patch("/users/:id", verifyToken, async (req, res) => {

  try {
    const { id } = req.params;
    const UpdatedData = req.body;

    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: UpdatedData }
    )
    res.status(201).json(result);
  } catch (error) {
    console.error("update userStatus error:", error);

    res.status(500).json({
      message: "Failed to Update userStatus",
      error: error.message,
    });
  }

})

app.get("/profile/:id", verifyToken,  async (req, res) => {
  try {

    const { id } = req.params;

    const result = await userCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)
  } catch (error) {
    console.error("Get profile error:", error);

    res.status(500).json({
      message: "Failed to get profile",
      error: error.message,
    });
  }
})

app.patch("/profile/:id", verifyToken,  async (req, res) => {

  try {
    const { id } = req.params;
    const UpdatedData = req.body;

    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: UpdatedData }
    )
    res.status(201).json(result);
  } catch (error) {
    console.error("update profile error:", error);

    res.status(500).json({
      message: "Failed to Update profile",
      error: error.message,
    });
  }

})




// Test route
app.get("/", (req, res) => {
  res.send("server is running fine!");
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  await run();
});
