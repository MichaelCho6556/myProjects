<<<<<<< HEAD
import {authMiddleware} from "@clerk/nextjs";

export default authMiddleware({});

export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
=======
import {authMiddleware} from "@clerk/nextjs";

export default authMiddleware({});

export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
>>>>>>> 5a009d2f4104189374a3c56a46f2e48f06112e1b
};