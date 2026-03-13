/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Home,
  Briefcase,
  Users,
  Landmark,
  AlertCircle,
} from "lucide-react";
import { globalApi } from "../../services/globalApi";
import { useNavigate, useParams } from "react-router";
import { useFlow } from "./FlowContext";
import Cards from "react-credit-cards-2";
import "react-credit-cards-2/dist/es/styles-compiled.css";
import VerificarInformacion from "./VerificarInformacion";


export default function FormularioCompleto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [colonias, setColonias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [listaParentescos, setListaParentescos] = useState([]);
  const [listaBancos, setListaBancos] = useState([]);
  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [mostrarVerificacion, setMostrarVerificacion] = useState(false);
  const { markStepComplete } = useFlow();


  const [formData, setFormData] = useState({
    calle: "",
    numExterior: "",
    numInterior: "",
    codigoPostal: "",
    colonia: "",
    ciudad: "",
    municipio: "",
    estado: "",
    rfc: "",
    correo: "",
    empresa: "",
    telefonoEmpresa: "",
    antiguedadLaboral: "",
    ingresosMensuales: "",
    datosBancarios: "debito",
    banco: "",
    numeroTarjeta: "",
    confirmarTarjeta: "",
    transferencia: true,
    retiroSinTarjeta: false,
  });

  const [referencias, setReferencias] = useState([
    {
      id: 1,
      nombre: "",
      apellidoPaterno: "",
      apellidoMaterno: "",
      telefono: "",
      parentesco: "",
      tiempoConocido: "",
    },
  ]);

  const [beneficiarios, setBeneficiarios] = useState([
    {
      id: 1,
      nombre: "",
      apellidoPaterno: "",
      apellidoMaterno: "",
      parentesco: "",
      porcentaje: "100",
      fechaNacimiento: "",
    },
  ]);

  const validarFormulario = () => {
    const errores = [];

    // Validar Domicilio
    if (!formData.calle.trim()) errores.push("📍 Domicilio: La calle es obligatoria");
    if (!formData.numExterior.trim())
      errores.push("📍 Domicilio: El número exterior es obligatorio");
    if (!formData.codigoPostal.trim() || formData.codigoPostal.length !== 5) {
      errores.push("📍 Domicilio: El código postal debe tener 5 dígitos");
    }
    if (!formData.colonia.trim()) errores.push("📍 Domicilio: Debe seleccionar una colonia");
    if (!formData.rfc.trim()) errores.push("📋 Personales: El RFC es obligatorio");
    if (!formData.correo.trim()) {
      errores.push("📋 Personales: El correo electrónico es obligatorio");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      errores.push("📋 Personales: El correo electrónico no es válido");
    }

    // Validar Datos Laborales
    if (!formData.empresa.trim())
      errores.push("💼 Laborales: El nombre de la empresa es obligatorio");
    if (!formData.telefonoEmpresa.trim())
      errores.push("💼 Laborales: El teléfono de la empresa es obligatorio");
    if (!formData.antiguedadLaboral || formData.antiguedadLaboral <= 0) {
      errores.push("💼 Laborales: La antigüedad laboral debe ser mayor a 0");
    }
    if (!formData.ingresosMensuales || formData.ingresosMensuales <= 0) {
      errores.push("💼 Laborales: Los ingresos mensuales deben ser mayores a 0");
    }

    // Validar Referencias
    referencias.forEach((ref, index) => {
      if (!ref.nombre.trim())
        errores.push(`👥 Referencia ${index + 1}: Falta el nombre`);
      if (!ref.apellidoPaterno.trim())
        errores.push(`👥 Referencia ${index + 1}: Falta el apellido paterno`);
      if (!ref.apellidoMaterno.trim())
        errores.push(`👥 Referencia ${index + 1}: Falta el apellido materno`);
      if (!ref.telefono.trim())
        errores.push(`👥 Referencia ${index + 1}: Falta el teléfono`);
      if (!ref.parentesco)
        errores.push(`👥 Referencia ${index + 1}: Debe seleccionar un parentesco`);
    });

    // Validar Beneficiarios
    beneficiarios.forEach((ben, index) => {
      if (!ben.nombre.trim())
        errores.push(`👨‍👩‍👧 Beneficiario ${index + 1}: Falta el nombre`);
      if (!ben.apellidoPaterno.trim())
        errores.push(`👨‍👩‍👧 Beneficiario ${index + 1}: Falta el apellido paterno`);
      if (!ben.parentesco)
        errores.push(
          `👨‍👩‍👧 Beneficiario ${index + 1}: Debe seleccionar un parentesco`
        );
      if (!ben.fechaNacimiento)
        errores.push(`👨‍👩‍👧 Beneficiario ${index + 1}: Falta la fecha de nacimiento`);
      if (!ben.porcentaje || parseFloat(ben.porcentaje) <= 0)
        errores.push(`👨‍👩‍👧 Beneficiario ${index + 1}: Debe asignar un porcentaje válido`);
    });

    // Validar suma de porcentajes de beneficiarios
    const porcentajeTotal = beneficiarios.reduce(
      (sum, ben) => sum + (parseFloat(ben.porcentaje) || 0),
      0
    );
    if (porcentajeTotal !== 100) {
      errores.push(`👨‍👩‍👧 Beneficiarios: La suma de porcentajes debe ser 100% (actualmente: ${porcentajeTotal}%)`);
    }

    // Validar Datos Bancarios
    if (formData.datosBancarios === "debito") {
      // Limpiar espacios antes de validar
      const numeroLimpio = formData.numeroTarjeta.replace(/\s/g, "");
      const confirmarLimpio = formData.confirmarTarjeta.replace(/\s/g, "");

      if (!numeroLimpio || numeroLimpio.length !== 16) {
        errores.push("💳 Datos Bancarios: El número de tarjeta debe tener exactamente 16 dígitos");
      }
      if (!confirmarLimpio || confirmarLimpio.length !== 16) {
        errores.push("💳 Datos Bancarios: Debe confirmar el número de tarjeta (16 dígitos)");
      }
      if (numeroLimpio !== confirmarLimpio) {
        errores.push("💳 Datos Bancarios: Los números de tarjeta no coinciden");
      }
      if (!formData.banco.trim()) errores.push("💳 Datos Bancarios: Debe seleccionar un banco");
    }

    return errores;
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    if (name === "colonia") {
      const coloniaSeleccionada = colonias.find(
        (c) => c.asentamientoNombre === value
      );
      setFormData((prev) => ({
        ...prev,
        colonia: value,
        asentamientoId: coloniaSeleccionada
          ? coloniaSeleccionada.asentamientoId
          : "",
      }));
    } else if (name === "banco") {
      const bancoSeleccionado = listaBancos.find(
        (b) => b.bancoNombre === value
      );
      setFormData((prev) => ({
        ...prev,
        banco: value,
        claveBanco: bancoSeleccionado ? bancoSeleccionado.claveBanco : "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "codigoPostal" && value.length === 5) {
      try {
        const response = await globalApi.consultarCP(value);
        const data = response.data;
        if (data && data.length > 0) {
          const primeraColonia = data[0];
          setFormData((prev) => ({
            ...prev,
            ciudad: primeraColonia.ciudad,
            municipio: primeraColonia.municipio,
            estado: primeraColonia.estado,
            colonia: data.length === 1 ? primeraColonia.asentamientoNombre : "",
            asentamientoId:
              data.length === 1 ? primeraColonia.asentamientoId : "",
          }));
          setColonias(data);
        }
      } catch (error) {
        console.error("Error al buscar CP", error);
      }
    }
  };

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [resParentesco, resBancos] = await Promise.all([
          globalApi.consultarParentescos(),
          globalApi.consultarBancos(),
        ]);

        const dataP = Array.isArray(resParentesco.data)
          ? resParentesco.data
          : resParentesco.data?.data || [];

        const dataB = Array.isArray(resBancos.data)
          ? resBancos.data
          : resBancos.data?.data || [];

        setListaParentescos(dataP);
        setListaBancos(dataB);
      } catch (error) {
        console.error("Error cargando catálogos", error);
        setListaParentescos([]);
        setListaBancos([]);
      }
    };
    cargarCatalogos();
  }, []);

  const handleDynamicChange = (setter, id, field, value) => {
    setter((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addItem = (setter, emptyItem) => {
    setter((prev) => [
      ...prev,
      { ...emptyItem, id: Math.max(...prev.map((i) => i.id), 0) + 1 },
    ]);
  };

  // Función para mostrar la pantalla de verificación
  const handleVerificar = () => {
    const errores = validarFormulario();
    if (errores.length > 0) {
      setErroresValidacion(errores);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErroresValidacion([]);
    setMostrarVerificacion(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Función para volver a editar
  const handleEditar = () => {
    setMostrarVerificacion(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const errores = validarFormulario();
    if (errores.length > 0) {
      setErroresValidacion(errores);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErroresValidacion([]);
    setCargando(true);
    try {
      // Limpiar números de tarjeta antes de enviar (remover espacios)
      const numeroTarjetaLimpio = formData.numeroTarjeta.replace(/\s/g, "");
      const confirmarTarjetaLimpio = formData.confirmarTarjeta.replace(/\s/g, "");

      const payloadFinal = {
        direccion: {
          calle: formData.calle || "",
          numExterior: formData.numExterior || "",
          numInterior: formData.numInterior || "",
          codigoPostal: Number(formData.codigoPostal) || 0,
          asentamientoId: formData.asentamientoId
            ? String(formData.asentamientoId).replace(/^0+/, "")
            : "947",
          ciudad: formData.ciudad || "",
          municipo: formData.municipio || "",
          estado: formData.estado || "",
          rfc: formData.rfc || "",
          correo: formData.correo || "",
        },
        referencias: referencias.map((r) => ({
          nombres: r.nombre || "",
          apellidoPaterno: r.apellidoPaterno || "",
          apellidoMaterno: r.apellidoMaterno || "",
          telefono: String(r.telefono || "").replace(/\s/g, ""),
          tiempoConocido: Number(r.tiempoConocido) || 1,
          parentescoId: Number(r.parentescoId) || 1,
        })),
        beneficiarios: beneficiarios.map((b) => ({
          porcentajeDestinado: parseFloat("1.0"),
          nombres: b.nombre || "",
          apellidoPaterno: b.apellidoPaterno || "",
          apellidoMaterno: b.apellidoMaterno || "",
          parentescoId: Number(b.parentescoId) || 1,
          fechaNacimiento: b.fechaNacimiento || "2000-01-01",
        })),
        laborales: {
          empresa: formData.empresa || "",
          telefono: String(formData.telefonoEmpresa || ""),
          antiguedad: Number(formData.antiguedadLaboral) || 1,
          ingresosMenusales: parseFloat("500.0"),
        },
        tarjeta: {
          numTarjeta: numeroTarjetaLimpio,
          numTarjetaConf: confirmarTarjetaLimpio,
          banco:
            Number(formData.claveBanco) > 0
              ? Number(formData.claveBanco)
              : 2001,
        },
        referencia: id,
        transferencia: formData.datosBancarios === "debito",
        retiroSinTarjeta: formData.datosBancarios === "sin_tarjeta",
      };

      const response = await globalApi.registrarFormulario(payloadFinal);


      if (response.data?.error === 0) {
        markStepComplete(id, "formulario");
        alert("¡Registro exitoso!");
        navigate(`/captura-ine/${id}`);
      } else {
        alert(
          "Error del servidor: " + (response.data?.resultado || "Desconocido")
        );
      }
    } catch (error) {
      console.error("❌ Error completo:", error.response?.data);

      if (error.response?.data?.errors) {
        const errores = error.response.data.errors;
        console.error("📋 Errores de validación:", errores);

        const mensajesError = Object.entries(errores)
          .map(
            ([campo, mensajes]) =>
              `• ${campo}: ${Array.isArray(mensajes) ? mensajes.join(", ") : mensajes
              }`
          )
          .join("\n");

        alert(`Errores de validación:\n\n${mensajesError}`);
      } else {
        alert("Error de comunicación. Revisa tu conexión.");
      }
    } finally {
      setCargando(false);
    }
  };

  // Si se está mostrando la verificación, renderizar esa pantalla
  if (mostrarVerificacion) {
    return (
      <VerificarInformacion
        formData={formData}
        referencias={referencias}
        beneficiarios={beneficiarios}
        listaBancos={listaBancos}
        listaParentescos={listaParentescos}
        onConfirmar={handleSubmit}
        onEditar={handleEditar}
        cargando={cargando}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">


      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="py-4">
            <img
              src="/logo.png"
              alt="Logo Mova"
              className="h-10 w-auto object-contain"
            />
          </div>
          <p className="text-slate-500 text-sm mb-6">
            Por favor, capture la información solicitada a continuación.
          </p>

          {erroresValidacion.length > 0 && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                <div className="p-8">
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Campos incompletos o inválidos
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Por favor, revisa y completa los siguientes campos:
                    </p>
                  </div>

                  {/* Lista de errores con scroll */}
                  <div className="max-h-[50vh] overflow-y-auto mb-6 bg-red-50 rounded-lg p-4 border border-red-200">
                    <ul className="space-y-2">
                      {erroresValidacion.map((error, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-red-700"
                        >
                          <span className="text-red-500 font-bold mt-0.5">•</span>
                          <span className="flex-1">{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => setErroresValidacion([])}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DOMICILIO Y PERSONALES */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
              <Home size={18} className="text-indigo-600" />
              <h2 className="font-semibold text-slate-700 uppercase text-sm tracking-wider">
                Domicilio y Personales
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Calle *
                </label>
                <input
                  type="text"
                  name="calle"
                  value={formData.calle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Núm. exterior *
                </label>
                <input
                  type="text"
                  name="numExterior"
                  value={formData.numExterior}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Núm. interior
                </label>
                <input
                  type="text"
                  name="numInterior"
                  value={formData.numInterior}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 text-orange-600 font-bold">
                  Código postal *
                </label>
                <input
                  type="text"
                  name="codigoPostal"
                  maxLength={5}
                  value={formData.codigoPostal}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-orange-200 bg-orange-50 rounded-lg font-bold outline-none"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Colonia *
                </label>
                <select
                  name="colonia"
                  value={formData.colonia}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Seleccione colonia</option>
                  {colonias.map((c, i) => (
                    <option key={i} value={c.asentamientoNombre}>
                      {c.asentamientoNombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={formData.ciudad}
                  readOnly
                  className="w-full px-3 py-2 border bg-slate-50 rounded-lg text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Municipio
                </label>
                <input
                  type="text"
                  value={formData.municipio}
                  readOnly
                  className="w-full px-3 py-2 border bg-slate-50 rounded-lg text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  value={formData.estado}
                  readOnly
                  className="w-full px-3 py-2 border bg-slate-50 rounded-lg text-slate-500"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  RFC *
                </label>
                <input
                  type="text"
                  name="rfc"
                  value={formData.rfc}
                  onChange={handleInputChange}
                  maxLength={13}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg uppercase"
                  placeholder="10 o 13 caracteres"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  name="correo"
                  value={formData.correo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* DATOS LABORALES */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
              <Briefcase size={18} className="text-indigo-600" />
              <h2 className="font-semibold text-slate-700 uppercase text-sm tracking-wider">
                Datos Laborales
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Empresa o Emprendimiento *
                </label>
                <input
                  type="text"
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Teléfono de la empresa *
                </label>
                <input
                  type="text"
                  name="telefonoEmpresa"
                  value={formData.telefonoEmpresa}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 10) handleInputChange(e);
                  }}
                  maxLength={10}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Antigüedad laboral (años) *
                </label>
                <input
                  type="number"
                  name="antiguedadLaboral"
                  value={formData.antiguedadLaboral}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Ingresos mensuales *
                </label>
                <input
                  type="number"
                  name="ingresosMensuales"
                  value={formData.ingresosMensuales}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* REFERENCIAS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-600" />
                <h2 className="font-semibold text-slate-700 uppercase text-sm tracking-wider">
                  Referencias
                </h2>
              </div>

              {/* Botón con límite de 2 referencias */}
              <button
                onClick={() => {
                  if (referencias.length < 2) {
                    addItem(setReferencias, {
                      nombre: "",
                      apellidoPaterno: "",
                      apellidoMaterno: "",
                      telefono: "",
                      parentescoId: "",
                      tiempoConocido: "", // Cambiado a string vacío para la fecha
                    });
                  }
                }}
                disabled={referencias.length >= 2}
                className={`p-1 rounded-full transition-colors ${referencias.length >= 2
                  ? "text-slate-300 cursor-not-allowed"
                  : "hover:bg-indigo-100 text-indigo-600"
                  }`}
                title={
                  referencias.length >= 2
                    ? "Máximo 2 referencias permitidas"
                    : "Agregar referencia"
                }
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {referencias.map((ref, index) => (
                <div
                  key={ref.id}
                  className="relative pb-4 last:pb-0 border-b last:border-0 border-slate-100"
                >
                  {/* MODIFICACIÓN: Solo muestra el botón eliminar si hay más de 1 referencia */}
                  {referencias.length > 1 && (
                    <button
                      onClick={() =>
                        setReferencias((prev) =>
                          prev.filter((r) => r.id !== ref.id)
                        )
                      }
                      className="absolute top-0 right-0 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  <p className="text-[10px] font-bold text-indigo-400 uppercase mb-3">
                    Referencia {index + 1}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nombre(s) *"
                      className="p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent"
                      value={ref.nombre}
                      onChange={(e) =>
                        handleDynamicChange(
                          setReferencias,
                          ref.id,
                          "nombre",
                          e.target.value
                        )
                      }
                    />
                    <input
                      type="text"
                      placeholder="Apellido Paterno *"
                      className="p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent"
                      value={ref.apellidoPaterno}
                      onChange={(e) =>
                        handleDynamicChange(
                          setReferencias,
                          ref.id,
                          "apellidoPaterno",
                          e.target.value
                        )
                      }
                    />
                    <input
                      type="text"
                      placeholder="Apellido Materno *"
                      className="p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent"
                      value={ref.apellidoMaterno}
                      onChange={(e) =>
                        handleDynamicChange(
                          setReferencias,
                          ref.id,
                          "apellidoMaterno",
                          e.target.value
                        )
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Teléfono (10 dígitos) *"
                        className="p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent"
                        value={ref.telefono}
                        maxLength={10}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          handleDynamicChange(
                            setReferencias,
                            ref.id,
                            "telefono",
                            val
                          );
                        }}
                      />

                      {/* MODIFICACIÓN: Tipo date para fecha de conocimiento */}
                      {/* <div className="flex flex-col">
                        <label className="text-[10px] text-slate-400 ml-2">
                          Conocido desde:
                        </label>
                        <input
                          type="date"
                          className="p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent text-sm"
                          value={ref.tiempoConocido}
                          onChange={(e) =>
                            handleDynamicChange(
                              setReferencias,
                              ref.id,
                              "tiempoConocido",
                              e.target.value
                            )
                          }
                        />
                      </div> */}
                    </div>
                    <select
                      className="w-full p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent text-sm"
                      value={ref.parentesco}
                      onChange={(e) => {
                        const pSeleccionado = listaParentescos.find(
                          (p) => p.parentescoNombre === e.target.value
                        );
                        handleDynamicChange(
                          setReferencias,
                          ref.id,
                          "parentesco",
                          e.target.value
                        );
                        handleDynamicChange(
                          setReferencias,
                          ref.id,
                          "parentescoId",
                          pSeleccionado?.parentescoId || 1
                        );
                      }}
                    >
                      <option value="">Seleccione parentesco</option>
                      {Array.isArray(listaParentescos) &&
                        listaParentescos.map((p) => (
                          <option
                            key={p.parentescoId}
                            value={p.parentescoNombre}
                          >
                            {p.parentescoNombre || p.descripcion}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BENEFICIARIOS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-600" />
                <h2 className="font-semibold text-slate-700 uppercase text-sm tracking-wider">
                  Beneficiarios
                </h2>
              </div>
              {/* Solo permitir agregar beneficiarios si el porcentaje total es menor a 100% */}
              {(() => {
                const porcentajeTotal = beneficiarios.reduce(
                  (sum, ben) => sum + (parseFloat(ben.porcentaje) || 0),
                  0
                );
                return porcentajeTotal < 100 ? (
                  <button
                    onClick={() =>
                      addItem(setBeneficiarios, {
                        nombre: "",
                        apellidoPaterno: "",
                        apellidoMaterno: "",
                        parentesco: "",
                        porcentaje: "",
                        fechaNacimiento: "",
                      })
                    }
                    className="p-1 hover:bg-indigo-100 rounded-full text-indigo-600 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                ) : null;
              })()}
            </div>

            <div className="p-6 space-y-6">
              {/* Mensaje de información sobre el porcentaje */}
              {(() => {
                const porcentajeTotal = beneficiarios.reduce(
                  (sum, ben) => sum + (parseFloat(ben.porcentaje) || 0),
                  0
                );
                return (
                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold">
                      Porcentaje total asignado:
                    </span>{" "}
                    <span
                      className={`font-bold ${porcentajeTotal > 100
                        ? "text-red-600"
                        : porcentajeTotal === 100
                          ? "text-green-600"
                          : "text-indigo-600"
                        }`}
                    >
                      {porcentajeTotal}%
                    </span>
                    {porcentajeTotal > 100 && (
                      <span className="text-red-600 ml-2">
                        ⚠️ El total no puede superar el 100%
                      </span>
                    )}
                    {porcentajeTotal === 100 && (
                      <span className="text-green-600 ml-2">
                        ✓ Porcentaje completo
                      </span>
                    )}
                  </div>
                );
              })()}

              {beneficiarios.map((ben, index) => (
                <div key={ben.id} className="relative pb-4 last:pb-0">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase mb-3">
                    Beneficiario {index + 1}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nombre(s) *"
                      className="p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent"
                      value={ben.nombre}
                      onChange={(e) =>
                        handleDynamicChange(
                          setBeneficiarios,
                          ben.id,
                          "nombre",
                          e.target.value
                        )
                      }
                    />
                    <input
                      type="text"
                      placeholder="Apellidos *"
                      className="p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent"
                      value={ben.apellidoPaterno}
                      onChange={(e) =>
                        handleDynamicChange(
                          setBeneficiarios,
                          ben.id,
                          "apellidoPaterno",
                          e.target.value
                        )
                      }
                    />
                    <div className="flex gap-2">
                      <select
                        className="w-full p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent text-sm"
                        value={ben.parentesco}
                        onChange={(e) => {
                          const pSeleccionado = listaParentescos.find(
                            (p) => p.parentescoNombre === e.target.value
                          );

                          handleDynamicChange(
                            setBeneficiarios,
                            ben.id,
                            "parentesco",
                            e.target.value
                          );

                          handleDynamicChange(
                            setBeneficiarios,
                            ben.id,
                            "parentescoId",
                            pSeleccionado?.parentescoId || 1
                          );
                        }}
                      >
                        <option value="">Seleccione parentesco</option>
                        {Array.isArray(listaParentescos) &&
                          listaParentescos.map((p) => (
                            <option
                              key={p.parentescoId}
                              value={p.parentescoNombre}
                            >
                              {p.parentescoNombre || p.descripcion}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Campo de fecha de nacimiento con etiqueta */}
                    <div className="flex flex-col">
                      <label className="text-xs text-slate-500 mb-1">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        className="p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent text-sm"
                        value={ben.fechaNacimiento}
                        onChange={(e) =>
                          handleDynamicChange(
                            setBeneficiarios,
                            ben.id,
                            "fechaNacimiento",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    {/* Campo de porcentaje con validación */}
                    <div className="flex flex-col">
                      <input
                        type="number"
                        placeholder="Porcentaje % *"
                        min="0"
                        max="100"
                        className="p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent"
                        value={ben.porcentaje}
                        onChange={(e) => {
                          const valor = parseFloat(e.target.value) || 0;
                          const porcentajeActualTotal = beneficiarios.reduce(
                            (sum, b) =>
                              b.id === ben.id
                                ? sum
                                : sum + (parseFloat(b.porcentaje) || 0),
                            0
                          );

                          // Validar que el total no supere 100%
                          if (porcentajeActualTotal + valor <= 100) {
                            handleDynamicChange(
                              setBeneficiarios,
                              ben.id,
                              "porcentaje",
                              e.target.value
                            );
                          } else {
                            // Asignar el máximo permitido
                            const maxPermitido = 100 - porcentajeActualTotal;
                            handleDynamicChange(
                              setBeneficiarios,
                              ben.id,
                              "porcentaje",
                              maxPermitido.toString()
                            );
                          }
                        }}
                        onBlur={(e) => {
                          // Validación adicional al salir del campo
                          const valor = parseFloat(e.target.value);
                          if (valor < 0) {
                            handleDynamicChange(
                              setBeneficiarios,
                              ben.id,
                              "porcentaje",
                              "0"
                            );
                          } else if (valor > 100) {
                            handleDynamicChange(
                              setBeneficiarios,
                              ben.id,
                              "porcentaje",
                              "100"
                            );
                          }
                        }}
                      />
                      {(() => {
                        const porcentajeTotal = beneficiarios.reduce(
                          (sum, b) => sum + (parseFloat(b.porcentaje) || 0),
                          0
                        );
                        const porcentajeActual =
                          parseFloat(ben.porcentaje) || 0;
                        const porcentajeOtros =
                          porcentajeTotal - porcentajeActual;
                        const disponible = 100 - porcentajeOtros;

                        if (disponible < 100 && disponible > 0) {
                          return (
                            <span className="text-xs text-slate-500 mt-1">
                              Disponible: {disponible}%
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Botón para eliminar beneficiario */}
                  {beneficiarios.length > 1 && (
                    <button
                      onClick={() =>
                        setBeneficiarios((prev) =>
                          prev.filter((b) => b.id !== ben.id)
                        )
                      }
                      className="absolute top-0 right-0 text-red-500 hover:text-red-700 text-xs"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* DATOS BANCARIOS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Landmark size={18} className="text-indigo-600" />
              <h2 className="font-semibold text-slate-700 uppercase text-sm tracking-wider">
                Datos bancarios
              </h2>
            </div>

            {/* Selección de Tipo de Cobro */}
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-600 mb-3">
                Seleccione el método de cobro *
              </p>
              <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <label
                  className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${formData.datosBancarios === "debito"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="datosBancarios"
                    value="debito"
                    className="hidden"
                    checked={formData.datosBancarios === "debito"}
                    onChange={handleInputChange}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <span className="text-sm font-bold">TRANSFERENCIA</span>
                </label>

                {/*<label
                  className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${formData.datosBancarios === "sin_tarjeta"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="datosBancarios"
                    value="sin_tarjeta"
                    className="hidden"
                    checked={formData.datosBancarios === "sin_tarjeta"}
                    onChange={handleInputChange}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="text-sm font-bold whitespace-nowrap">RETIRO SIN TARJETA</span>
                </label>*/}
              </div>
            </div>

            {formData.datosBancarios === "debito" && (
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] font-bold text-indigo-500 uppercase mb-4 tracking-widest">
                  Detalles de la Tarjeta
                </p>

                {/*}
      <div className="flex justify-center mb-6">
        <Cards
          cvc="***"
          name="TITULAR DE LA TARJETA"
          number={formData.numeroTarjeta || ""}
          expiry=""
          focused="number"
        />
      </div>
      */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Número de tarjeta *
                    </label>
                    <input
                      type="text"
                      name="numeroTarjeta"
                      maxLength={16}
                      placeholder="XXXXXXXXXXXXXXXX"
                      value={formData.numeroTarjeta}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 16) {
                          handleInputChange({
                            target: { name: "numeroTarjeta", value: val }
                          });
                        }
                      }}
                      className="w-full p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent text-sm font-mono tracking-widest"
                    />
                    <p className={`text-[10px] mt-1 ${formData.numeroTarjeta.length === 16
                      ? 'text-green-600 font-medium'
                      : 'text-slate-400'
                      }`}>
                      {formData.numeroTarjeta.length === 16
                        ? '✓ Tarjeta válida - 16/16 dígitos'
                        : `${formData.numeroTarjeta.length}/16 dígitos`}
                    </p>
                  </div>

                  {/* Confirmar Tarjeta */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Confirme su tarjeta *
                    </label>
                    <input
                      type="text"
                      name="confirmarTarjeta"
                      maxLength={16}
                      placeholder="XXXXXXXXXXXXXXXX"
                      value={formData.confirmarTarjeta}
                      disabled={formData.numeroTarjeta.length !== 16}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 16) {
                          handleInputChange({
                            target: { name: "confirmarTarjeta", value: val }
                          });
                        }
                      }}
                      className={`w-full p-2 border-b focus:border-indigo-500 outline-none bg-transparent text-sm font-mono tracking-widest ${formData.numeroTarjeta.length !== 16
                        ? 'opacity-50 cursor-not-allowed border-slate-100'
                        : formData.confirmarTarjeta.length === 16 &&
                          formData.numeroTarjeta === formData.confirmarTarjeta
                          ? 'border-green-400'
                          : formData.confirmarTarjeta.length === 16 &&
                            formData.numeroTarjeta !== formData.confirmarTarjeta
                            ? 'border-red-400'
                            : 'border-slate-200'
                        }`}
                    />
                    <div className="mt-1">
                      {/* Si el primer campo no tiene 16 dígitos */}
                      {formData.numeroTarjeta.length !== 16 && (
                        <p className="text-[10px] text-slate-400">
                          Complete el número de tarjeta primero
                        </p>
                      )}

                      {/* Si está habilitado y escribiendo */}
                      {formData.numeroTarjeta.length === 16 && formData.confirmarTarjeta.length > 0 && formData.confirmarTarjeta.length < 16 && (
                        <p className="text-[10px] text-orange-500 font-medium">
                          {formData.confirmarTarjeta.length}/16 dígitos
                        </p>
                      )}

                      {/* Si tiene 16 dígitos y coinciden */}
                      {formData.numeroTarjeta.length === 16 &&
                        formData.confirmarTarjeta.length === 16 &&
                        formData.numeroTarjeta === formData.confirmarTarjeta && (
                          <p className="text-[10px] text-green-600 font-medium">
                            ✓ Tarjeta confirmada correctamente
                          </p>
                        )}

                      {/* Si tiene 16 dígitos pero NO coinciden */}
                      {formData.numeroTarjeta.length === 16 &&
                        formData.confirmarTarjeta.length === 16 &&
                        formData.numeroTarjeta !== formData.confirmarTarjeta && (
                          <p className="text-[10px] text-red-500 font-medium">
                            ⚠️ Los números no coinciden
                          </p>
                        )}

                      {/* Si está habilitado pero vacío */}
                      {formData.numeroTarjeta.length === 16 && formData.confirmarTarjeta.length === 0 && (
                        <p className="text-[10px] text-slate-400">
                          0/16 dígitos
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Selector de Banco Dinámico */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Banco *
                    </label>
                    <select
                      name="banco"
                      value={formData.banco}
                      onChange={handleInputChange}
                      className="w-full p-2 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent text-sm"
                    >
                      <option value="">Seleccione banco</option>
                      {Array.isArray(listaBancos) &&
                        listaBancos.map((b) => (
                          <option
                            key={b.claveBanco || b.id}
                            value={b.bancoNombre}
                          >
                            {b.bancoNombre}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Validación de coincidencia - mensaje general */}
                {formData.numeroTarjeta.length === 16 &&
                  formData.confirmarTarjeta.length === 16 &&
                  formData.numeroTarjeta !== formData.confirmarTarjeta && (
                    <p className="text-[10px] text-red-500 mt-4 font-medium">
                      ⚠️ Los números de tarjeta no coinciden.
                    </p>
                  )}
                {formData.numeroTarjeta.length === 16 &&
                  formData.confirmarTarjeta.length === 16 &&
                  formData.numeroTarjeta === formData.confirmarTarjeta && (
                    <p className="text-[10px] text-green-600 mt-4 font-medium">
                      ✓ Los números de tarjeta coinciden correctamente.
                    </p>
                  )}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-8">
            <button
              onClick={handleVerificar}
              disabled={cargando}
              className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${cargando
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
                }`}
            >
              Verificar Información
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}