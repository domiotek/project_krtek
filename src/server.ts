import initializeEnvironment from "./environment.js";
import {waitFor, __dirname, computeVersion} from "./modules/util.js";;
import { FramAPI } from "./modules/network/FramAPI/fram-api.js";
import * as Addr from "./modules/network/addr.js";
import Output from "./modules/output.js";
import FastifyInit from "./modules/network/http-features.js";
import { MysqlController } from "./modules/network/mysql-controller.js";
import { MysqlError } from "mysql";
import { LogsCollections } from "./modules/logger.js";
import { WebAuthManager } from "./modules/network/webAuthManager.js";
import { DownloadsManager } from "./modules/network/api/downloads.js";
import Mailer from "./modules/network/mailer.js";
import commandRequestHandler, { CommandsHandler, registerCommands } from "./modules/commands-handler.js";
import AuthenticationManager from "./modules/cli-auth.js";
import { ScheduleManager } from "./modules/network/scheduleManager.js";
import { UserStatsManager } from "./modules/network/userStatsManager.js";


class App implements IApp {

	public server: FramAPI | null = null;
	public readonly version = process.env.npm_package_version ?? "Unknown";

	private readonly mysqlController: WebAPI.Mysql.IMysqlController;

	public readonly fs: IFileSystem;
	public readonly env: IEnvironmentConfig;
	public readonly localDownloads: WebAPI.IDownloadsManager;
	public readonly webAuthManager: WebAPI.Auth.IWebAuthManager;
	public readonly scheduleManager: WebAPI.Schedule.IScheduleManager;
	public readonly userStatsManager: WebAPI.Statistics.IUserStatsManager;
	public readonly commands: CommandsHandling.ICommandsHandler;
	public readonly userAuth: CLIUserAuthentication.IAuthenticationManager;
	public readonly mailer: Mailer.IMailer;

	public get isHTTPS(): boolean {
		return this.server?.webServer.isHTTPS ?? false;
	}

	private async _start() {
		await this.fs.clearTempDirectories();

		await this.mailer.testConfiguration();
		await this.mailer.loadTemplates();
}

