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
        break;
        case "interface": 
           const addresses = getAllIPv4Addresses();
           address = addresses[global.app.env.server.interfaceName][0];
    }
    return address ?? "127.0.0.1";
}

/**
 * Returns all IPv4 addresses on the system, regardless of the environment settings.
 * @returns Map of interfaces with the addresses bound to them.
 */
export function getAllIPv4Addresses() {
    const result: {[interfaceName: string]: string[]} = {};
    
    const interfaces = networkInterfaces();
    for (const interfaceName in interfaces) {
        const netInterface = interfaces[interfaceName] as NonNullable<typeof interfaces[0]>
        result[interfaceName] = [];

        for (const config of netInterface) {
            if(config.family=="IPv4") {
                result[interfaceName].push(config.address);
            }
        }
    }

    return result;
}

/**
 * Returns Port for server to listen on
 * @returns {number}
 */
export function getPort(): number {
    return (global.app.env.server.port=="auto"?parseInt(process.env.PORT ?? "0"):global.app.env.server.port) ?? 3000;
}