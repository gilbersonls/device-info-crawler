const app = require("express")();

app.get("/api", (req, res) => {
  res.end(`Hello!`);
});

module.exports = app;
