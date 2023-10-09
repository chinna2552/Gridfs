const express = require('express');
const { MongoClient } = require('mongodb');

const { GridFSBucket } = require('mongodb');
const multer = require('multer');
const path = require('path');


const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();
const port = process.env.PORT || 3000;


const uri = 'mongodb://localhost:27017/test'; 
const client = new MongoClient(uri);

let bucket;

client.connect()
    .then(() => {
        console.log('Connected to MongoDB');
        const db = client.db();
        bucket = new GridFSBucket(db, {
            chunkSizeBytes: 1024,
        });

    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/upload', upload.single('file'), (req, res) => {
    if (!bucket) {
        return res.status(500).send('MongoDB connection not established.');
    }
    const file = req.file;
    const filename = req.body.filename || file.originalname;

    const uploadStream = bucket.openUploadStream(filename);
    uploadStream.end(file.buffer);

    uploadStream.on('finish', () => {
        res.status(201).send('File upload successfully.');
    });

    uploadStream.on('error', (error) => {
        console.error('Error uploading file:', error);
        res.status(500).send('File upload failed.');
    });
});

app.get('/download/:filename', (req, res) => {
    if (!bucket) {
        return res.status(500).send('MongoDB connection not established.');
    }

    const filename = req.params.filename;
    const downloadStream = bucket.openDownloadStreamByName(filename);

    downloadStream.on('file', (file) => {
        res.set('content-type', file.contentType);
        res.set('content-disposition', `attachment; filename="${file.filename}"`);
    });

    downloadStream.on('error', (error) => {
        console.error('Error downloading file:', error);
        res.status(404).send('File not found.');
    });

    downloadStream.pipe(res);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});