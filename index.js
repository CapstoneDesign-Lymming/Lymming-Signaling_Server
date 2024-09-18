/**
 * on : 현재 접속되어 있는 클라이언트로부터 메세지를 수신
 * io.on('connection' ,function(){}); 
 * connection: socket.io의 기본 이벤트, 
 * 사용자가 웹사이트에 접속하면 자동으로 발생하는 이벤트
 * socket.on:  해당 클라이언트에서 메세지를 보낸다.
 * 
 * io.emit : 서버가 현재 접속해있는 모든 클라이언트에게 이벤트를 전달
 * socket.emit : 서버쪽에서 event를 발생시키는 함수 
 *              서버에서 이벤트 발생시키면 클라이언트 페이지의 해당 이벤트 리스너에서 처리
 *              해당 소켓을 통해 클라이언트에게 메시지 전송
 */
const express=require('express');
const http = require('http');
const socketIo=require('socket.io');
const cors= require('cors');

const app= express();
app.use(cors());

const server=http.createServer(app);
const io= socketIo(server,{
    cors:{
        origin: "http://localhost:5173", // 요청을 허용할 도메인
        methods: ["GET", "POST"],
        credentials: true,
    }
})

let users={};
let socketToRoom={};
const maximum=2;

io.on("connection",socket=>{
    socket.on("join_room",data=>{
        //user[room]: room에 있는 사용자들이 배열형태로 저장됨
        if(users[data.room]){//room이 존재한다면
            const length=users[data.room].length;
            if(length ===maximum){ //최대 인원을 충족시켰으면 더 이상 접속 불가
                socket.to(socket.id).emit("room_full");
                return;
            }
            //인원이 최대 인원보다 적으면 접속 가능
            users[data.room].push({id:socket.id,email:data.email});
        }
        else{ //room이 존재하지 않는다면 새로 생성
            users[data.room]=[{id:socket.id,email:data.email}];
        }
        //해당 소켓이 어느 room에 속해있는지 알기위해 저장
        socketToRoom[socket.id]=data.room;

        socket.join(data.room);
        console.log(`[${socketToRoom[socket.id]}]: ${socket.id} enter`);

        //본인을 제외한 같은 room의 user array
        const usersInThisRoom= users[data.room].filter(
            user=>user.id!==socket.id
        );
        console.log(usersInThisRoom);

        //본인에게 해당 user array를 전송한다.
        //새로 접속하는 user가 이미 방에 있는 user들에게 offer(signal)를 보내기 위해
        io.sockets.to(socket.id).emit("all_users",usersInThisRoom);
    });

    //다른 user들에게 offer를 보냄 (자신의 RTCSessionDescription)
    socket.on("offer",sdp=>{
        console.log("offer: "+socket.id);
        //room에는 두 명 밖에 없으므로 broadcast 사용해서 전달
        socket.broadcast.emit("getOffer",sdp);
    });

    //offer를 보낸 user에게 answer을 보냄 (자신의 RTCSessionDescription)
    socket.on("answer",sdp=>{
        console.log("answer: "+socket.id);
        socket.broadcast.emit("getAnswer",sdp);
    });
    //자신의 ICECandidate정보를 signal(offer 또는 answer)을 주고 받은 상대에게 전달
    socket.on("candidate",candidate=>{
        console.log("candidate: "+socket.id);
        socket.broadcast.emit("getCandidate",candidate);
    });

    //user가 연결이 끊겼을 때 처리
    socket.on("disconnect",()=>{
        console.log(`[${socketToRoom[socket.id]}]:${socket.id} exit`);
        //disconnction한 user가 포함된 roomID
        const roomID= socketToRoom[socket.id];
        //room에 포함된 유저
        let room=users[roomID];
        if(room){
            room=room.filter(user=>user.id!== socket.id);
            users[roomID]=room;
        }
        //어떤 user가 나갔는지 room의 다른 user들에게 통보
        socket.broadcast.to(room).emit("user_exit",{id:socket.id});
        console.log(users);
    });
});

const PORT=8080;
server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})