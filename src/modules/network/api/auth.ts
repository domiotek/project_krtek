import Output from "../../output.js";
import { RouteOptions } from "fastify/types/route.js";
import { now } from "../../time.js";
import { FastifyError, FastifyRequest } from "fastify";
import { API } from "../../../public/types/networkAPI.js";
import * as yup from "yup";

const errorHandler = async (err:FastifyError, req: FastifyRequest)=> {
    Output.category("debug").print("notice",`[API][Auth] "${req.method}:${req.url}" request failed with "${err.statusCode}" code. Reason: "${err.message}".`,"webapi");

    return {
        status: "Failure",
        errCode: "InternalError",
        message: "Uncaughted Internal Server Error.",
        devDetails: global.app.env.debuggingEnabled?(err as any).errCode ?? "None":undefined
    }
}

const signUpRouteRequestSchema = yup.object().shape({
    token: yup.string().required(),
    username: yup.string().required(),
    password: yup.string().required().matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])((?=.*\W)|(?=.*_))^[^ ]+$/),
    name: yup.string().required(),
    surname: yup.string().required(),
    gender: yup.string().required().oneOf(["m","f","o"])
});

const signUpRoute: RouteOptions = {
    method: "POST",
    url: "/auth/signup",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        const authManager = global.app.webAuthManager;

        let result: API.Auth.SignUp.IResponse = {
            status: "Failure"
        }

        let params: API.Auth.SignUp.IRequest;

        try {
            params = await signUpRouteRequestSchema.validate(req.body);
        } catch (error) {
            result.errCode="BadRequest";
            result.message = (error as yup.ValidationError).message;
            return result;
        }

        if(params.token) {
            const invite = await authManager.getInviteDetails(params.token);

            if(invite) {

                const registrationData: WebAPI.Auth.UserAPI.IUserRegistrationData = {
                    email: invite.email,
                    password: params.password,
                    name: params.name,
                    surname: params.surname,
                    gender: params.gender
                } 

                try {
                    await authManager.createUser(registrationData);

                    result = {
                        status: "Success"
                    }
                    authManager.dropInvite(params.token);
                } catch (error: any) {
                    if(!error.errCode) throw error;
                    result.errCode = error.errCode;
                }
            }else result.errCode = "InvalidToken";
        }else {
            result.errCode = "InvalidToken";
            result.message = "No token given.";
        }

        return result;
    },
    errorHandler
}


const signInRouteRequestSchema = yup.object().shape({
    username: yup.string().required().email(),
    password: yup.string().required(),
    rememberMe: yup.string().oneOf(["false","true"]).required()
});

const signInRoute: RouteOptions = {
    method: "POST",
    url: "/auth/signin",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        const authManager = global.app.webAuthManager;

        const result: API.Auth.SignIn.IResponse = {
            status: "Success"
        }

        let params: API.Auth.SignIn.IRequest;

        try {
            params = await signInRouteRequestSchema.validate(req.body)
        } catch (error) {
            result.status = "Failure";
            result.errCode = "BadRequest";
            result.message = (error as yup.ValidationError).message;
            return result;
        }

        if(req.cookies.session !== undefined) {
            if(await authManager.isSessionValid(req.cookies.session)) {
                result.message = "User already signed in."
                return result;
            }
        }

        const usePersistentSession = params.rememberMe==="true";

        const sessionID = await authManager.tryLogin(params.username ?? "",params.password ?? "",req.ip);
        if(sessionID) {
            res.setCookie("session",sessionID,{path:"/",expires: usePersistentSession?now().plus({days: 7}).toJSDate():undefined});
        }else {
            result.status = "Failure";
            result.errCode = "InvalidCredentials";
        }
        
        return result;
    },
    errorHandler
}

const signOutRouteRequestSchema = yup.object().shape({
    redr: yup.number().oneOf([0,1])
});

const signOutRoute: RouteOptions =  {
    method: "GET",
    url: "/auth/signout",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        const authManager = global.app.webAuthManager;
        let params: API.Auth.SignOut.IRequest;

        try {
            params = await signOutRouteRequestSchema.validate(req.query);
        } catch (error) {

            let result: API.IGenericPOSTResponse =  {
                status: "Failure",
                errCode: "BadRequest",
                message: (error as yup.ValidationError).message
            }

            return result;
        }

        if(req.cookies.session !== undefined) {
            if(await authManager.isSessionValid(req.cookies.session)) {
                await authManager.dropSession(req.cookies.session);
                res.clearCookie("session");
            }
        }

        if(params.redr==0) {
            return {status: "Success"};
        }else res.redirect(302,"/login?r=logout");
    },
    errorHandler: (err, req, res)=>{
        Output.category("debug").print("error",new Error(`[API][AUTH] Request error on signout route. Message: ${err.message}`));
        res.redirect(302,"/login");
    }
}

