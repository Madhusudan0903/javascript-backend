import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
  //step1: get user details from frontend
  //step2: validation - not empty
  //step3: check if user already exists: username, email
  //step4: check for images, check for avatar
  //step5: upload them to cloudinary, avatar
  //step6: create user object - create entry in db
  //step7: remove password and refresh token field from response
  //step8: check for user creation
  //step9: return res

  //step1:
  const { fullName, email, username, password } = req.body;
  console.log("email: ", email);

  //step2:
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //step3: agar username ya email kuch bhi already present ho
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  //step4: phele req.body me apne ko sara data milta tha but ab images ke liye apn ne ek middleware add kia tha so vo bhi apne kuch access deta hai, vo req me aur fields add krdeta hai aur multer files ka access dedeta hai
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //step5:
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  //step6:
  const user = await User.create({
    fullName,
    avatar: avatar.url, //mai database me sirf url store krana chahta hu avatar ka
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //step7:
  //ab agar ye user successfully create hua , then sirf ye data hi create nhi hota, mongodb har ek entry ke sath ek _id naam ka field add krdeta hai
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" //isme vo vo daalte hain jo nhi chahiye
  );

  //step8:
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //step9:
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

export { registerUser };
