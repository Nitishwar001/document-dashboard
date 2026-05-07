const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const http = require("http");
const fs = require("fs");

const { Server } = require("socket.io");

const app = express();

/* Create HTTP Server */
const server = http.createServer(app);

/* Socket.IO Setup */
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

/* Middleware */
app.use(cors());
app.use(express.json());

/* Socket Connection */
io.on("connection", (socket) => {
  console.log("User Connected");
});

/* In-Memory Storage */
let documents = [];
let notifications = [];

/* Multer Storage Setup */
const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },

});

/* Multer Upload */
const upload = multer({
  storage: storage,
});

/* Home Route */
app.get("/", (req, res) => {
  res.send("Backend Running");
});

/* Upload Route */
app.post(
  "/upload",
  upload.array("files"),
  (req, res) => {

    console.log("FILES RECEIVED");

    console.log(req.files);

    /* Save Documents */
    req.files.forEach((file) => {

      documents.push({
        name: file.filename,
        originalName: file.originalname,
        size: file.size,
        type: file.mimetype,
        uploadDate: new Date(),
      });

    });

    /* Create Notification */
    const notification = {
      message: `${req.files.length} file(s) uploaded successfully`,
      type: "success",
      timestamp: new Date(),
      read: false,
    };

    notifications.unshift(notification);

    /* Realtime Notification */
    io.emit("upload-complete", notification);

    /* Response */
    res.json({
      success: true,
      files: req.files,
    });

  }
);

/* Get Documents */
app.get("/documents", (req, res) => {
  res.json(documents);
});

/* Download Route */
app.get("/download/:filename", (req, res) => {

  const filePath = path.join(
    __dirname,
    "uploads",
    req.params.filename
  );

  res.download(filePath);

});
/* Delete Document */
app.delete("/documents/:filename", (req, res) => {

  const filename = req.params.filename;

  /* Find Document */
  const document = documents.find(
    (doc) => doc.name === filename
  );

  if (!document) {

    return res.status(404).json({
      message: "Document not found",
    });

  }

  /* File Path */
  const filePath = path.join(
    __dirname,
    "uploads",
    filename
  );

  /* Delete File */
  fs.unlink(filePath, (err) => {

    if (err) {

      return res.status(500).json({
        message: "File delete failed",
      });

    }

    /* Remove From Array */
    documents = documents.filter(
      (doc) => doc.name !== filename
    );

    /* Add Notification */
    const notification = {
      message: `${document.originalName} deleted successfully`,
      type: "info",
      timestamp: new Date(),
      read: false,
    };

    notifications.unshift(notification);

    /* Realtime Event */
    io.emit("upload-complete", notification);

    res.json({
      success: true,
    });

  });

});
/* Get Notifications */
app.get("/notifications", (req, res) => {
  res.json(notifications);
});

/* Mark All Notifications Read */
app.patch("/notifications/read-all", (req, res) => {

  notifications = notifications.map((notification) => ({
    ...notification,
    read: true,
  }));

  res.json({
    success: true,
  });

});

/* Start Server */
server.listen(5000, () => {
  console.log("Server running on port 5000");
});