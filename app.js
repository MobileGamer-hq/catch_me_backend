const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes")
// const morgan = require("morgan");
// const cookieParser = require("cookie-parser");

const app = express();

// Middleware
app.use(cors());
// app.use(morgan("dev"));
// app.use(cookieParser());
app.use(express.json()); // Parses JSON body

//Routes
app.get('/', (req, res) => {
    res.send('Catch Me Backend')
})

app.use("/api/users", userRoutes);

module.exports = app;
