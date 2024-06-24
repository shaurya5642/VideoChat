
const appId = process.env.APP_ID;
console.log(`App ID: ${ef0b94620a364dcaa512c302b68c79da}`);



let token = null;
let uid = String(Math.floor(Math.random() * 5000))

let client;
let channel;

let queryString = window.location.search
let urlPrams = new URLSearchParams(queryString)
let roomId = urlPrams.get('room')

if(!roomId){
    window.location = 'lobby.html'
}

let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers:[
        {
            urls: ['stun:stun1.1.google.com:19302','stun:stun2.1.google.com:19302']
        }
    ]
}

let constrainst =  {
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080},
    },
    audio:true
}

let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid, token})

    //index.html?room -2345452
    channel = client.createChannel(roomId)
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer', handelMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia(constrainst)
    document.getElementById('user-1').srcObject = localStream
}


let handleUserLeft = (MemberId) => {
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('smallFrame')
}

let handelMessageFromPeer = async (message, MemberId) => {

    message = JSON.parse(message.text)

    if(message.type === 'offer'){
        createAnswer(MemberId, message.offer)
    }

    if(message.type === 'answer'){
        addAnswer(message.answer)
    }
     
    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }


}

let handleUserJoined = async (MemberId) =>{
    console.log('A new user has joined the channel:', MemberId)
    createOffer(MemberId)
}


let createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers)

    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block'

    document.getElementById('user-1').classList.add('smallFrame')

    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:true})
        document.getElementById('user-1').srcObject = localStream
    }

    localStream.getTracks().forEach((tracks) => {
        peerConnection.addTrack(tracks,localStream)
    })

    peerConnection.ontrack= (event) =>{
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate','candidate':event.candidate})}, MemberId)
        }
    }
}

let createOffer = async (MemberId) =>{
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'offer','offer':offer})}, MemberId)
}


let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer','answer':answer})}, MemberId)
}


let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel = async () => {
    await channel.leave() 
    await client.logout()
}

let toggleCamera = async () => {
     let videoTracks = localStream.getTracks().find(tracks => tracks.kind === 'video')

     if(videoTracks.enabled){
        videoTracks.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)'   
     } else{
        videoTracks.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
     }
}

let toggleMic = async () => {
    let audioTracks = localStream.getTracks().find(tracks => tracks.kind === 'audio')

    if(audioTracks.enabled){
       audioTracks.enabled = false
       document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'   
    } else{
       audioTracks.enabled = true
       document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
    }
}

window.addEventListener('beforeunload', leaveChannel)

document.getElementById('camera-btn').addEventListener('click',toggleCamera)
document.getElementById('mic-btn').addEventListener('click',toggleMic)


init()
