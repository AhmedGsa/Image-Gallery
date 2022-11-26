require("dotenv").config()
const express = require('express')
const mongoose = require("mongoose")
const multer = require("multer")
const {GridFsStorage} = require("multer-gridfs-storage")
const GridFs = require("gridfs-stream")
const app = express()

app.set("view engine", "ejs")
app.use(express.json())
app.use(express.static("./public"))

const storage = new GridFsStorage({
    url: process.env.MONGO_URI,
    file: (req,file) => {
        if(file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
            return {
            filename: Date.now() + file.originalname,
            bucketName: "images"
            }
        } else {
            return null
        }
    }
})

const upload = multer({
    storage: storage
}).single("image")

let gfs, gridfsBucket;

const conn = mongoose.createConnection(process.env.MONGO_URI)
conn.once('open', function () {
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'images'
    });
    gfs = GridFs(conn.db, mongoose.mongo);
    gfs.collection("images")
})

// Getting Single Image
app.get("/api/v1/images/:imageName", async (req,res) => {
    const {imageName} = req.params
    gfs.files.findOne({filename: imageName}, (err,file) => {
        if(!file) {
            return res.status(404).json({err: "File not found!"})
        }
        const readstream = gridfsBucket.openDownloadStream(file._id)
        readstream.pipe(res)
    })
})

// Getting images
app.get("/", async (req,res) => {
    gfs.files.find().toArray((err,files) => {
        if(!files || files.length === 0) {
            res.render("index",{files: false})
        } else {
            res.render("index", {files: files})
        }
    })
})
// Uploading Images
app.post("/api/v1/images", upload, async (req,res) => {
    res.redirect("/")
})

const port = 5000
const start = async () => {
    app.listen(port,console.log(`Server is listening on port ${port}`))
}

start()