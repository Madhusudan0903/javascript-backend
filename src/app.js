import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"})) //used jab apn form me data bhar rhe hain aur usko backend me lena hai
app.use(express.urlencoded({extended: true, limit: "16kb"})) //ab express ko btana ki url se bhi data aa skta hia, extended me apn objects ke andar bhi objects de skte hian
app.use(express.static("public")) //kuch bhi images, favicon aisa kuch hai to public me rkhlunga
app.use(cookieParser()) //mai mere server se user ke browser ki andar ki cookies access krpau aur unko set bhi krpau, basically crud operation perform krpau

export { app }