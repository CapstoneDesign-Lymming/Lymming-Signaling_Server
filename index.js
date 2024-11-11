"use strict";
exports.__esModule = true;
var express = require("express");
var http = require("http");
var socketIo = require("socket.io");
var app = express();
var server = http.createServer(app);
var io = socketIo(server, {
    cors: {
        // origin: "https://lymming.link/",
        origin: true
    }
});
// let isAnswerSent = false;
// "/" 경로 응답 추가
app.get("/", function (req, res) {
    res.send("WebRTC signaling server is running.");
});
var totalRooms = {};
io.on("connection", function (socket) {
    console.log("Client connected. socket: ".concat(socket.id));
    socket.on("join", function (data) {
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
    socket.on("ready", function () {
        var room = socket.room;
        if (!room || !totalRooms[room])
            return;
        //사용자 ready 상태에 추가
        //!
        totalRooms[room].ready.add(socket.id);
        console.log("Socket ".concat(socket.id, "is ready in room ").concat(room));
        console.log("".concat(totalRooms[room].users));
        console.log("룸 크기", totalRooms[room].ready.size);
        console.log("----end ready log----");
        //모든 사용자 ready 상태인지 확인
        if (totalRooms[room].ready.size === 2) {
            console.log(totalRooms[room]);
            console.log("#All users in room ".concat(room, " are ready"));
            //모든 사용자 ready상태일 경우 allReady상태 전송
            io.to(room).emit("allReady");
        }
    });
    socket.on("offer", function (data) {
        console.log("offer 받음"); //TODO: offer보낼때 sdp와 answer보낼때 sdp보기
        try {
            socket.to(data.room).emit("offer", { sdp: data.sdp, sender: socket.id });
            console.log("🔨offer 보냄");
        }
        catch (error) {
            console.log("emit offer error", error);
        }
    });
    socket.on("answer", function (data) {
        console.log("answer 받음");
        try {
            //FIXME: answer보냄 안됨
            socket.to(data.room).emit("answer", { sdp: data.sdp, sender: socket.id });
            console.log("🚀answer 보냄");
        }
        catch (error) {
            console.log(error);
        }
    });
    socket.on("candidate", function (data) {
        console.log("candidate 받음");
        try {
            socket.to(data.room).emit("candidate", {
                candidate: data.candidate,
                sender: socket.id
            });
            console.log("candidate보냄");
        }
        catch (error) {
            console.log("candidate", error);
        }
    });
    socket.on("screenSharing", function (data) {
        var room = data.room, isScreenSharing = data.isScreenSharing;
        console.log("\uBC29 ".concat(room, "\uC5D0\uC11C \uD654\uBA74\uACF5\uC720\uC0C1\uD0DC: ").concat(isScreenSharing));
        socket
            .to(room)
            .emit("screenSharing", { isScreenSharing: isScreenSharing, sender: socket.id });
    });
    socket.on("callEnded", function (msg) {
        socket.to(msg.room).emit("callEnded");
    });
    socket.on("disconnect", function () {
        if (socket.room && totalRooms[socket.room]) {
            totalRooms[socket.room].users = totalRooms[socket.room].users.filter(function (id) { return id !== socket.id; });
            totalRooms[socket.room].ready["delete"](socket.id);
        }
        if (totalRooms[socket.room] && totalRooms[socket.room].users.length === 0) {
            delete totalRooms[socket.room];
        }
        console.log("Client disconnected");
    });
    socket.on("toggleMic", function (data) {
        console.log("User ".concat(data.userId, " toggled mic: ").concat(data.isMicOn));
        socket.to(data.room).emit("toggleMic", {
            room: data.room,
            userId: data.userId,
            isMicOn: data.isMicOn
        });
    });
    socket.on("toggleVideo", function (data) {
        console.log("User ".concat(data.userId, " toggled mic: ").concat(data.isVideoOn));
        socket.to(data.room).emit("toggleVideo", {
            room: data.room,
            userId: data.userId,
            isVideoOn: data.isVideoOn
        });
    });
});
var PORT = process.env.PORT || 8080;
server.listen(PORT, function () {
    console.log("Listening on port ".concat(PORT));
});
