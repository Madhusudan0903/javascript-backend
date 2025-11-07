import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async (userId) => {
  //we dont need async handler as no web req handling
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //ab refresh token ko database me kaise daale
    user.refreshToken = refreshToken; //add krna
    await user.save({ validateBeforeSave: false }); //agar ye true hota to user me jitni bhi properties hsi sab true honi chahiye thi

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

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
  //console.log(req.files);
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
    //ye vala check cover image pr nhi lgaya
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

const loginUser = asyncHandler(async (req, res) => {
  //step1: req body -> data
  //step2: username or email
  //step3: find the user
  //step4: password check
  //step5: access and referesh token
  //step6: send cookie

  //step1
  const { email, username, password } = req.body;
  console.log(email);

  //step2
  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  // Here is an alternative of above code based on logic discussed in video:
  // if (!(username || email)) {
  //     throw new ApiError(400, "username or email is required")

  // }

  //step3
  const user = await User.findOne({
    $or: [{ username }, { email }], //ya to email dhunddo ya username
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  //step4
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  //step5
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    //jab bhi aisa lge ki kisi chiz me time jyada lg skta hai then use await
    user._id
  );
  //ye alag se method bnalia dono sath laane ke liye: generateAccessAndRefereshTokens

  const loggedInUser = await User.findById(user._id).select(
    //optional step
    "-password -refreshToken"
  );

  //step6
  const options = {
    httpOnly: true, //ye krne se aapki cookies ko aap sirf server se modify kr skte hain frontend se nhi
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options) //key, value
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //step1 - cookies clear
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
