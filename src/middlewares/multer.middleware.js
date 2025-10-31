import multer from "multer";

const storage = multer.diskStorage({ //apn memory storage use nhi krre
    destination: function (req, file, cb) { //file is for uploading files other than just json data
      cb(null, "./public/temp") //cb is callback, folder jahan files rkenge
    },
    filename: function (req, file, cb) {
      
      cb(null, file.originalname)
    }
  })
  
export const upload = multer({ 
    storage, 
})