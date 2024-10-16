import { selectAll, transition, easeLinear, wavMediaRecorder, registerWavEncoder, getGr } from './nl.min.js'

let state = ""
let isGeolocated = false
let filename

let mediaRecorder = null
let audioBlobs = []
let capturedStream = null
let encoderRegistered = false

// Start continuous geolocation. I think it's safe to do this
// without draining battery because I think it doesn't operate
// when tab is inactive/minimised.
navigator.geolocation.watchPosition(geolocated, geolocateFailure, {
  maximumAge: 30000, // 30 second maximum age
  timeout: 120000, // 2 minute timeout
  enableHighAccuracy: true
})

function geolocated(position) {
  if (!isGeolocated) {
    // First time in
    document.getElementById("g21-simp-record").src = "/images/record-green.png"
    isGeolocated = true
  }
  
  // Can't find a way to do this transition/animation with CSS because of
  // the need to chain transitions, so using D3
  const t = transition().duration(200).ease(easeLinear)
  selectAll(".gps-path")
    .transition(t).style("fill", "#00FF21")
    .transition(t).style("fill", "lightgrey")

  // Update position
  let lat = position.coords.latitude
  let lon =  position.coords.longitude
  lat = Math.round(lat * 100000) / 100000
  lon = Math.round(lon * 100000) / 100000
  const accuracy = Math.ceil(position.coords.accuracy)
  const altitude = position.coords.altitude ? Math.floor(position.coords.altitude) : null
  const gr = getGr(lon, lat, 'wg', 'gb', [1]).p1
  const dte = new Date()
  const year = dte.getFullYear()
  let month = String(dte.getMonth() + 1)
  let day = String(dte.getDate())
  let hour = String(dte.getHours())
  let minute = String(dte.getMinutes())
  let second = String(dte.getSeconds())
  month = month.length === 2 ? month : `0${month}`
  day = day.length === 2 ? day : `0${day}`
  hour = hour.length === 2 ? hour : `0${hour}`
  minute = minute.length === 2 ? minute : `0${minute}`
  second = second.length === 2 ? second : `0${second}`
  const dateTime = `${year}-${month}-${day}_${hour}-${minute}-${second}`
   //2015-02-14_20-54-45_53.59675_-2.51646_15_0.wav
  filename = `${dateTime}_${lat}_${lon}_${accuracy}_${altitude ? altitude : 'none'}.wav`
  
  // Update gui GR
  console.log(gr)
  document.getElementById("g21-simp-prefix").innerHTML = gr.substring(0,2)
  document.getElementById("g21-simp-e3").innerHTML = gr.substring(2,5)
  document.getElementById("g21-simp-e4").innerHTML = gr.substring(5,6)
  document.getElementById("g21-simp-e5").innerHTML = gr.substring(6,7)
  document.getElementById("g21-simp-n3").innerHTML = gr.substring(7,10)
  document.getElementById("g21-simp-n4").innerHTML = gr.substring(10,11)
  document.getElementById("g21-simp-n5").innerHTML = gr.substring(11,12)
  // Update gui accuracy
  document.getElementById("g21-simp-accuracy").innerHTML = `Accuracy: ${accuracy} m`
  // Update gui altitude
  document.getElementById("g21-simp-altitude").innerHTML = altitude ? `Altitude: ${altitude} m` : 'Altitude:'
  // Update gui lat/lng
  document.getElementById("g21-simp-latlon").innerHTML = `${lat} / ${lon}`
  // Clear any error msg
  document.getElementById("g21-simp-msg").innerHTML = ""
}

function geolocateFailure(err) {
  console.log('Geolocation failure')
  document.getElementById("g21-simp-msg").innerHTML = err.message
}

export async function startRecording() {

  if (!encoderRegistered) {
    await registerWavEncoder()
    encoderRegistered = true
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
    }
  }).then(stream => {
      audioBlobs = []
      capturedStream = stream
      mediaRecorder = wavMediaRecorder(stream)

      // Add audio blobs while recording 
      mediaRecorder.addEventListener('dataavailable', event => {
        audioBlobs.push(event.data)
      })

      mediaRecorder.start()
  }).catch((e) => {
    console.error(e)
  })
}

export function stopRecording() {
  return new Promise(resolve => {
    if (!mediaRecorder) {
      resolve(null)
      return
    }
    mediaRecorder.addEventListener('stop', () => {
      const mimeType = mediaRecorder.mimeType
      const audioBlob = new Blob(audioBlobs, { type: mimeType })
      if (capturedStream) {
        capturedStream.getTracks().forEach(track => track.stop())
      }
      resolve(audioBlob)
    })
    mediaRecorder.stop()
  })
}

export function playAudio(audioBlob) {
  if (audioBlob) {
    const audio = new Audio()
    audio.src = URL.createObjectURL(audioBlob)
    audio.play()
  }

  //audio.addEventListener('ended', PlayNext);
  //sound.pause();
  //sound.currentTime = 0;
}

export async function recordAudioWav(cancel){
  if (state === "recording"){
    // STOP recording
    const audioBlob = await stopRecording()
    if (!cancel) {
      playAudio(audioBlob)
      downloadBlob(audioBlob, filename)
    }
    
    state = ""
    document.getElementById("g21-simp-bin").src = "/images/bin-grey.png"
    const elMicrophone = document.getElementById("g21-simp-record")
    elMicrophone.src = "/images/record-green.png"
    elMicrophone.classList.remove("flashing")
  }
  else {
    // START recording
    await startRecording()
    state = "recording"
    document.getElementById("g21-simp-bin").src = "/images/bin-orange.png"
    const elMicrophone = document.getElementById("g21-simp-record")
    elMicrophone.src = "/images/record-red.png"
    elMicrophone.classList.add("flashing")
  }
}

export function cancelRecording() {
  if (state = "recording") {
    recordAudioWav(true)
    document.getElementById("g21-simp-bin").src = "/images/bin-grey.png"
  }
}

function downloadBlob(blob, name) {
  // Convert your blob into a Blob URL (a special url that points to an object in the browser's memory)
  const blobUrl = URL.createObjectURL(blob)
  // Create a link element
  const link = document.createElement("a")
  // Set link's href to point to the Blob URL
  link.href = blobUrl
  link.download = name
  // Append link to the body
  document.body.appendChild(link)
  // Dispatch click event on the link
  // This is necessary as link.click() does not work on the latest firefox
  link.dispatchEvent(
    new MouseEvent('click', { 
      bubbles: true, 
      cancelable: true, 
      view: window 
    })
  )
  // Remove link from body
  document.body.removeChild(link)
}

