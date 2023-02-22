export function log(...args: any[]) {
    console.log('websocket🥧:', ...args);
}
export function logError(...args: any[]) {
    try {
        console.log('websocket🥧: error context: ', JSON.stringify(args));
    } catch (e) {
        // Ignore, if stringify fails, just don't log the extra context
    }
    console.error('websocket🥧:', ...args);
}