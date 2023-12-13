export function log(...args: any[]) {
    console.log('websocket🥧:', ...args);
}
export function logError(...args: any[]) {
    try {
        console.trace('websocket🥧: error trace');
        console.error('websocket🥧: error context: ', JSON.stringify(args));
    } catch (e) {
        // If stringify fails, just don't log the extra context
        console.error('websocket🥧:', ...args);
    }
}