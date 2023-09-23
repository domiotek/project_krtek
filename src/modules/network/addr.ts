import {networkInterfaces} from 'os';

/**
 * Returns IP of address for server to listen on
 * @returns {string} IP address
 */
export function getAddress() {
    let address
    switch(global.app.env.server.addressMode) {
        case "address": 
            address = global.app.env.server.address
        case "interface": 
            let configurations = networkInterfaces()[global.app.env.server.interfaceName];
            if(configurations){
                if(configurations[1].family=='IPv4') address = configurations[1].address
                else address = configurations[0].address;
            }
    }
    return address?address:"127.0.0.1";
}

/**
 * Returns Port for server to listen on
 * @returns {number}
 */
export function getPort(): number {
    return (global.app.env.server.port=="auto"?parseInt(process.env.PORT ?? "0"):global.app.env.server.port) ?? 3000;
}