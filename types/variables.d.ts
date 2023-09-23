
type DebugOutputChannel = "filesystem" | "mysql" | "webapi" | "mailer" | "framapi";

type LogsCollectionName = "alerts" | "debug" | "auth";


namespace CLIUserAuthentication {
    
    type ActionNames = "useDebug" | "manageServer" | 
    "viewUsers" | "manageUsers" | 
    "viewInvites" | "manageInvites" | 
    "viewTokens" | "manageTokens" | 
    "viewSessions" | "manageSessions";

}