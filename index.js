//https://bluemiv.tistory.com/96 기반으로 작성된 서버 코드
/**
 * 프로세스
 * connect: peeere와 server가 소켓 연결을 하는 단계
 * join: 화상채팅을 위한 채팅방에 접속하는 단계
 * offer: 화상채팅을하기 위해 peer가 메세지를 보내는 단계
 * answer: 다른 peer에게 offer에 대한 응답 메세지를 보내는 단계
 * candidate: 각 peer는 자신이 덷이터를 보낼 수 있는 네트워크 경로(후보, cnadidate)를 찾기 위해 ICE프로세스를 수행
 * disconnect: 화상채팅을 종료하고 connection을 종료하는 단계
 *
 * offer와 answer 단계엥서는 peeer의 네ㅡ워크 및 미디어 설정을 dsp포맷으로 주고 받음
 */
var express = require('express');
var http = require('http');
var socketIo = require('socket.io');
var app = express();
var server = http.createServer(app);
var io = socketIo(server, {
    cors: {
        origin: true
    }
});
var totalRooms = {};
io.on('connection', function (socket) {
    console.log("Client connected. socket: ".concat(socket.id));
    socket.on('join', function (data) {
        if (!(data === null || data === void 0 ? void 0 : data.room))
            return;
        socket.join(data.room);
        if (!totalRooms[data.room]) {
            totalRooms[data.room] = { users: [], ready: new Set() };
        }
        totalRooms[data.room].users.push(socket.id);
        socket.room = data.room;
        console.log("Join room ".concat(data.room, ". Socket ").concat(socket.id));
    });
    socket.on('ready', function () {
        var room = socket.room;
        if (!room || !totalRooms[room])
            return;
        //사용자 ready상태에 추가
        totalRooms[room].ready.add(socket.id);
        console.log("Socket ".concat(socket.id, "is ready in room ").concat(room));
        //모든 사용자 ready 상태인지 확인
        if (totalRooms[room].ready.size === 2) {
            console.log(totalRooms[room]);
            console.log("#All users in room ".concat(room, " are ready"));
            //모든 사용자 ready상태일 경우 allReady상태 전송
            io.to(room).emit('allReady');
        }
    });
    socket.on('offer', function (data) {
        console.log("offer");
        socket.to(data.room).emit('offer', { sdp: data.sdp, sender: socket.id });
    });
    socket.on('answer', function (data) {
        console.log("answer");
        socket.to(data.room).emit('answer', { sdp: data.sdp, sender: socket.id });
    });
    socket.on('candidate', function (data) {
        console.log("candidate");
        socket.to(data.room).emit('candidate', { candidate: data.candidate, sender: socket.id });
    });
    socket.on('screenSharing', function (data) {
        var room = data.room, isScreenSharing = data.isScreenSharing;
        console.log("\uBC29 ".concat(room, "\uC5D0\uC11C \uD654\uBA74\uACF5\uC720\uC0C1\uD0DC: ").concat(isScreenSharing));
        socket.to(room).emit('screenSharing', { isScreenSharing: isScreenSharing, sender: socket.id });
    });
    socket.on('callEnded', function (msg) {
        socket.to(msg.room).emit('callEnded');
    });
    socket.on('disconnect', function () {
        if (socket.room && totalRooms[socket.room]) {
            totalRooms[socket.room].users = totalRooms[socket.room].users.filter(function (id) { return id !== socket.id; });
        }
        if (totalRooms[socket.room] && totalRooms[socket.room].users.length === 0) {
            delete totalRooms[socket.room];
        }
        console.log('Client disconnected');
    });
});
server.listen(8080, function () {
    console.log('Listening on port 8080');
});
