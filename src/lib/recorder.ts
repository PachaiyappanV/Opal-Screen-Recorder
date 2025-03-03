import axios from "axios";
import { v4 as uuid } from "uuid";

let videoFileName: string;
let mediaRecorder: MediaRecorder;
let recordedChunks: Blob[] = [];
let userId: string;

export const onDataAvailable = (e: BlobEvent) => {
  recordedChunks.push(e.data);
};

export const stopRecording = async (setProgress: (a: number) => void) => {
  mediaRecorder.stop();
  try {
    // Combine all chunks into a single Blob
    const videoBlob = new Blob(recordedChunks, {
      type: "video/webm; codecs=vp9",
    });
    const formData = new FormData();
    formData.append("video", videoBlob, videoFileName);
    formData.append("userId", userId);

    // Upload the file to your Express server
    await axios.post(`${import.meta.env.VITE_API_URL}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },

      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total!
        );
        console.log("Upload progress:", percentCompleted);
        setProgress(percentCompleted);
      },
    });
    setProgress(-1);

    // Clear recorded chunks for the next recording
    recordedChunks = [];
    window.ipcRenderer.send("show-main");
  } catch (e) {
    setProgress(-1);
    recordedChunks = [];
    window.ipcRenderer.send("show-main");
    console.log(e);
  }
};

export const selectSources = async (
  onSources: {
    screen: string;
    audio: string;
    id: string;
    preset: "HD" | "SD";
  },
  videoElement: React.RefObject<HTMLVideoElement>
) => {
  if (onSources && onSources.screen && onSources.audio && onSources.id) {
    const constraints: any = {
      audio: false,

      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: onSources?.screen,
          minWidth: onSources.preset === "HD" ? 1920 : 1280,
          maxWidth: onSources.preset === "HD" ? 1920 : 1280,
          minHeight: onSources.preset === "HD" ? 1080 : 720,
          maxHeight: onSources.preset === "HD" ? 1080 : 720,
          frameRate: 30,
        },
      },
    };
    userId = onSources.id;

    // Creating the stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("stream", stream);
    // Audio & webcam stream
    const audioStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: onSources?.audio
        ? { deviceId: { exact: onSources.audio } }
        : false,
    });

    if (videoElement && videoElement.current) {
      setTimeout(() => {
        videoElement.current!.srcObject = stream;
        videoElement.current!.play();
      }, 100);
    }

    const combinedStream = new MediaStream([
      ...stream.getTracks(),
      ...audioStream.getTracks(),
    ]);

    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm; codecs=vp9",
    });

    mediaRecorder.ondataavailable = onDataAvailable;
  }
};

export const startRecording = (sources: {
  screen: string;
  audio: string;
  id: string;
}) => {
  window.ipcRenderer.send("hide-main");
  videoFileName = `${uuid()}-${sources?.id.slice(0, 8)}.webm`;
  mediaRecorder.start(1000);
};
