import 'bootstrap/dist/css/bootstrap.min.css';
import { PitchDetector } from 'pitchy';
import { useEffect, useState } from 'react';
import { Button, Col, Container, Row } from 'react-bootstrap';
import { Mic } from 'react-bootstrap-icons';
import './App.css';

const AudioState = {
  Prompt: "prompt",
  Granted: "granted",
  Denied: "denied",
  Unknown: "unkown",
}

const Note = ["A", "A#/B♭", "B", "C", "C#/D♭", "D", "D#/E♭", "E", "F", "F#/G♭", "G", "G#/A♭"]
const TunerCanvasID = "tuner-canvas"

type MicButtonContentProps = {
  color: string,
  text: string
}

function App() {
  const [audioState, setAudioState] = useState(AudioState.Unknown)
  const [pitchStandard, setPitchStandard] = useState(440)

  const [note, setNote] = useState("-")
  const [octave, setOctave] = useState(-1)
  const [accuracy, setAccuracy] = useState(0)

  useEffect(() => {
    var intervalId = -1
    if (audioState === AudioState.Granted) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          intervalId = window.setInterval(updateFactory(stream), 100)
        })
    }
    return () => {
      if (intervalId != -1) {
        clearInterval(intervalId)
        setNote("-")
        setOctave(-1)
        setAccuracy(0)
      }
    }
  }, [audioState])

  useEffect(() => {
    let isClose = false
    const canvas = document.getElementById(TunerCanvasID) as HTMLCanvasElement
    const context = canvas.getContext("2d") as CanvasRenderingContext2D
    context.setTransform(1, 0, 0, 1, canvas.width / 2, canvas.height * 0.8)

    const radius = canvas.height * 0.5
    const radiusTuner = canvas.height * 0.55
    let degree = 90

    function drawTuner(context: CanvasRenderingContext2D) {
      const degreeLeft = 40
      const degreeRight = 140
      context.beginPath()
      context.moveTo(0, 0)
      context.lineTo(radiusTuner * Math.cos(Math.PI * degreeLeft / 180), -radiusTuner * Math.sin(Math.PI * degreeLeft / 180))
      context.moveTo(0, 0)
      context.lineTo(radiusTuner * Math.cos(Math.PI * degreeRight / 180), -radiusTuner * Math.sin(Math.PI * degreeRight / 180))

      context.arc(0, 0, radiusTuner, -Math.PI * degreeRight / 180, -Math.PI * degreeLeft / 180)
      context.font = "20px Arial"
      for (let degree = 45; degree <= 135; degree = degree + 5) {
        let length = degree % 10 == 5 ? 0.02 : 0.04
        const start = 0.43
        if (degree % 10 != 5) {
          const measure = (-(degree - 90) / 10).toString()
          context.fillText(measure, -context.measureText(measure).width / 2 + radius * Math.cos(Math.PI * degree / 180), -radius * Math.sin(Math.PI * degree / 180))
          length = 0.04
        }
        context.moveTo(canvas.height * start * Math.cos(Math.PI * degree / 180), -canvas.height * start * Math.sin(Math.PI * degree / 180))
        context.lineTo(canvas.height * (start + length) * Math.cos(Math.PI * degree / 180), -canvas.height * (start + length) * Math.sin(Math.PI * degree / 180))
      }
      context.stroke()
    }

    function draw() {
      context.save()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.restore()

      drawTuner(context)

      context.beginPath();
      context.moveTo(0, 0)
      context.lineTo(radius * Math.cos(Math.PI * degree / 180), -radius * Math.sin(Math.PI * degree / 180))

      context.stroke()

      const curDegree = Number.parseFloat(canvas.getAttribute('data-val') as string) + 90
      const diff = curDegree - degree
      let d = diff != 0 ? (curDegree - degree) / (Math.abs((curDegree - degree)) + 0.1) : 0
      if (degree <= 40) d = 1
      else if (degree >= 140) d = -1
      degree += d * 0.4

      if (!isClose) requestAnimationFrame(draw)
    }
    draw()
    return () => { isClose = true }

  }, [])
  const canvas = document.getElementById(TunerCanvasID) as HTMLCanvasElement

  var lastUpdate = 0
  var top = 100


  const onClickMic = () => {
    if (audioState === AudioState.Unknown || audioState === AudioState.Prompt) {
      const x = navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => { setAudioState(AudioState.Granted) })
        .catch(() => { setAudioState(AudioState.Denied) })
    }
    else if (audioState === AudioState.Granted) {
      setAudioState(AudioState.Prompt)
    }
  }


  const micButtonContent: { [id: string]: MicButtonContentProps } = {
    prompt: {
      color: "btn-danger",
      text: "Press the button to turn on the tuner"
    },
    granted: {
      color: "btn-success",
      text: "Press the button to turn off the tuner"
    },
    denied: {
      color: "btn-secondary",
      text: "You cannot use the tuner. Microphone permission is required."
    },
    unkown: {
      color: "btn-danger",
      text: "Press the button to turn on the tuner"
    },
  }

  function updateFactory(stream: MediaStream) {
    const audioContext = new window.AudioContext();
    const analyserNode = audioContext.createAnalyser()
    audioContext.createMediaStreamSource(stream).connect(analyserNode);
    const detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
    const input = new Float32Array(detector.inputLength);

    function update() {
      analyserNode.getFloatTimeDomainData(input);
      const [pitch, clarity] = detector.findPitch(input, audioContext.sampleRate);
      if (pitch >= pitchStandard / 4 && pitch <= pitchStandard * 8) {
        const score = 12 * Math.log(pitch / pitchStandard) / Math.log(2)
        const roundedScore = Math.round(score)
        var note = roundedScore % 12
        setNote(Note[note >= 0 ? note : note + 12])
        setOctave(Math.floor(score / 12 + 4))
        setAccuracy(Math.round((score - roundedScore) * 100))
        lastUpdate = Date.now()
      } else if (Date.now() - lastUpdate > 3000) {
        setNote("-")
        setOctave(-1)
        setAccuracy(0)
      }
    }
    return update
  }


  return (
    <Container className="App p-3">
      <Row className="justify-content-center">
        <Col xs="4" className="text-center h1">
          Octave
        </Col>
        <Col xs="4" className="text-center h1">
          Note
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col xs="4" className="text-center h1">
          {octave != -1 ? octave : "-"}
        </Col>
        <Col xs="4" className="text-center h1">
          {note}
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col xs="8" className="text-center h1">
          Accuracy
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col id="tunner" xs="8" className="text-center h1">
          <canvas id={TunerCanvasID} width="500px" height="500px" data-val={accuracy} />
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col xs="8" className="text-center h1">
          <Button className={`${micButtonContent[audioState].color} p-0`} style={{ "borderRadius": "5rem" }} onClick={onClickMic}><Mic className="p-2" width="4rem" height="4rem" /></Button>
        </Col>
        <Col xs="8" className="text-center h1">
          {micButtonContent[audioState].text}
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col xs="8" className="text-center h1">
        </Col>
      </Row>
    </Container >
  );
}

export default App;
