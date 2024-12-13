from flask import Flask, render_template, Response, jsonify, request
import os
import queue
import sounddevice as sd
from vosk import Model, KaldiRecognizer
import threading
import time

app = Flask(__name__)

# Path to the Vosk model
model_path = "vosk-model-small-en-in-0.4"

# Initialize variables
recognizer = None
audio_queue = queue.Queue()
transcription_queue = queue.Queue()
is_listening = False
audio_thread = None

# Initialize Vosk model
if os.path.exists(model_path):
    model = Model(model_path)
    recognizer = KaldiRecognizer(model, 16000)
else:
    raise FileNotFoundError(f"Model not found at {model_path}. Download from https://alphacephei.com/vosk/models")

# Audio processing thread
def audio_stream():
    global is_listening
    def callback(indata, frames, time, status):
        if status:
            print(f"Audio error: {status}")
        audio_queue.put(bytes(indata))

    try:
        with sd.RawInputStream(samplerate=16000, blocksize=8000, dtype="int16",
                               channels=1, callback=callback):
            print("Listening for audio input...")
            while is_listening:
                data = audio_queue.get()
                if recognizer.AcceptWaveform(data):
                    result = recognizer.Result()
                    transcription_queue.put(result[14: len(result) - 3])
    except Exception as e:
        print(f"Audio stream error: {e}")

@app.route('/reset', methods=['POST'])
def reset():
    global is_listening, audio_thread

    # Stop any ongoing processing
    if is_listening:
        is_listening = False
        if audio_thread:
            audio_thread.join()
        audio_thread = None

    return jsonify({"status": "reset"})

# SSE endpoint to stream transcription results
@app.route('/stream')
def stream():
    def generate():
        while is_listening:
            if not transcription_queue.empty():
                result = transcription_queue.get()
                yield f"data: {result}\n\n"
            time.sleep(0.1)
    return Response(generate(), mimetype="text/event-stream")

# Start/Stop endpoint
@app.route('/control', methods=['POST'])
def control():
    global is_listening, audio_thread
    action = request.json.get('action')

    if action == 'start' and not is_listening:
        is_listening = True
        audio_thread = threading.Thread(target=audio_stream, daemon=True)
        audio_thread.start()
        return jsonify({"status": "started"})
    elif action == 'stop' and is_listening:
        is_listening = False
        if audio_thread:
            audio_thread.join()
        return jsonify({"status": "stopped"})
    return jsonify({"status": "no action"})

# Home route
@app.route('/')
def home():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8080)
