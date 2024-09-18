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
const totalRooms= {} as {[key:string]:{users:string[]}};

io.on('connection',(socket:any)=>{
    console.log(`Client connected. socket: ${socket.id}`);

    socket.on('join',(data:{room:string})=>{
        if(!data?.room) return;

        socket.join(data.room);

        if(!totalRooms[data.room]){
            totalRooms[data.room]= {users:[]};
        }

        totalRooms[data.room].users.push(socket.id);
        socket.room=data.room;

        console.log(`Join room ${data.room}. Socket ${socket.id}`);
    });

    socket.on('offer', (data:{sdp:string; room:string})=>{
        socket.io(data.room).emit('offer', {sdp:data.sdp, sender:socket.id});
    });
    
    socket.on('answer', (data:{sdp:string; room:string})=>{
        socket.to(data.room).emit('answer', {sdp:data.sdp,sender:socket.id});
    });

    socket.on('candidaate', (data:{candidate:string; room:string})=>{
        socket.to(data.room).emit('candidate',{canadidate: data.candidate, sender:socket.id});
    });

    socket.on('disconnct',()=>{
        if(socket.room && totalRooms[socket.room]){
            totalRooms[socket.room].users= totalRooms[socket.room].users.filter(
                (id)=>id!==socket.id
            );
        }
        if(totalRooms[socket.room].users.length===0){
            delete totalRooms[socket.room]
        }
        console.log('Client disconnected');
    });
});

server.listen(8080,()=>{
    console.log('Listening on port 8080');
})
