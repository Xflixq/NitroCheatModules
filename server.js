const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const mongoUri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const authToken = process.env.AUTH_TOKEN;

const connectToMongoDB = async () => {
  const client = new MongoClient(mongoUri, {
    useNewUrlParser: true,
  });
  await client.connect();
  return client;
};

const { getRobloxGameName } = require('./GameModule');

async function fetchRobloxGameName(serverId) {
  try {
    const gameName = await getRobloxGameName(serverId);
    return gameName[1];
  } catch (error) {
    console.error('Error fetching Roblox game name:', error);
  }
}

const authorize = (req, res, next) => {
  const authTokenHeader = req.headers.authtoken;

  if (!authTokenHeader || authTokenHeader !== authToken) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  next();
};

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
};

app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("Online!");
});

app.post("/api/getBannedData", authorize, async (req, res) => {
  try {
    const { AuthToken } = req.body;
    const { UserId } = req.query;

    if (!AuthToken || AuthToken !== authToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const client = await connectToMongoDB();
    const db = client.db(dbName);
    const collection = db.collection("BannedUsers");
    const users = await collection.find({ UserId }).toArray();
    client.close();

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error while retrieving users:", error);
    res.status(500).json({ success: false, message: "User retrieval failed", error: error.message });
  }
});

app.post("/api/checkIfBanned", authorize, async (req, res) => {
  try {
    const { AuthToken } = req.body;
    const { UserId } = req.query;

    if (!AuthToken || AuthToken !== authToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const client = await connectToMongoDB();
    const db = client.db(dbName);
    const collection = db.collection("BannedUsers");
    const users = await collection.find({ UserId }).toArray();
    client.close();

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error while retrieving users:", error);
    res.status(500).json({ success: false, message: "User retrieval failed", error: error.message });
  }
});

app.post("/api/getAllUsers", authorize, async (req, res) => {
  try {
    const client = await connectToMongoDB();
    const db = client.db(dbName);
    const collection1 = db.collection("IncorrectBans");
    const collection2 = db.collection("AppealedBans");
    const collection3 = db.collection("UsersKicked");
    const collection4 = db.collection("BannedUsers");
    const collection5 = db.collection("Guilds");
    const incorrectStat = await collection1.find({}).toArray();
    const appealsStat = await collection2.find({}).toArray();
    const kickedStat = await collection3.find({}).toArray();
    const usersStat = await collection4.find({}).toArray();
    const guildStat = await collection5.find({}).toArray();
    client.close();

    return res.status(200).json({ success: true, incorrectStat, appealsStat, kickedStat, usersStat, guildStat });
  } catch (error) {
    console.error("Error while retrieving users:", error);
    res.status(500).json({ success: false, message: "User retrieval failed", error: error.message });
  }
});

app.post('/api/changeUser', async (req, res) => {
  console.log('Request received:', req.body);
  try {
    const AuthToken = req.headers.authtoken;
    const { UserId, BanType } = req.body;

    if (AuthToken !== authToken) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const client = await connectToMongoDB();
    const db = client.db(dbName);
    const collection = db.collection('BannedUsers');

    const existingUser = await collection.findOne({ UserId });

    if (existingUser) {
      await collection.updateOne({ UserId }, { $set: { BanType } });
      client.close();
      console.log('User ban type updated successfully');
      return res.status(200).json({ success: true, message: 'User updated successfully' });
    } else {
      client.close();
      console.log('User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post("/api/registerUser", async (req, res) => {
  try {
    const { AuthToken, UserId, Username, DetectedTime, BanType } = req.body;

    if (AuthToken !== authToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const client = await connectToMongoDB();
    const db = client.db(dbName);
    const collection = db.collection("BannedUsers");

    const existingUser = await collection.findOne({ UserId });

    if (existingUser) {
      client.close();
      return res.status(400).json({ success: false, message: "User already exists" });
    } else {
      await collection.insertOne({
        UserId,
        Username,
        DetectedTime,
        BanType,
      });
      client.close();
      return res.status(201).json({ success: true, message: "User registered successfully" });
    }
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ success: false, message: "User registration failed" });
  }
});

app.post("/api/removeUser", authorize, async (req, res) => {
  try {
    const authTokenHeader = req.headers.authtoken;
    const UserId = req.body.RobloxUserId;

    if (authTokenHeader !== authToken) {
      console.log(authTokenHeader);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!UserId) {
      console.log('RobloxUserId is not defined');
      return res.status(400).json({ success: false, message: "RobloxUserId is not defined" });
    }

    const client = await connectToMongoDB();
    const db = client.db(dbName);
    const pendingCollection = db.collection("BannedUsers");

    const pendingUser = await pendingCollection.findOne({ UserId });

    if (pendingUser) {
      await pendingCollection.deleteOne({ UserId });
      client.close();
      return res.status(200).json({ success: true, message: "User unbanned successfully" });
    } else {
      return res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error("Error while unbanning user:", error);
    res.status(500).json({ success: false, message: "Failed to unban user" });
  }
});

app.post("/api/getPendingUserData", authorize, async (req, res) => {
  try {
    const authTokenHeader = req.headers.authtoken;
    const robloxUserId = req.headers.robloxuserid;

    if (authTokenHeader !== authToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const client = await connectToMongoDB();
    const db = client.db(dbName);
    const collection = db.collection("PendingUsers");
    const pendingUser = await collection.findOne({ robloxUserId });
    client.close();

    if (pendingUser) {
      const robloxGameName = await fetchRobloxGameName(pendingUser.robloxPlaceId);
      const discordServerId = pendingUser.discordServerId;

      console.log(robloxGameName);
      console.log(discordServerId);

      return res.status(200).json({
        success: true,
        user: {
          robloxGameName,
          discordServerId
        }
      });
    } else {
      return res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error("Error in getPendingUserData:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


app.post("/api/movePendingUserToGuild", authorize, async (req, res) => {
  console.log("Request Received!");
  try {
    const authTokenHeader = req.headers.authtoken;
    const robloxUserId = req.headers.robloxuserid;

    if (authTokenHeader !== authToken) {
      console.log(authTokenHeader);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!robloxUserId) {
      return res.status(400).json({ success: false, message: "RobloxUserId is not defined" });
    }

    const client = await connectToMongoDB();
    const db = client.db(dbName);
    const pendingCollection = db.collection("PendingUsers");
    const guildsCollection = db.collection("Guilds");

    const pendingUser = await pendingCollection.findOne({ robloxUserId });

    if (pendingUser) {
      await guildsCollection.insertOne({
        robloxUserId: robloxUserId,
        robloxPlaceId: pendingUser.robloxPlaceId,
        discordUserId: pendingUser.discordUserId,
        discordServerId: pendingUser.discordServerId,
      });

      await pendingCollection.deleteOne({ robloxUserId });

      client.close();

      return res.status(200).json({ success: true, message: "User moved to Guilds collection successfully" });
    } else {
      return res.status(404).json({ success: false, message: "User not found in Pending collection" });
    }
  } catch (error) {
    console.error("Error while moving pending user to Guilds collection:", error);
    res.status(500).json({ success: false, message: "Failed to move user to Guilds collection" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
