import { useState } from 'react';
import './App.css';

type TunerProps = {

}

function Tuner() {
  const [isMic, setIsMic] = useState(false)

  const onClickMic = () => {
    setIsMic(!isMic)
  }

  const audioContext = new window.AudioContext();
  const analyserNode = audioContext.createAnalyser()

  return (
    <div className="Tuner">
      <button onClick={onClickMic}>{ }</button>
    </div>
  );
}

export default Tuner;
