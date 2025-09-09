const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'resort3413',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            const folder = file.mimetype.startsWith('video/') ? 'videos' : 'images';
            const fileName = `public/${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
            cb(null, fileName);
        }
    }),
    limits: {
        fileSize: 8 * 1024 * 1024 // 8MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv/;
        const isValid = allowedTypes.test(file.originalname.toLowerCase()) || 
                       file.mimetype.startsWith('image/') || 
                       file.mimetype.startsWith('video/');
        cb(null, isValid);
    }
});

module.exports = { s3, upload };