	private constructor(filesystem: IFileSystem, envConfig: IEnvironmentConfig) {
		this.fs = filesystem;
		this.env = envConfig;
		this.localDownloads = new DownloadsManager();
		this.mysqlController = new MysqlController(this.env.mysql);
		this.webAuthManager = new WebAuthManager(this.mysqlController);
		this.scheduleManager = new ScheduleManager(this.mysqlController);
		this.userStatsManager = new UserStatsManager(this.mysqlController);
		this.commands = new CommandsHandler();
		this.userAuth = new AuthenticationManager(this.env.auth);
		this.mailer = new Mailer(this.env.environmentName,envConfig.externalServices.Mailtrap);

		Output.category("debug").print("notice","Loader finished initializing environment.");

		waitFor(0).then(async ()=>{
			registerCommands();

			const env = global.app.env;

			if(env.server.https) {
				const key = await global.app.fs.local().load(env.server.https.key ?? "");
				const cert = await global.app.fs.local().load(env.server.https.cert ?? "");
				if(key&&cert) {
					env.server.https.key = key;
					env.server.https.cert = cert;
				}else env.server.https = undefined;
			} 

			try {
				this.server = new FramAPI(Addr.getPort(),Addr.getAddress(),env.server.https);
			} catch (error: any) {
				function emitErr(error: any) {
					error = error ?? {};
					error.message = `Couldn't create FramAPI instance. Error: ${error.message ?? "Unknown"}`;
					Output.category("debug").print("error",error);
				}
				emitErr(error);

				if(error.mayBeCausedByHTTPS) {
					Output.category("debug").print("notice","Retrying FramAPI instance creation without HTTPS config.");
					try {
						this.server = new FramAPI(Addr.getPort(), Addr.getAddress());
					} catch (error) {
						emitErr(error);
					}
				}
			}

			if(!this.server) {
				Output.category("general").print(`Couldn't start the server. Additional information can be found in the error stream.`);
				return;
			}

			this.server.on("Debug",data=>{
				Output.category("debug").print("notice",data,"framapi");
			});

			try {
				await this.mysqlController.testConnection();
			} catch (error: any) {
				Output.category("general").print(`Couldn't connect with the mysql server.`);
				Output.category("debug").print("error",new Error((error as MysqlError).message));

				if(env.flags.allowNoMysqlRuns) {
					Output.category("debug").print("warning","[Warning] Server will continue to work because of the set flag. Most features will be unavailable. Don't use in production");
				}else {
					Output.category("general").print(`Server will terminate.`);
					this.server.close();
					return;
				}
				
			}
	
			this.server.on("APIServerStarted",()=>{
				const address = Addr.getAddress();
				if(address=="0.0.0.0") {
					const port = Addr.getPort();
					const output = Output.category("general");

					output.print(`Server started on all supported IPv4 addresses on port ${port}.`).
					print("Available aliases: ");

					const aliases = Addr.getAllIPv4Addresses();
					for (const interfaceName in aliases) {
						const addresses = aliases[interfaceName];

						for (const address of addresses) {
							output.print(`\thttp://${address}:${port}`);
						}
					}
					
				}else {
					Output.category("general").print(`Server started at ${Addr.getAddress()}:${Addr.getPort()}.`);
				}
				
				this._start();
			});

			this.server.socketServer.options.clientInactivityTimeout = global.app.env.clientInactivityTimeout;

			this.server.socketServer.onConnection = data=>{
				data.datastore.set("colorsMode",data.handshakeData.colorsMode ?? "colorless");
				data.datastore.set("clientVersion",data.handshakeData.clientVersion ?? "Unknown");

				if(global.app.userAuth.isActive) {
					const authKey = data.handshakeData.authKey;
					if(authKey||global.app.env.flags.requireAuthentication) {
						const authResult = this.userAuth.authenticateUser(authKey ?? "",data.remoteAddress);
						if(authResult) {
							data.datastore.set("authToken",authResult.token);
							data.datastore.set("username",authResult.userName);
						}else return {action: "reject",reason: authKey?"Authentication key is invalid.":"Server requires authentication."}
					}else data.datastore.set("username","Anonymous");
				}
				
				try {
					data.datastore.set("int_clientVersion",data.handshakeData.clientVersion=="Unknown"?0:computeVersion(data.handshakeData.clientVersion));
				}catch(error) {
					Output.category("debug").print("warning",`[Connection] Client provided invalid version. ${error} [client.dataStore.clientVersion]`)
					data.datastore.set("clientVersion","Unknown");
					data.datastore.set("int_clientVersion",0);
				}

				return {action: "accept"};
			}

			this.server.socketServer.clients.events.on("ClientDisconnected", data=>{
				const client = this.server?.socketServer.clients.get(data.clientID);
				if(client&&client.datastore.has("authToken")) {
					this.userAuth.deauthenticateUser(client.datastore.get("authToken"));
				}
			}); 

			this.server.socketServer.manifestHandler = ()=>{
				return {
					manifestVersion: 1,
					version: this.version,
					serverName: this.env.server.name,
					serverType: this.env.server.type,
					quota: {
						state: false,
						limit: 0,
						resetDay: 1,
						currentUsage: 0
					},
					subscriptions: this.server?.socketServer.subscriptions.getAll()
				};
			}
	
			this.server.commandsExecutionCallback = commandRequestHandler;

			await this.server.configureApp(FastifyInit);
	
			this.server.start();
		});
	}

	public async reload() {
		this._start();
	}

	public async shutdown() {
		await this.server?.close();
	}

	public static async initialize() {
		if(process.env.DEBUGGER_DELAY) await waitFor(parseInt(process.env.DEBUGGER_DELAY ?? "0"));

		global.APP_ROOT = __dirname(import.meta.url);

		let fs = await import("./modules/fs/files.js");

        if(!fs) {
			Output.category("debug").print("error",new Error(" Error: Couldn't load files module."));
			process.exit();
		}else {
			let env = await initializeEnvironment(fs.local()).catch(async err=>{
				console.log(err.message);
				process.exit();
			});
			fs.passConfigs(env.fs.config);
			
			global.logs = new LogsCollections(await fs.useProvider("local") as IfsProvider);
			await global.logs.initialize(env);

			return new App(fs,env);
		}
	}
}


//Application entry point. Start of it all.
global.app = await App.initialize();