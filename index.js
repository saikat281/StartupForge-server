const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is not defined");
  process.exit(1);
}

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);

app.use(express.json());

// MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Collections
let myStartupCollection;
let addOpportunityCollection;
let applicationCollection;
let userCollection;
let proPlanCollection;

// MongoDB connection
async function run() {
  try {
    await client.connect();

    const db = client.db("startupforge");

    myStartupCollection = db.collection("mystartup");
    addOpportunityCollection = db.collection("addOpportunity");
    applicationCollection = db.collection("application");
    userCollection = db.collection("user");
    proPlanCollection = db.collection("proPlan");

    await client.db("admin").command({ ping: 1 });

    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

// Make sure MongoDB is initialized before any API uses it
const dbReady = run();

// JWT JWKS
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

// Token verification
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      msg: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      msg: "Unauthorized",
    });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);

    req.user = payload;

    next();
  } catch (error) {
    console.error("JWT verification error:", error);

    return res.status(401).json({
      msg: "Unauthorized",
    });
  }
};

// ==================== TEST ROUTE ====================

app.get("/", (req, res) => {
  res.send("server is running fine!");
});

// ==================== PAYMENT ====================

app.post("/payment", verifyToken, async (req, res) => {
  try {
    await dbReady;

    const { user, session_id, Current_date } = req.body;

    const isExistSession = await proPlanCollection.findOne({
      session_id,
    });

    if (isExistSession) {
      return res.status(201).json("Session already exist");
    }

    const payment_result = await proPlanCollection.insertOne({
      user: user.name,
      amount: 14,
      Date: Current_date,
      payment_status: "completed",
      userId: user.id,
      session_id,
    });

    const user_result = await userCollection.updateOne(
      {
        _id: new ObjectId(user.id),
      },
      {
        $set: {
          plan: "pro",
        },
      }
    );

    res.status(201).json({
      payment_result,
      user_result,
    });
  } catch (error) {
    console.error("Payment error:", error);

    res.status(500).json({
      message: "Payment failed",
      error: error.message,
    });
  }
});

app.get("/payment", verifyToken, async (req, res) => {
  try {
    await dbReady;

    const result = await proPlanCollection.find().toArray();

    res.json(result);
  } catch (error) {
    console.error("Get proPlan error:", error);

    res.status(500).json({
      message: "Failed to get proPlan",
      error: error.message,
    });
  }
});

// ==================== MYSTARTUP ====================

app.post("/mystartup", async (req, res) => {
  try {
    await dbReady;

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
    await dbReady;

    const result = await myStartupCollection.find().toArray();

    res.json(result);
  } catch (error) {
    console.error("Get startup error:", error);

    res.status(500).json({
      message: "Failed to get startup",
      error: error.message,
    });
  }
});

app.get("/mystartup/:id", async (req, res) => {
  try {
    await dbReady;

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid startup ID",
      });
    }

    const result = await myStartupCollection.findOne({
      _id: new ObjectId(id),
    });

    res.json(result);
  } catch (error) {
    console.error("Get startup error:", error);

    res.status(500).json({
      message: "Failed to get startup",
      error: error.message,
    });
  }
});

app.delete("/mystartup/:id", verifyToken, async (req, res) => {
  try {
    await dbReady;

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid startup ID",
      });
    }

    const result = await myStartupCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.json(result);
  } catch (error) {
    console.error("Delete startup error:", error);

    res.status(500).json({
      message: "Failed to Delete startup",
      error: error.message,
    });
  }
});

app.patch("/mystartup/:id", async (req, res) => {
  try {
    await dbReady;

    const { id } = req.params;
    const UpdatedData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid startup ID",
      });
    }

    const result = await myStartupCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: UpdatedData,
      }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("Update startup error:", error);

    res.status(500).json({
      message: "Failed to Update status",
      error: error.message,
    });
  }
});

// ==================== OPPORTUNITY ====================

app.post("/opportunity", verifyToken, async (req, res) => {
  try {
    await dbReady;

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
});

app.get("/opportunities", async (req, res) => {
  try {
    await dbReady;

    const result = await addOpportunityCollection.find().toArray();

    res.json(result);
  } catch (error) {
    console.error("Get opportunities error:", error);

    res.status(500).json({
      message: "Failed to get opportunities",
      error: error.message,
    });
  }
});

// Get opportunities (Pagination)
app.get("/opportunity", async (req, res) => {
  try {
    await dbReady;

    const searchText = req.query.search || "";
    const workType = req.query.workType || "";

    const limit = Number(req.query.limit) || 10;
    const current_page = Number(req.query.page) || 1;

    const query = {
      $or: [
        {
          roleTitle: {
            $regex: searchText,
            $options: "i",
          },
        },
        {
          skills: {
            $regex: searchText,
            $options: "i",
          },
        },
      ],
    };

    if (workType) {
      query.workType = workType;
    }

    const totalData =
      await addOpportunityCollection.countDocuments(query);

    const total_page = Math.ceil(totalData / limit);

    const skip = (current_page - 1) * limit;

    const result = await addOpportunityCollection
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      total_page,
      skip,
      totalData,
      result,
      workType,
    });
  } catch (error) {
    console.error("Get opportunity error:", error);

    res.status(500).json({
      message: "Failed to get opportunity",
      error: error.message,
    });
  }
});

