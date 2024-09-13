<<<<<<< HEAD
import {PrismaClient} from "@prisma/client";

let prisma: PrismaClient;

if(process.env.NODE_ENV === 'production'){
    prisma  = new PrismaClient()
}
else{
    //@ts-ignore
    if(!global.prisma){
        //@ts-ignore
        global.prisma = new PrismaClient();
    }
    //@ts-ignore
    prisma = global.prisma;
}

=======
import {PrismaClient} from "@prisma/client";

let prisma: PrismaClient;

if(process.env.NODE_ENV === 'production'){
    prisma  = new PrismaClient()
}
else{
    //@ts-ignore
    if(!global.prisma){
        //@ts-ignore
        global.prisma = new PrismaClient();
    }
    //@ts-ignore
    prisma = global.prisma;
}

>>>>>>> 5a009d2f4104189374a3c56a46f2e48f06112e1b
export default prisma;