const express = require('express');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const session = require('express-session');
const dotenv = require('dotenv');

dotenv.config();
const secret_key = process.env.SECRET_KEY;

const app = express();
const port = 8080;

app.use(session({
    secret: `${secret_key}`,
    resave: false,
    saveUninitialized: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed!'), false);
        }
    }
});

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = path.join(__dirname, 'uploads', req.file.filename);
        const workbook = xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        const worksheet = workbook.Sheets[sheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = data[0];

        req.session.uploadedFile = req.file.filename;

        setTimeout(() => {
            fs.unlink(filePath, (err) => { });
        }, 5 * 60 * 1000);

        res.json({ headers });
    } catch (error) {
        res.status(500).json({ error: 'Server error during file upload' });
    }
});

app.post('/filter', (req, res) => {
    try {
        const { columns, fileName } = req.body;

        if (!req.session.uploadedFile) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = path.join(__dirname, 'uploads', req.session.uploadedFile);
        if (!fs.existsSync(filePath)) {
            return res.status(400).json({ error: 'Uploaded file not found' });
        }

        const workbook = xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        const worksheet = workbook.Sheets[sheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = data[0];

        const indices = columns.map(col => headers.indexOf(col)).filter(index => index >= 0);
        if (indices.length === 0) {
            return res.status(400).json({ error: 'No valid columns selected' });
        }

        const filteredData = data.slice(1).map(row => indices.map(index => row[index]));

        const newWorkbook = xlsx.utils.book_new();
        const newWorksheet = xlsx.utils.aoa_to_sheet([columns, ...filteredData]);
        xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Filtered Data');

        const buffer = xlsx.write(newWorkbook, { bookType: 'xlsx', type: 'buffer' });

        const encodedFileName = encodeURIComponent(fileName).replace(/'/g, '%27');

        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
                console.error('Error deleting uploaded file:', unlinkErr);
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during file filtering' });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`server on`);
});