app.get("/opportunity/:id", verifyToken, async (req, res) => {
  try {
    await dbReady;

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid opportunity ID",
      });
    }

    const result = await addOpportunityCollection.findOne({
      _id: new ObjectId(id),
    });

    res.json(result);
  } catch (error) {
    console.error("Get opportunity error:", error);

    res.status(500).json({
      message: "Failed to get opportunity",
      error: error.message,
    });
  }
});

app.patch("/opportunity/:id", async (req, res) => {
  try {
    await dbReady;

    const { id } = req.params;
    const UpdatedData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid opportunity ID",
      });
    }

    const result = await addOpportunityCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: UpdatedData,
      }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("Update opportunity error:", error);

    res.status(500).json({
      message: "Failed to Update opportunity",
      error: error.message,
    });
  }
});

// delete all opportunity
app.delete("/opportunity/:userId", async (req, res) => {
  try {
    await dbReady;

    const { userId } = req.params;

    const result = await addOpportunityCollection.deleteMany({
      userId: userId,
    });

    res.json(result);
  } catch (error) {
    console.error("Delete opportunities error:", error);

    res.status(500).json({
      message: "Failed to Delete opportunities",
      error: error.message,
    });
  }
});


// delete specific opportunity
app.delete("/opportunities/opportunity/:id", async (req, res) => {
  try {
    await dbReady;

    const { id } = req.params;

    const result = await addOpportunityCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Opportunity not found",
      });
    }

    res.json({
      message: "Opportunity deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete opportunity error:", error);

    res.status(500).json({
      message: "Failed to delete opportunity",
      error: error.message,
    });
  }
});


app.get("/startups/:sid", async (req, res) => {
  try {
    await dbReady;

    const { sid } = req.params;

    const result = await addOpportunityCollection
      .find({
        startupId: sid,
      })
      .toArray();

    res.json(result);
  } catch (error) {
    console.error("Get opportunities error:", error);

    res.status(500).json({
      message: "Failed to get opportunities",
      error: error.message,
    });
  }
});

// ==================== APPLICATION ====================

app.post("/application", verifyToken, async (req, res) => {
  try {
    await dbReady;

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

app.get("/application", verifyToken, async (req, res) => {
  try {
    await dbReady;

    const result = await applicationCollection.find().toArray();

    res.json(result);
  } catch (error) {
    console.error("Get application error:", error);

    res.status(500).json({
      message: "Failed to get applications",
      error: error.message,
    });
  }
});

app.patch("/application/:id", async (req, res) => {
  try {
    await dbReady;

    const { id } = req.params;
    const UpdatedData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid application ID",
      });
    }

    const result = await applicationCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: UpdatedData,
      }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("Update application error:", error);

    res.status(500).json({
      message: "Failed to Update application",
      error: error.message,
    });
  }
});

// ==================== USERS ====================

app.get("/users", verifyToken, async (req, res) => {
  try {
    await dbReady;

    const result = await userCollection.find().toArray();

    res.json(result);
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      message: "Failed to get users",
      error: error.message,
    });
  }
});

app.patch("/users/:id", verifyToken, async (req, res) => {
  try {
    await dbReady;

    const { id } = req.params;
    const UpdatedData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const result = await userCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: UpdatedData,
      }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("Update userStatus error:", error);

    res.status(500).json({
      message: "Failed to Update userStatus",
      error: error.message,
    });
  }
});

// ==================== PROFILE ====================

app.get("/profile/:id", verifyToken, async (req, res) => {
  try {
    await dbReady;

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid profile ID",
      });
    }

    const result = await userCollection.findOne({
      _id: new ObjectId(id),
    });

    res.json(result);
  } catch (error) {
    console.error("Get profile error:", error);

    res.status(500).json({
      message: "Failed to get profile",
      error: error.message,
    });
  }
});

app.patch("/profile/:id", verifyToken, async (req, res) => {
  try {
    await dbReady;

    const { id } = req.params;
    const UpdatedData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid profile ID",
      });
    }

    const result = await userCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: UpdatedData,
      }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      message: "Failed to Update profile",
      error: error.message,
    });
  }
});

// ==================== LOCAL + VERCEL ====================

// Local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Vercel serverless
module.exports = app;
