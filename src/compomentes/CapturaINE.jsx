import React, { useState, useRef, useEffect } from "react";
import {
  CheckCircle,
  Loader2,
  Camera,
  Upload,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { globalApi } from "../../services/globalApi";
import { useNavigate, useParams } from "react-router";
import imageCompression from "browser-image-compression";
import { useFlow } from "./FlowContext";


export default function CapturaINE() {
  const [step, setStep] = useState(1);
  const [fotoIneFrontal, setFotoIneFrontal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const { markStepComplete } = useFlow();
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);

  const { id } = useParams();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null; // no dispara re-render
    }
  };

  const startCamera = async () => {
    stopStream();
    setError(null);
    setCameraReady(false);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
        streamRef.current = mediaStream;
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const compressImage = async (fileOrDataUrl) => {
    let file;
    if (typeof fileOrDataUrl === "string") {
      const response = await fetch(fileOrDataUrl);
      const blob = await response.blob();
      file = new File([blob], "imagen.jpg", { type: "image/jpeg" });
    } else {
      file = fileOrDataUrl;
    }

    try {
      return await imageCompression.getDataUrlFromFile(
        await imageCompression(file, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        })
      );
    } catch (error) {
      return fileOrDataUrl;
    }
  };

  const validarSoloFrente = async (imagenDataUrl) => {
    if (isProcessingRef.current) return; // ✅ guard
    isProcessingRef.current = true;
    setIsProcessing(true);
    setError(null);
    try {
      const respuesta = await globalApi.validarIdentidad(
        imagenDataUrl,
        imagenDataUrl,
        id || "temp_ref"
      );
      const info = respuesta?.data?.[0];
      setFotoIneFrontal(imagenDataUrl);
      setStep(3);
    } catch (err) {
      setError(err.message || "Error al validar el frente.");
    } finally {
      isProcessingRef.current = false; // ✅ liberar
      setIsProcessing(false);
    }
  };

  const validarReversoYFinalizar = async (imagenReversoUrl) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setError(null);
    try {
      const respuesta = await globalApi.validarIdentidad(
        fotoIneFrontal,
        imagenReversoUrl,
        id || "temp_ref"
      );
      const info = respuesta?.data?.[0];

      if (info && info.curp && info.nombres && !info.mrz) {
        // ✅ Solo setear el error, el finally libera el guard
        setError("Capturaste el frente otra vez. Por favor, gira la INE y captura el reverso (con el código MRZ).");
        return; // ✅ ahora sí es seguro porque finally siempre corre
      }

      if (info && info.estatus !== "ERROR" && info.mrz) {
        localStorage.setItem(`ocrData_${id}`, JSON.stringify(info));
        stopStream();
        setStep(5);
      } else {
        throw new Error(info?.mensaje || "No se pudo validar el reverso.");
      }
    } catch (err) {
      setError(err.message || "Error al validar el reverso.");
    } finally {
      isProcessingRef.current = false; // ✅ siempre se libera, con return o sin él
      setIsProcessing(false);
    }
  };

  const capturePhoto = async () => {
    // ✅ Doble check: ref inmediato + estado
    if (isProcessingRef.current || !videoRef.current || !canvasRef.current || !cameraReady) return;

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg");
    const compressed = await compressImage(dataUrl);

    if (step === 2) await validarSoloFrente(compressed);
    else if (step === 3) await validarReversoYFinalizar(compressed);
  };


  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    if (step === 2) await validarSoloFrente(compressed);
    else if (step === 3) await validarReversoYFinalizar(compressed);
  };

  const reiniciarProceso = () => {
    isProcessingRef.current = false; // ✅ resetear al reiniciar
    setError(null);
    setFotoIneFrontal(null);
    setStep(1);
    stopStream();
  };

  useEffect(() => {
    if (step === 2 || step === 3) startCamera();
    return () => stopStream();
  }, [step]); // ahora sí solo se ejecuta cuando cambia step

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {(step === 2 || step === 3) && (
        <div className="px-6 pt-10 pb-6 text-center bg-white">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Captura {step === 2 ? "el frente" : "el reverso"} de tu INE
          </h2>
          <div className="flex justify-center gap-6">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-md ${step >= 2
                ? "bg-gray-800 text-white"
                : "bg-gray-200 text-gray-500"
                }`}
            >
              1
            </div>
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-md ${step >= 3
                ? "bg-gray-800 text-white"
                : "bg-gray-200 text-gray-500"
                }`}
            >
              2
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 relative">
        {step === 1 && (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Validación de Identidad
            </h1>
            <p className="text-lg text-gray-600 mb-12 max-w-md">
              Prepara tu INE original. Tomaremos fotos claras del frente y
              reverso.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full max-w-md bg-gray-800 text-white py-5 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition"
            >
              COMENZAR CAPTURA
            </button>
          </div>
        )}

        {(step === 2 || step === 3) && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {isProcessing && (
              <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-20">
                <Loader2 className="w-20 h-20 animate-spin text-gray-800 mb-6" />
                <p className="text-2xl font-bold text-gray-900">
                  Validando {step === 2 ? "frente" : "reverso"}...
                </p>
              </div>
            )}
          </>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mb-8 shadow-lg">
              <CheckCircle size={80} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              ¡Identidad verificada!
            </h1>
            <p className="text-lg text-gray-600 mb-12">
              Tu INE ha sido validada correctamente.
            </p>
            <button
              onClick={() => {
                markStepComplete(id, "capturaINE");
                navigate(`/reconocimiento/${id}`, {
                  state: { fotoIneFrontal: fotoIneFrontal }
                });
              }}
              className="w-full max-w-md bg-gray-800 text-white py-5 rounded-2xl font-bold text-lg shadow-lg"
            >
              CONTINUAR PROCESO
            </button>
          </div>
        )}
      </main>

      {(step === 2 || step === 3) && (
        <div className="px-6 pb-8 mt-5 bg-white">
          <div className="grid">
            <button
              onClick={capturePhoto}
              disabled={isProcessing || !cameraReady}
              className="bg-gray-800 disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition"
            >
              <Camera size={20} />
              CAPTURAR
            </button>
            {/*<button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-white border-2 border-gray-200 text-gray-600 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-gray-50 transition"
            >
              <Upload size={20} />
              SUBIR DESDE ARCHIVO
            </button>*/}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {error && !isProcessing && (step === 2 || step === 3) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle size={48} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                No se pudo validar
              </h3>
              <p className="text-base text-gray-700 mb-8 leading-relaxed px-2">
                {error}
              </p>

              <button
                onClick={reiniciarProceso}
                className="w-full bg-gray-800 text-white py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                REINTENTAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
