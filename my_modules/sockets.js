exports.emitToAllClients = function (io, event, data) {
  fsock = io.sockets.sockets;
  for (const socket of fsock) {
    socket[1].emit(event, data);
  }
};

exports.emitPreparedToAllClients = function (io, event, type, data) {
  fsock = io.sockets.sockets;
  for (const socket of fsock) {
    socket[1].emit(event, {
      type: type,
      data: data,
    });
  }
};