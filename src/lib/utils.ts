import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_HOST_URL,
});

export const getMediaSources = async () => {
  const displays = await window.ipcRenderer.invoke("getSources");

  const enumerateDevices =
    await window.navigator.mediaDevices.enumerateDevices();
  const audioInputs = enumerateDevices.filter(
    (device) => device.kind === "audioinput"
  );

  return { displays, audioInputs };
};

export const studioSchema = z.object({
  screen: z.string(),
  audio: z.string(),
  preset: z.enum(["HD", "SD"]),
});
