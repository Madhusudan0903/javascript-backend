import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import { 
    registerUser, 
} from "../controllers/user.controller.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar", //avatar name ki file lenge aur yehi name frontend vala use krega
            maxCount: 1 //ktini files accept krni hai
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )

router.route("/register").post(registerUser)
//router.route("/login").post(loginUser)

export default router