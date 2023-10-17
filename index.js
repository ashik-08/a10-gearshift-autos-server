const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5001;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("GearShift server is running!");
});

app.listen(port, () => {
  console.log(`Server started on ${port}`);
});
