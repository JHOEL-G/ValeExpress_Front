import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Upload,
} from "lucide-react";
import { globalApi } from "../../services/globalApi";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogFooter
} from "@/compomentes/ui/alert-dialog";
import { useFlow } from "./FlowContext";
import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';



export default function ReconocimientoFacial() {
  const [step, setStep] = useState(1);
  const [stream, setStream] = useState(null);
  const [capturedFace, setCapturedFace] = useState(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionScore, setRecognitionScore] = useState(null);
  const [liveSimilarity, setLiveSimilarity] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const isProcessingRef = useRef(false);

  const [livenessStatus, setLivenessStatus] = useState("Iniciando...");
  const [facePositions, setFacePositions] = useState([]);
  const [modelActive, setModelActive] = useState(false);
  const { markStepComplete } = useFlow();

  const [model, setModel] = useState(null);

  const [errorDialog, setErrorDialog] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasBlinked, setHasBlinked] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const livenessIntervalRef = useRef(null);

  const fotoIneFrontal =
    location.state?.fotoIneFrontal || localStorage.getItem(`fotoIne_${id}`);

  useEffect(() => {
    if (!fotoIneFrontal) {
      alert("La sesión expiró. Por favor, captura tu INE de nuevo.");
      navigate(-1);
    }
  }, [fotoIneFrontal, navigate]);

  useEffect(() => {
    const loadModel = async () => {
      if (tf.getBackend() !== 'webgl') {
        await tf.setBackend('webgl');
      }
      await tf.ready();
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ]);


        console.log("✅ Modelos de Face-API cargados correctamente");
        setModelActive(true); // <--- Ahora sí funcionará
      } catch (error) {
        console.error("❌ Error cargando modelos locales:", error);
      }
    };
    loadModel();
  }, []);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current);
    };
  }, [stream]);

  const requestCameraAccess = async () => {
    setIsLoadingCamera(true);
    setCameraActive(false);
    setLiveSimilarity(0);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          const playVideo = () => {
            videoRef.current.play().catch(() => { });
            setCameraActive(true);
          };
          videoRef.current.onloadedmetadata = playVideo;
        }
      }, 150);

      setIsLoadingCamera(false);
      setStep(3);
    } catch (error) {
      setIsLoadingCamera(false);
      setErrorDialog({
        isOpen: true,
        title: "Error de Cámara",
        message: "No se pudo acceder a la cámara. Verifica los permisos."
      });
    }
  };

  useEffect(() => {
    if (step !== 3 || !cameraActive || !model || !videoRef.current) {
      if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current);
      return;
    }

    setLivenessStatus("Detectando rostro...");
    const positions = [];

    livenessIntervalRef.current = setInterval(async () => {
      try {
        const predictions = await model.estimateFaces(videoRef.current, false);

        if (predictions.length > 0) {
          const face = predictions[0];

          if (face.probability[0] < 0.70) {
            setHasBlinked(true);
          }

          const position = {
            x: face.topLeft[0],
            y: face.topLeft[1],
            timestamp: Date.now()
          };

          positions.push(position);

          if (positions.length > 10) {
            positions.shift();
          }

          setFacePositions([...positions]);

          if (positions.length >= 5) {
            const movement = calculateMovement(positions);

            if (movement < 6) {
              setLivenessStatus("⚠️ Mueve un poco la cabeza");
            } else if (!hasBlinked) {
              setLivenessStatus("✅ Bien, ahora parpadea");
            } else {
              setLivenessStatus("✅ Prueba de vida completada");
            }
          }
        } else {
          setLivenessStatus("⚠️ No se detecta rostro");
          positions.length = 0;
        }
      } catch (error) {
        console.error("Error en detección:", error);
      }
    }, 300);

    return () => clearInterval(livenessIntervalRef.current);
  }, [step, cameraActive, model, hasBlinked]);

  // ✅ NUEVO: Calcular movimiento entre frames
  const calculateMovement = (positions) => {
    if (positions.length < 2) return 0;



    let totalMovement = 0;
    for (let i = 1; i < positions.length; i++) {
      const dx = positions[i].x - positions[i - 1].x;
      const dy = positions[i].y - positions[i - 1].y;
      totalMovement += Math.sqrt(dx * dx + dy * dy);
    }



    return totalMovement / (positions.length - 1);
  };

  // ✅ REVISADO: Validación estricta para bloquear fotos de otros dispositivos
  const isLivenessValid = () => {
    // 1. Necesitamos una muestra más amplia para analizar trayectoria
    if (facePositions.length < 10) {
      return { valid: false, reason: "Analizando entorno de seguridad..." };
    }

    const movement = calculateMovement(facePositions);

    // 2. Bloqueo de fotos estáticas (INEs o fotos impresas)
    if (movement < 6) {
      return { valid: false, reason: "Imagen demasiado estática. Por favor, mueve tu cabeza." };
    }

    // 3. Bloqueo de vibración (Mano temblando vs Rostro moviéndose)
    // El movimiento de un celular frente a la cámara suele ser errático y rápido.
    if (movement > 80) {
      return { valid: false, reason: "Movimiento inestable. Sujeta el teléfono con firmeza." };
    }

    // 4. Validación de Giro Real (Diferencia Profundidad vs Plano)
    const first = facePositions[0];
    const last = facePositions[facePositions.length - 1];
    const horizontalMovement = Math.abs(first.x - last.x);

    // Aumentamos a 25px para obligar a un giro lateral claro
    if (horizontalMovement < 25) {
      return {
        valid: false,
        reason: "❌ Rostro plano detectado. Por favor, gira lentamente tu cabeza de izquierda a derecha."
      };
    }

    // 5. El factor decisivo: Parpadeo Humano
    // Las fotos digitales no parpadean de forma natural con la caída de probabilidad de BlazeFace
    if (!hasBlinked) {
      return {
        valid: false,
        reason: "❌ Seguridad: Por favor, parpadea frente a la cámara para validar tu identidad."
      };
    }

    return { valid: true, reason: "Validación correcta" };
  };

  useEffect(() => {
    if (step !== 3 || !cameraActive || isProcessing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    let isProcessingFrame = false;
    let simulationInterval = null;

    const startSimulation = () => {
      if (simulationInterval) clearInterval(simulationInterval);

      simulationInterval = setInterval(() => {
        setLiveSimilarity(prev => {
          if (prev < 85) {
            return prev + 1;
          }
          return prev;
        });
      }, 100);
    };

    const animateToTarget = (target) => {
      if (simulationInterval) clearInterval(simulationInterval);

      simulationInterval = setInterval(() => {
        setLiveSimilarity(prev => {
          if (prev < target) {
            return prev + 1;
          } else if (prev > target) {
            return prev - 1;
          } else {
            clearInterval(simulationInterval);
            return prev;
          }
        });
      }, 40);
    };

    intervalRef.current = setInterval(async () => {
      if (isProcessingRef.current) return;

      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);

      const frameData = canvas.toDataURL("image/jpeg", 0.7);

      isProcessingRef.current = true;
      startSimulation();

      try {
        const resultado = await globalApi.validarIneSelfie(
          fotoIneFrontal,
          frameData,
          id
        );

        if (simulationInterval) clearInterval(simulationInterval);

        const errorCode = resultado?.error ?? resultado?.Error ?? null;

        if (errorCode === null || errorCode === 0 || errorCode === "0") {
          let similitudEncontrada = null;
          if (Array.isArray(resultado.data)) {
            for (let i = 0; i < resultado.data.length; i++) {
              if (resultado.data[i]?.similitud !== undefined) {
                similitudEncontrada = resultado.data[i].similitud;
                break;
              }
            }
          }

          const sim = similitudEncontrada ?? 0;

          if (sim > 0) {
            const roundedSim = Math.round(sim);
            animateToTarget(roundedSim);

            if (sim >= 90) {
              clearInterval(intervalRef.current);
              setTimeout(() => {
                if (simulationInterval) clearInterval(simulationInterval);
                capturePhoto();
              }, 1500);
            }
          }
        }
      } catch (err) {
        console.error("⚠️ Error:", err);
        if (simulationInterval) clearInterval(simulationInterval);
      } finally {
        isProcessingRef.current = false;
      }
    }, 1500);

    return () => {
      clearInterval(intervalRef.current);
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [step, cameraActive, isProcessing, fotoIneFrontal, id]);

  const capturePhoto = () => {

    if (!videoRef.current || !canvasRef.current) return;

    // ✅ NUEVO: Validar liveness antes de capturar
    const livenessCheck = isLivenessValid();


    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const validationResult = validateLiveCaptureDetailed(canvas);

    if (!validationResult.isValid) {
      setErrorDialog({
        isOpen: true,
        title: "❌ Documento Detectado",
        message: validationResult.reason
      });
      return;
    }

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedFace(imageData);

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current);

    processValidation(imageData);
  };

  const validateLiveCaptureDetailed = (canvas) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const data = imageData.data;

    let totalBrightness = 0;
    let veryWhitePixels = 0;
    let mediumBrightPixels = 0;
    let sharpEdges = 0;
    let textLikePatterns = 0;

    const sampleRate = 6;
    const width = canvas.width;
    const height = canvas.height;

    // 1. Primero recorremos los píxeles para contar
    for (let y = 0; y < height; y += sampleRate) {
      for (let x = 0; x < width; x += sampleRate) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;

        if (brightness > 240 && Math.abs(r - g) < 5 && Math.abs(g - b) < 5) {
          veryWhitePixels++;
        }

        if (brightness > 190 && brightness < 235) {
          mediumBrightPixels++;
        }

        if (x > sampleRate && y > sampleRate) {
          const prevI = ((y - sampleRate) * width + (x - sampleRate)) * 4;
          const prevBrightness = (data[prevI] + data[prevI + 1] + data[prevI + 2]) / 3;
          const diff = Math.abs(brightness - prevBrightness);

          if (diff > 110) {
            sharpEdges++;
          }

          if (diff > 130 && diff < 200) {
            textLikePatterns++;
          }
        }
      }
    }

    // 2. Calculamos los ratios DESPUÉS del bucle
    const totalPixels = (width * height) / (sampleRate * sampleRate);
    const veryWhiteRatio = veryWhitePixels / totalPixels;
    const sharpEdgeRatio = sharpEdges / totalPixels;
    const textPatternRatio = textLikePatterns / totalPixels;

    // 3. Ahora sí definimos isScreen porque las variables ya tienen valor
    const isScreen = (veryWhiteRatio > 0.10 && textPatternRatio > 0.04);

    // 4. Validaciones de seguridad
    if (isScreen) {
      return {
        isValid: false,
        reason: "🚫 Pantalla detectada. Por favor, usa tu rostro real y no una foto digital."
      };
    }

    if (veryWhiteRatio > 0.25 && sharpEdgeRatio > 0.05 && textPatternRatio > 0.025) {
      return {
        isValid: false,
        reason: "🚫 Se detectó un documento. Muestra tu rostro real."
      };
    }

    if (textPatternRatio > 0.035 && sharpEdgeRatio > 0.06) {
      return {
        isValid: false,
        reason: "🚫 Se detectó un documento impreso."
      };
    }

    if (sharpEdgeRatio > 0.08) {
      return {
        isValid: false,
        reason: "🚫 Objeto plano detectado (Foto o Documento)."
      };
    }

    return {
      isValid: true,
      reason: "Captura válida"
    };
  };

  const processValidation = async (selfieData) => {
    setIsProcessing(true);
    setStep(4);

    try {
      let resultado;
      try {
        resultado = await globalApi.validarIneSelfie(
          fotoIneFrontal,
          selfieData,
          id
        );
      } catch (apiError) {
        console.error("❌ Error en validarIneSelfie:", apiError);

        const mensajeError =
          apiError.response?.data?.resultado ||
          apiError.response?.data?.message ||
          apiError.message ||
          "No se pudo conectar con el servidor";

        setErrorDialog({
          isOpen: true,
          title: "Error de Validación",
          message: mensajeError
        });
        setIsProcessing(false);
        return;
      }

      if (resultado.error !== 0) {
        console.error("❌ Error en respuesta de validación:", resultado);

        setErrorDialog({
          isOpen: true,
          title: "Validación Fallida",
          message: resultado.resultado || "No se pudo validar la biometría"
        });
        setIsProcessing(false);
        return;
      }

      const similitudPorcentaje = resultado.data?.[0]?.similitud || 0;

      if (similitudPorcentaje < 90) {
        setRecognitionScore(similitudPorcentaje.toFixed(2));
        setStep(6);
        setIsProcessing(false);
        return;
      }

      const reversoBase64 = localStorage.getItem(`fotoIneReverso_${id}`);
      const ocrAlmacenado = localStorage.getItem(`ocrData_${id}`);

      const comprimirAPNG = async (base64) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = base64;
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = 600;
              canvas.height = (600 * img.height) / img.width;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL("image/png"));
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error("Error al cargar imagen"));
        });
      };

      let anversoPng, reversoPng, selfiePng;

      try {
        anversoPng = await comprimirAPNG(fotoIneFrontal);
        reversoPng = reversoBase64 ? await comprimirAPNG(reversoBase64) : "";
        selfiePng = await comprimirAPNG(selfieData);
      } catch (compressionError) {
        console.error("❌ Error al comprimir imágenes:", compressionError);

        setErrorDialog({
          isOpen: true,
          title: "Error de Procesamiento",
          message: "No se pudieron procesar las imágenes. Por favor, inténtalo de nuevo."
        });
        setIsProcessing(false);
        return;
      }

      const datosRegistro = {
        ocrResponse: ocrAlmacenado,
        biometricoResponse: JSON.stringify(resultado),
        ineAnversoPath: anversoPng,
        ineReversoPath: reversoPng,
        clientePath: selfiePng,
      };

      let registroRespuesta;

      try {
        registroRespuesta = await globalApi.registrarBiometricos(
          datosRegistro,
          id
        );
      } catch (registroError) {
        console.error("❌ Error en registrarBiometricos (catch):", registroError);

        const mensajeError =
          registroError.response?.data?.resultado ||
          registroError.response?.data?.message ||
          registroError.message ||
          "No se pudo completar el registro en la base de datos";

        setErrorDialog({
          isOpen: true,
          title: "Error en Base de Datos",
          message: mensajeError
        });
        setIsProcessing(false);
        return;
      }

      if (registroRespuesta?.error && registroRespuesta.error !== 0) {
        console.error("❌ Error en respuesta de registro:", registroRespuesta);

        const mensajeError =
          registroRespuesta.resultado ||
          registroRespuesta.message ||
          "Error al registrar datos";

        setErrorDialog({
          isOpen: true,
          title: "Error en Registro",
          message: mensajeError
        });
        setIsProcessing(false);
        return;
      }

      setRecognitionScore(similitudPorcentaje.toFixed(2));
      setStep(5);

    } catch (error) {
      console.error("❌ Error inesperado en validación:", error);

      setErrorDialog({
        isOpen: true,
        title: "Error Crítico",
        message: error.message || "Por favor, inténtalo de nuevo"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const reintentar = () => {
    setCapturedFace(null);
    setRecognitionScore(null);
    setLiveSimilarity(0);
    setFacePositions([]);
    setStep(1);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target.result;

      // 1. Crear un canvas temporal para validar la imagen
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        // 2. Ejecutar tus validaciones detalladas (Moiré, Brillo, etc.)
        const validationResult = validateLiveCaptureDetailed(canvas);

        if (!validationResult.isValid) {
          setErrorDialog({
            isOpen: true,
            title: "❌ Archivo no válido",
            message: validationResult.reason
          });
          return;
        }

        // 3. Si es válida, procesar como si fuera una captura
        setCapturedFace(imageData);
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          setStream(null);
        }
        setCameraActive(false);
        processValidation(imageData);
      };
      img.src = imageData;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <input
        type="file"
        id="file-upload-facial"
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
      />

      <main className="flex-1 relative flex items-center justify-center">
        {/* Cámara activa */}
        {step === 3 && (
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              autoPlay
              playsInline
              muted
            />

            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-white/90 backdrop-blur rounded-2xl px-8 py-4 shadow-2xl text-center">
                <p className="text-gray-700 font-medium mb-2">
                  Coincidencia con tu INE
                </p>
                <p className="text-4xl font-bold text-gray-900">
                  {liveSimilarity}%
                </p>
                {liveSimilarity >= 90 && (
                  <p className="text-green-600 font-bold mt-3 animate-pulse">
                    ¡Capturando automáticamente!
                  </p>
                )}
              </div>
            </div>

            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4 w-full px-4">
              <div className="flex items-center gap-6">
                <button
                  onClick={capturePhoto}
                  disabled={!cameraActive}
                  className="w-20 h-20 bg-gray-800 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition disabled:opacity-50 border-4 border-white"
                >
                  <div className="w-16 h-16 bg-white rounded-full" />
                </button>
                <button
                  onClick={() => document.getElementById('file-upload-facial').click()}
                  className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-2xl text-gray-700 font-bold text-sm shadow-xl border border-white"
                >
                  <Upload size={18} />
                  USAR GALERÍA
                </button>
              </div>

              <p className="text-gray-800 text-center font-bold bg-white/90 px-6 py-2 rounded-full shadow-sm backdrop-blur-sm text-sm uppercase tracking-wide">
                Captura rostro
              </p>
            </div>
          </div>
        )}

        {/* Modales */}
        {(step === 1 || step === 4 || step === 5 || step === 6) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white px-6">
            <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
              {step === 1 && (
                <>
                  <Camera className="w-16 h-16 text-gray-800 mx-auto mb-6" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Verificación Facial
                  </h2>
                  <p className="text-gray-600 mb-10">
                    Mira a la cámara. Se mostrará el porcentaje de coincidencia
                    en tiempo real.
                  </p>
                  <button
                    onClick={requestCameraAccess}
                    disabled={isLoadingCamera}
                    className="w-full bg-gray-800 text-white font-bold py-5 rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    {isLoadingCamera ? "Iniciando..." : "Comenzar"}
                  </button>
                </>
              )}

              {step === 4 && (
                <div className="py-10">
                  <Loader2 className="w-20 h-20 animate-spin text-gray-800 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900">
                    Procesando coincidencia final...
                  </h3>
                </div>
              )}

              {step === 5 && (
                <>
                  <div className="relative inline-block mb-8">
                    <img
                      src={capturedFace}
                      alt="Selfie"
                      className="w-40 h-40 rounded-3xl object-cover shadow-xl"
                    />
                    <div className="absolute -bottom-4 -right-4 bg-green-600 rounded-2xl p-4 shadow-2xl">
                      <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    ¡Coincidencia verificada!
                  </h2>
                  <p className="text-3xl font-bold text-green-600 mb-10">
                    {recognitionScore}% de similitud
                  </p>
                  <button
                    onClick={() => {
                      markStepComplete(id, "reconocimiento");
                      navigate(`/vista/${id}`);
                    }}
                    className="w-full bg-gray-800 text-white font-bold py-6 rounded-2xl text-xl shadow-xl transition active:scale-95"
                  >
                    CONTINUAR
                  </button>
                </>
              )}

              {step === 6 && (
                <>
                  <div className="relative inline-block mb-8">
                    <img
                      src={capturedFace}
                      alt="Selfie"
                      className="w-40 h-40 rounded-3xl object-cover shadow-xl"
                    />
                    <div className="absolute -bottom-4 -right-4 bg-red-600 rounded-2xl p-4 shadow-2xl">
                      <AlertCircle className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Los rostros no coinciden
                  </h2>
                  <p className="text-2xl font-bold text-red-600 mb-6">
                    {recognitionScore}% de similitud
                  </p>
                  <p className="text-gray-600 mb-10">
                    Necesitamos al menos 90%. Intenta con mejor iluminación.
                  </p>
                  <button
                    onClick={reintentar}
                    className="w-full bg-gray-800 text-white font-bold py-6 rounded-2xl text-xl shadow-xl transition active:scale-95 flex items-center justify-center gap-4"
                  >
                    <RotateCcw className="w-8 h-8" />
                    REINTENTAR
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />

      {/* ⚠️ Dialog de Error - FUERA de los steps */}
      <AlertDialog
        open={errorDialog.isOpen}
        onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent className="bg-white rounded-3xl p-8 shadow-2xl max-w-[90vw] md:max-w-md">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto bg-red-100 w-16 h-16 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-center text-gray-900">
              {errorDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-600 text-base leading-relaxed">
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-all p-7"
              onClick={() => {
                setErrorDialog({ isOpen: false, title: "", message: "" });
                reintentar();
              }}
            >
              Intentar de nuevo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}