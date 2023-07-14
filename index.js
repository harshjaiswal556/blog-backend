const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer')
const uploadMiddleware = multer({ dest: 'uploads/' })
const fs = require('fs');
const Post = require('./models/Post');
const dotenv = require('dotenv');

const salt = bcrypt.genSaltSync(10);
const secret = "HarshJaiswal0987@1234$"
// console.log("hello")
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

dotenv.config();

mongoose.connect(process.env.MONGODB_URL)

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userDoc = await User.create({
            username,
            password: bcrypt.hashSync(password, salt)
        })
        res.json(userDoc);
    } catch (err) {
        // console.log(err);
        res.status(400).json(err);
    }
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userDoc = await User.findOne({ username });
        const passOk = bcrypt.compareSync(password, userDoc.password);
        // res.json(passOk);
        if (passOk) {
            //user Logged in
            jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
                if (err) {
                    throw err;
                } else {
                    res.cookie('token', token).json({
                        id: userDoc._id,
                        username
                    });
                }
            })
        } else {
            alert("Incorrect username or password");
            res.status(400).json("User not found");
        }
    } catch (err) {
        res.status(400).json(err);
    }
})

app.post("/logout", (req, res) => {
    res.cookie('token', '').json("Ok");
})

app.get("/profile", (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, (err, info) => {
        if (err) throw err;
        res.json(info);
    })
    res.json(req.cookies);
})

app.post("/post", uploadMiddleware.single('file'), async (req, res) => {
    // res.json({ files: req.file });
    // console.log(req.files);
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, newPath);

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;
        const { title, summary, content } = req.body;
        try {
            const postDoc = await Post.create({
                title,
                summary,
                content,
                cover: newPath,
                author: info.id
            })

            res.json({ postDoc })
        } catch (err) {
            res.status(400).send(err);
        }
    })



})

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
    let newPath = null;
    console.log("updated")
    if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path + '.' + ext;
        fs.renameSync(path, newPath);

        const { token } = req.cookies;
        jwt.verify(token, secret, {}, async (err, info) => {
            if (err) throw err;
            const { id, title, summary, content } = req.body;
            const postDoc = await Post.findById(id);
            const isAuthor = JSON.stringify(info.id) === JSON.stringify(postDoc.author);
            if (!isAuthor) {
                return res.status(400).json('you are not the author');
            }

            // await postDoc.update({ title, summary, content, cover: newPath ? newPath : postDoc.cover })
            await postDoc.updateOne({
                title,
                summary,
                content,
                cover: newPath ? newPath : postDoc.cover,
            });
            res.json(postDoc);
            console.log("updated")
        })
    }

})

app.get("/post", async (req, res) => {
    res.json(await Post.find().populate('author', ['username']).sort({ 'createdAt': -1 }).limit(20));
})

app.get("/post/:id", async (req, res) => {
    const { id } = req.params;
    const postDoc = await Post.findById(id).populate('author', ['username']);
    res.json(postDoc);
})
app.listen(4000);