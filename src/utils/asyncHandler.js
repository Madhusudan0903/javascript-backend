/* 
🔹 What asyncHandler Does

It’s a wrapper function that helps handle errors automatically for any async route handler in Express.
Normally, when you write an async function in Express, if it throws an error or rejects a promise, Express won’t catch it unless you manually use try...catch in every route.
This utility avoids that repetition.
Now, any error in that function is automatically caught and passed to Express’s error middleware via next(err).
*/

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

export { asyncHandler }

//2nd way
// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}


// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }