//ab apn assume krre hai ki file local server pe aa chuki hai aur vaha se local path milega aur phir apn cloudinary pe usko daal denge
//aur successfully upload hogai then server se usko remove bhi krdenge using unlink
import {v2 as cloudinary} from "cloudinary"
import fs from "fs" //ye file syatem hai jo file ko read write remove sab krne me kam ata hai, node ka hota hai

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto" //detect krlo jo bhi file aari hai like image, video etc
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}
export {uploadOnCloudinary}