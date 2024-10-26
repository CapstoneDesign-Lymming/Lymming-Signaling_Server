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
const express =require('express');
const http = require('http');
const socketIo= require('socket.io');

const app= express();
const server= http.createServer(app);
const io = socketIo(server,{
    cors:{
        origin:true
    }
});
const totalRooms= {} as {[key:string]:{users:string[],ready:Set<string>}};

io.on('connection',(socket:any)=>{
    console.log(`Client connected. socket: ${socket.id}`);

    socket.on('join',(data:{room:string})=>{
        if(!data?.room) return;

        socket.join(data.room);
        if(!totalRooms[data.room]){
            totalRooms[data.room]= {users:[],ready: new Set()};
        }

        totalRooms[data.room].users.push(socket.id);
        socket.room=data.room;

        console.log(`Join room ${data.room}. Socket ${socket.id}`);
    });

    socket.on('ready',()=>{
        const room = socket.room;
        if(!room || !totalRooms[room])return;

        //사용자 ready상태에 추가
        totalRooms[room].ready.add(socket.id);
        console.log(`Socket ${socket.id}is ready in room ${room}`);
        console.log(`${totalRooms[room].users}`);
        console.log("룸 크기",totalRooms[room].ready.size)
        console.log("----end ready log----");
        //모든 사용자 ready 상태인지 확인
        if(totalRooms[room].ready.size === 2){
            console.log(totalRooms[room]);
            console.log(`#All users in room ${room} are ready`);
            //모든 사용자 ready상태일 경우 allReady상태 전송
            io.to(room).emit('allReady');
        }
    });

    socket.on('offer', (data:{sdp:string; room:string})=>{
        console.log("offer")
        socket.to(data.room).emit('offer', {sdp:data.sdp, sender:socket.id});
    });

    socket.on('answer', (data:{sdp:string; room:string})=>{
        console.log("answer");
        socket.to(data.room).emit('answer', {sdp:data.sdp,sender:socket.id});
    });

    socket.on('candidate', (data:{candidate:string; room:string})=>{
        console.log("candidate");
        socket.to(data.room).emit('candidate',{candidate: data.candidate, sender:socket.id});
    });

    socket.on('screenSharing',(data)=>{
        const {room,isScreenSharing}=data;
        console.log(`방 ${room}에서 화면공유상태: ${isScreenSharing}`)
        socket.to(room).emit('screenSharing',{isScreenSharing,sender:socket.id})
    });

    socket.on('callEnded', (msg) => {
        socket.to(msg.room).emit('callEnded');
    });
    
    socket.on('disconnect',()=>{
        if(socket.room && totalRooms[socket.room]){
            totalRooms[socket.room].users= totalRooms[socket.room].users.filter(
                (id)=>id!==socket.id
            );
            totalRooms[socket.room].ready.delete(socket.id);

        }
        if(totalRooms[socket.room] &&totalRooms[socket.room].users.length===0){
            delete totalRooms[socket.room];
        }
        console.log('Client disconnected');
    });

    socket.on('toggleMic',(data:{room: string; userId:string; isMicOn:boolean})=>{
        console.log(`User ${data.userId} toggled mic: ${data.isMicOn}`);
        socket.to(data.room).emit('toggleMic',{room:data.room, userId: data.userId, isMicOn: data.isMicOn});

    });

    socket.on('toggleVideo',(data:{room: string; userId:string; isVideoOn:boolean})=>{
        console.log(`User ${data.userId} toggled mic: ${data.isVideoOn}`);
        socket.to(data.room).emit('toggleVideo',{room:data.room, userId:data.userId, isVideoOn:data.isVideoOn});

    });
});

server.listen(8080,()=>{
    console.log('Listening on port 8080');
})
