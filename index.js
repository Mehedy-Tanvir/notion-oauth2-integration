const express = require("express");
const axios = require("axios");
const { AuthorizationCode } = require("simple-oauth2");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const NOTION_API_VERSION = process.env.NOTION_API_VERSION;

// OAuth2 configuration
const oauth2Client = new AuthorizationCode({
  client: {
    id: CLIENT_ID,
    secret: CLIENT_SECRET,
  },
  auth: {
    tokenHost: "https://api.notion.com",
    tokenPath: "/v1/oauth/token",
    authorizePath: "/v1/oauth/authorize",
  },
});

// Authorization URL
app.get("/auth", (req, res) => {
  const authorizationUri = oauth2Client.authorizeURL({
    redirect_uri: REDIRECT_URI,
    response_type: "code",
  });
  res.redirect(authorizationUri);
});

// Callback endpoint
app.get("/callback", async (req, res) => {
  const { code } = req.query;
  // console.log("code", code);
  const tokenConfig = {
    code,
    redirect_uri: REDIRECT_URI,
  };

  // console.log({ tokenConfig });

  try {
    // Exchange authorization code for access token
    const result = await oauth2Client.getToken(tokenConfig);

    // console.log({ result });
    const accessToken = result.token.access_token;

    // Log access token for debugging
    console.log("Access Token:", accessToken);

    // Fetch user information (workspace details)
    const userResponse = await axios.get("https://api.notion.com/v1/users/me", {
      headers: {
        "Notion-Version": NOTION_API_VERSION,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const user = userResponse.data;
    // console.log("User Info:", user);

    // Fetch database list (optional: if you want to log database IDs)
    const databasesResponse = await axios.post(
      "https://api.notion.com/v1/search",
      {
        // filter: {
        //   property: "object",
        //   value: "database",
        // },
      },
      {
        headers: {
          "Notion-Version": NOTION_API_VERSION,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const databases = databasesResponse.data.results;
    console.log("Databases:", databasesResponse.data.results[0].url);

    // Extract secret (access token) and database IDs
    // const databaseIds = databases.map((db) => db.id);
    // console.log("Database IDs:", databaseIds);

    // Respond with user info and database IDs
    // res.json({
    //   message: "Authentication successful",
    //   accessToken,
    //   user,
    //   databaseIds,
    // });
    return res.redirect("https://webflow.com/dashboard");
  } catch (error) {
    console.error("Access Token Error:", error.message);
    res.status(500).json({ error: "Failed to obtain access token" });
  }
});

// Search Notion API
app.get("/notion/search", async (req, res) => {
  const { token } = req.query; // Pass the access token as a query parameter
  if (!token)
    return res.status(400).json({ error: "Access token is required" });

  try {
    const response = await axios.post(
      "https://api.notion.com/v1/search",
      {},
      {
        headers: {
          "Notion-Version": NOTION_API_VERSION,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching Notion data:", error.message);
    res.status(500).json({ error: "Failed to fetch data from Notion" });
  }
});

// Authorization URL
app.get("/", (req, res) => {
  res.send("Welcome to the Notion OAuth2 integration server");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
