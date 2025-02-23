const socketProtocol = 'ws:';
const echoSocketUrl = socketProtocol + '//' + window.location.hostname + ':3001/dev-server/';
const socket = new WebSocket(echoSocketUrl);

socket.addEventListener('message', async (msg) => {
  if (msg.data === 'refresh:client') {
    window.location.reload();
  }
});
