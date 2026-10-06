process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
require('./dist/tracing');
const app = require('./dist/app').default;
const server = app.listen(4000, '127.0.0.1', () => {
  console.log('Backend listening on http://127.0.0.1:4000');
});
server.on('error', (err) => {
  console.error('SERVER ERROR:', err);
});