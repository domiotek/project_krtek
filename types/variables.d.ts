
type DebugOutputChannel = "filesystem" | "mysql" | "webapi" | "mailer" | "framapi";

type LogsCollectionName = "alerts" | "debug" | "auth";


namespace CLIAPI {
    namespace UserAuthentication {
    
        type ActionNames = "useDebug" | "manageServer" | 
        "viewUsers" | "manageUsers" | 
        "viewInvites" | "manageInvites" | 
        "viewTokens" | "manageTokens" | 
        "viewSessions" | "manageSessions" |
        "viewSchedule" | "manageSchedule";
    
    }
}