const recoverAccountRouteRequestSchema = yup.object().shape({
    username: yup.string().required().email()
});
const recoverAccountRoute: RouteOptions = {
    method: "POST",
    url: "/auth/recover",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        const mailer = global.app.mailer;
        const authManager = global.app.webAuthManager;
        const result: API.Auth.RecoverPassword.IResponse = {
            status: "Failure"
        }

        let params:  API.Auth.RecoverPassword.IRequest;

        try {
            params = await recoverAccountRouteRequestSchema.validate(req.body);
        } catch (error) {
            result.status = "Failure";
            result.errCode = "BadRequest";
            result.message = (error as yup.ValidationError).message;
            return result;
        }
        
        if(params.username) {
            let token;

            try {
                token = await authManager.createToken("ChangePassword",params.username);
            } catch (error: any) {
                if(!error.errCode) throw error;

                if(error.errCode=="NoUser") result.status = "Success";//Covering the fact, that given email doesn't match any account
                else result.errCode = error.errCode;

                return result;
            }

            const user = await authManager.getUser(params.username);

            if(user) {
                const template = mailer.getTemplate("PasswordRecovery");
                const sender = mailer.getSender("aas");

                if(template&&sender) {
                    const sendResult = await mailer.send(sender, params.username,template, {name: user.name, email_address: params.username, reset_link: `http://127.0.0.1:3000/p/ResetPassword?token=${token}`});
                    if(sendResult) {
                        result.status="Success";
                    }
                }else {
                    result.errCode="MailerError";
                    result.message="No such template or sender.";
                }
            }else result.errCode="Other";
        }else {
            result.errCode="Other";
            result.message="Missing parameter.";
        }

        return result;
    },
    errorHandler
}

const setPasswordRouteRequestSchema = yup.object().shape({
    token: yup.string().required(),
    password: yup.string().required().matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])((?=.*\W)|(?=.*_))^[^ ]+$/)
});
const setPasswordRoute: RouteOptions = {
    method: "POST",
    url: "/auth/change/password",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        const authManager = global.app.webAuthManager;
        const result: API.Auth.ChangePassword.IResponse = {
            status: "Failure"
        }
        
        let params: API.Auth.ChangePassword.IRequest;

        try {
            params = await setPasswordRouteRequestSchema.validate(req.body);
        } catch (error) {
            result.status = "Failure";
            result.errCode = "BadRequest";
            result.message = (error as yup.ValidationError).message;
            return result;
        }

        if(!params.token || !params.password) {
            result.errCode="InvalidToken";
            return result;
        }
        
        const token = await authManager.getTokenDetails(params.token);

        if(token) {
            try {
                await authManager.setPassword(token.userID,params.password);
                result.status = "Success";
                authManager.dropToken(params.token);
            }catch (error:any) {
                if(!error.errCode) throw error;
                result.errCode = error.errCode;
            }
        }else result.errCode="InvalidToken";

        return result;
    },
    errorHandler
}

const getEmailFromTokenRequestSchema = yup.object().shape({
    token: yup.string().required(),
    type: yup.string().required().oneOf(["action","invite"])
});
const getEmailFromToken: RouteOptions = {
    url: "/auth/GetEmailFromToken",
    method: "GET",
    handler: async (req, res)=>{
        res.header("cache-control","no-store");
        let params: API.Auth.GetEmailFromToken.IRequest;
        const result: API.Auth.GetEmailFromToken.IResponse = {
            status: "Failure"
        }

        try {
            params = await getEmailFromTokenRequestSchema.validate(req.query);
        } catch (error) {
            result.status = "Failure";
            result.errCode = "BadRequest";
            result.message = (error as yup.ValidationError).message;
            return result;
        }

        if(params.type=="invite") {
            const invite = await global.app.webAuthManager.getInviteDetails(params.token);
            if(invite) {
                result.status="Success";
                result.email=invite.email;
            }else result.errCode = "InvalidToken";
        }else {
            const token = await global.app.webAuthManager.getTokenDetails(params.token);
            result.errCode = "InvalidToken";

            if(token) {
                const user = await global.app.webAuthManager.getUser(token.userID);
                if(user) {
                    result.status="Success";
                    result.errCode = undefined;
                    result.email=user.email;
                }
            }
        }

        return result;
    },
    errorHandler
}


export default [
    signUpRoute,
    signInRoute,
    signOutRoute,
    setPasswordRoute,
    recoverAccountRoute,
    getEmailFromToken
]