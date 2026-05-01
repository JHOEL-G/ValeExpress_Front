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
    if (!formData.calle.trim()) errores.push("📍 Domicilio: La calle es obligatoria");
    if (!formData.numExterior.trim()) errores.push("📍 Domicilio: El número exterior es obligatorio");
    if (!formData.codigoPostal.trim() || formData.codigoPostal.length !== 5)
      errores.push("📍 Domicilio: El código postal debe tener 5 dígitos");
    if (!formData.colonia.trim()) errores.push("📍 Domicilio: Debe seleccionar una colonia");
    if (!formData.rfc.trim()) errores.push("📋 Personales: El RFC es obligatorio");
    if (!formData.correo.trim()) {
      errores.push("📋 Personales: El correo electrónico es obligatorio");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      errores.push("📋 Personales: El correo electrónico no es válido");
    }
    if (!formData.empresa.trim()) errores.push("💼 Laborales: El nombre de la empresa es obligatorio");
    if (!formData.telefonoEmpresa.trim()) errores.push("💼 Laborales: El teléfono de la empresa es obligatorio");
    if (!formData.antiguedadLaboral || formData.antiguedadLaboral <= 0)
      errores.push("💼 Laborales: La antigüedad laboral debe ser mayor a 0");
    if (!formData.ingresosMensuales || formData.ingresosMensuales <= 0)
      errores.push("💼 Laborales: Los ingresos mensuales deben ser mayores a 0");

    referencias.forEach((ref, index) => {
      if (!ref.nombre.trim()) errores.push(`👥 Referencia ${index + 1}: Falta el nombre`);
      if (!ref.apellidoPaterno.trim()) errores.push(`👥 Referencia ${index + 1}: Falta el apellido paterno`);
      if (!ref.apellidoMaterno.trim()) errores.push(`👥 Referencia ${index + 1}: Falta el apellido materno`);
      if (!ref.telefono.trim()) errores.push(`👥 Referencia ${index + 1}: Falta el teléfono`);
      if (!ref.parentesco) errores.push(`👥 Referencia ${index + 1}: Debe seleccionar un parentesco`);
    });

    beneficiarios.forEach((ben, index) => {
      if (!ben.nombre.trim()) errores.push(`👨‍👩‍👧 Beneficiario ${index + 1}: Falta el nombre`);
      if (!ben.apellidoPaterno.trim()) errores.push(`👨‍👩‍👧 Beneficiario ${index + 1}: Falta el apellido paterno`);
      if (!ben.parentesco) errores.push(`👨‍👩‍👧 Beneficiario ${index + 1}: Debe seleccionar un parentesco`);
      if (!ben.fechaNacimiento) errores.push(`👨‍👩‍👧 Beneficiario ${index + 1}: Falta la fecha de nacimiento`);
      if (!ben.porcentaje || parseFloat(ben.porcentaje) <= 0)
        errores.push(`👨‍👩‍👧 Beneficiario ${index + 1}: Debe asignar un porcentaje válido`);
    });

    const porcentajeTotal = beneficiarios.reduce(
      (sum, ben) => sum + (parseFloat(ben.porcentaje) || 0), 0
    );
    if (porcentajeTotal !== 100)
      errores.push(`👨‍👩‍👧 Beneficiarios: La suma de porcentajes debe ser 100% (actualmente: ${porcentajeTotal}%)`);

    if (formData.datosBancarios === "debito") {
      const numeroLimpio = formData.numeroTarjeta.replace(/\s/g, "");
      const confirmarLimpio = formData.confirmarTarjeta.replace(/\s/g, "");
      if (!numeroLimpio || numeroLimpio.length !== 16)
        errores.push("💳 Datos Bancarios: El número de tarjeta debe tener exactamente 16 dígitos");
      if (!confirmarLimpio || confirmarLimpio.length !== 16)
        errores.push("💳 Datos Bancarios: Debe confirmar el número de tarjeta (16 dígitos)");
      if (numeroLimpio !== confirmarLimpio)
        errores.push("💳 Datos Bancarios: Los números de tarjeta no coinciden");
      if (!formData.banco.trim()) errores.push("💳 Datos Bancarios: Debe seleccionar un banco");
    }

    return errores;
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    if (name === "colonia") {
      const coloniaSeleccionada = colonias.find((c) => c.asentamientoNombre === value);
      setFormData((prev) => ({
        ...prev,
        colonia: value,
        asentamientoId: coloniaSeleccionada ? coloniaSeleccionada.asentamientoId : "",
      }));
    } else if (name === "banco") {
      const bancoSeleccionado = listaBancos.find((b) => b.bancoNombre === value);
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
            asentamientoId: data.length === 1 ? primeraColonia.asentamientoId : "",
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
        const dataP = Array.isArray(resParentesco.data) ? resParentesco.data : resParentesco.data?.data || [];
        const dataB = Array.isArray(resBancos.data) ? resBancos.data : resBancos.data?.data || [];
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
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addItem = (setter, emptyItem) => {
    setter((prev) => [
      ...prev,
      { ...emptyItem, id: Math.max(...prev.map((i) => i.id), 0) + 1 },
    ]);
  };

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
      const numeroTarjetaLimpio = formData.numeroTarjeta.replace(/\s/g, "");
      const confirmarTarjetaLimpio = formData.confirmarTarjeta.replace(/\s/g, "");
      const payloadFinal = {
        direccion: {
          calle: formData.calle || "",
          numExterior: formData.numExterior || "",
          numInterior: formData.numInterior || "",
          codigoPostal: Number(formData.codigoPostal) || 0,
          asentamientoId: formData.asentamientoId ? String(formData.asentamientoId).replace(/^0+/, "") : "947",
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
          banco: Number(formData.claveBanco) > 0 ? Number(formData.claveBanco) : 2001,
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
        alert("Error del servidor: " + (response.data?.resultado || "Desconocido"));
      }
    } catch (error) {
      console.error("❌ Error completo:", error.response?.data);
      if (error.response?.data?.errors) {
        const errores = error.response.data.errors;
        const mensajesError = Object.entries(errores)
          .map(([campo, mensajes]) => `• ${campo}: ${Array.isArray(mensajes) ? mensajes.join(", ") : mensajes}`)
          .join("\n");
        alert(`Errores de validación:\n\n${mensajesError}`);
      } else {
        alert("Error de comunicación. Revisa tu conexión.");
      }
    } finally {
      setCargando(false);
    }
  };

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

  const inputBase =
    "w-full px-3 py-2 border border-slate-200 rounded-lg outline-none transition-all text-sm focus:ring-2 focus:border-transparent";
  const inputFocus = "focus:ring-[#56BDBC]";
  const inputUnderline =
    "w-full p-2 border-b border-slate-200 outline-none bg-transparent text-sm transition-colors focus:border-[#56BDBC]";
  const selectBase =
    "w-full p-2 border-b border-slate-200 outline-none bg-transparent text-sm transition-colors focus:border-[#56BDBC]";

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Logo */}
          <div className="py-4">
            <img src="/9b430a02-0dab-48f2-941f-8262f99c4338" alt="Logo ValeExpress" className="h-40 w-auto object-contain" />
          </div>

          <p className="text-slate-400 text-sm">
            Por favor, capture la información solicitada a continuación.
          </p>

          {/* ── Modal de errores ── */}
          {erroresValidacion.length > 0 && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
                <div className="p-8">
                  <div className="flex flex-col items-center text-center mb-6">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ background: "#fff0f0" }}
                    >
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">Campos incompletos</h3>
                    <p className="text-gray-500 text-sm">Revisa y completa los siguientes campos:</p>
                  </div>

                  <div className="max-h-[45vh] overflow-y-auto mb-6 rounded-xl p-4 border"
                    style={{ background: "#fff8f8", borderColor: "#fecaca" }}>
                    <ul className="space-y-2">
                      {erroresValidacion.map((error, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                          <span className="text-red-400 font-bold mt-0.5">•</span>
                          <span className="flex-1">{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => setErroresValidacion([])}
                    className="w-full text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
                    style={{ background: "linear-gradient(90deg, var(--teal-principal), var(--azul-celeste-suave))" }}
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
              SECCIÓN: Domicilio y Personales
          ══════════════════════════════════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header de sección */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2"
              style={{ borderLeftWidth: 4, borderLeftColor: "var(--teal-principal)" }}>
              <Home size={16} style={{ color: "var(--teal-principal)" }} />
              <h2 className="font-bold text-slate-700 uppercase text-xs tracking-widest">
                Domicilio y Personales
              </h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-400 mb-1">Calle *</label>
                <input type="text" name="calle" value={formData.calle} onChange={handleInputChange}
                  className={`${inputBase} ${inputFocus}`} />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Núm. exterior *</label>
                <input type="text" name="numExterior" value={formData.numExterior} onChange={handleInputChange}
                  className={`${inputBase} ${inputFocus}`} />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Núm. interior</label>
                <input type="text" name="numInterior" value={formData.numInterior} onChange={handleInputChange}
                  className={`${inputBase} ${inputFocus}`} />
              </div>

              {/* CP con acento verde vibrante */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--verde-vibrante)" }}>
                  Código postal *
                </label>
                <input type="text" name="codigoPostal" maxLength={5}
                  value={formData.codigoPostal} onChange={handleInputChange}
                  className={`${inputBase} font-bold focus:ring-2`}
                  style={{
                    borderColor: "var(--verde-vibrante)",
                    background: "#f6fff0",
                    // ring handled via focus ring class below
                  }}
                  onFocus={(e) => (e.target.style.outline = `2px solid var(--verde-vibrante)`)}
                  onBlur={(e) => (e.target.style.outline = "none")}
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">Colonia *</label>
                <select name="colonia" value={formData.colonia} onChange={handleInputChange}
                  className={`${inputBase} ${inputFocus} bg-white`}>
                  <option value="">Seleccione colonia</option>
                  {colonias.map((c, i) => (
                    <option key={i} value={c.asentamientoNombre}>{c.asentamientoNombre}</option>
                  ))}
                </select>
              </div>

              {[
                { label: "Ciudad", value: formData.ciudad },
                { label: "Municipio", value: formData.municipio },
                { label: "Estado", value: formData.estado },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
                  <input type="text" value={value} readOnly
                    className="w-full px-3 py-2 border border-slate-100 bg-slate-50 rounded-lg text-slate-400 text-sm cursor-not-allowed" />
                </div>
              ))}

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">RFC *</label>
                <input type="text" name="rfc" value={formData.rfc} onChange={handleInputChange}
                  maxLength={13} placeholder="10 o 13 caracteres"
                  className={`${inputBase} ${inputFocus} uppercase`} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Correo electrónico *</label>
                <input type="email" name="correo" value={formData.correo} onChange={handleInputChange}
                  className={`${inputBase} ${inputFocus}`} />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════
              SECCIÓN: Datos Laborales
          ══════════════════════════════════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2"
              style={{ borderLeftWidth: 4, borderLeftColor: "var(--verde-vibrante)" }}>
              <Briefcase size={16} style={{ color: "var(--verde-vibrante)" }} />
              <h2 className="font-bold text-slate-700 uppercase text-xs tracking-widest">
                Datos Laborales
              </h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-400 mb-1">Empresa o Emprendimiento *</label>
                <input type="text" name="empresa" value={formData.empresa} onChange={handleInputChange}
                  className={`${inputBase} ${inputFocus}`} />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Teléfono de la empresa *</label>
                <input type="text" name="telefonoEmpresa" value={formData.telefonoEmpresa} maxLength={10}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 10) handleInputChange(e);
                  }}
                  className={`${inputBase} ${inputFocus}`} />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Antigüedad laboral (años) *</label>
                <input type="number" name="antiguedadLaboral" value={formData.antiguedadLaboral}
                  onChange={handleInputChange} className={`${inputBase} ${inputFocus}`} />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Ingresos mensuales *</label>
                <input type="number" name="ingresosMensuales" value={formData.ingresosMensuales}
                  onChange={handleInputChange} className={`${inputBase} ${inputFocus}`} />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════
              SECCIÓN: Referencias
          ══════════════════════════════════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center"
              style={{ borderLeftWidth: 4, borderLeftColor: "var(--azul-celeste-suave)" }}>
              <div className="flex items-center gap-2">
                <Users size={16} style={{ color: "var(--azul-celeste-suave)" }} />
                <h2 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Referencias</h2>
              </div>
              <button
                onClick={() => {
                  if (referencias.length < 2) {
                    addItem(setReferencias, {
                      nombre: "", apellidoPaterno: "", apellidoMaterno: "",
                      telefono: "", parentescoId: "", tiempoConocido: "",
                    });
                  }
                }}
                disabled={referencias.length >= 2}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={referencias.length >= 2
                  ? { color: "#cbd5e1", cursor: "not-allowed" }
                  : { color: "var(--teal-principal)", background: "var(--verde-menta-claro)" }
                }
                title={referencias.length >= 2 ? "Máximo 2 referencias" : "Agregar referencia"}
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {referencias.map((ref, index) => (
                <div key={ref.id}
                  className="relative pb-4 last:pb-0 border-b last:border-0 border-slate-100">
                  {referencias.length > 1 && (
                    <button
                      onClick={() => setReferencias((prev) => prev.filter((r) => r.id !== ref.id))}
                      className="absolute top-0 right-0 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  <p className="text-[10px] font-bold uppercase mb-3 tracking-widest"
                    style={{ color: "var(--teal-principal)" }}>
                    Referencia {index + 1}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { placeholder: "Nombre(s) *", field: "nombre", value: ref.nombre },
                      { placeholder: "Apellido Paterno *", field: "apellidoPaterno", value: ref.apellidoPaterno },
                      { placeholder: "Apellido Materno *", field: "apellidoMaterno", value: ref.apellidoMaterno },
                    ].map(({ placeholder, field, value }) => (
                      <input key={field} type="text" placeholder={placeholder}
                        className={inputUnderline} value={value}
                        onChange={(e) => handleDynamicChange(setReferencias, ref.id, field, e.target.value)} />
                    ))}

                    <input type="text" placeholder="Teléfono (10 dígitos) *"
                      className={inputUnderline} value={ref.telefono} maxLength={10}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        handleDynamicChange(setReferencias, ref.id, "telefono", val);
                      }} />

                    <select className={selectBase} value={ref.parentesco}
                      onChange={(e) => {
                        const pSeleccionado = listaParentescos.find((p) => p.parentescoNombre === e.target.value);
                        handleDynamicChange(setReferencias, ref.id, "parentesco", e.target.value);
                        handleDynamicChange(setReferencias, ref.id, "parentescoId", pSeleccionado?.parentescoId || 1);
                      }}>
                      <option value="">Seleccione parentesco</option>
                      {Array.isArray(listaParentescos) && listaParentescos.map((p) => (
                        <option key={p.parentescoId} value={p.parentescoNombre}>
                          {p.parentescoNombre || p.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════
              SECCIÓN: Beneficiarios
          ══════════════════════════════════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center"
              style={{ borderLeftWidth: 4, borderLeftColor: "var(--verde-vibrante)" }}>
              <div className="flex items-center gap-2">
                <Users size={16} style={{ color: "var(--verde-vibrante)" }} />
                <h2 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Beneficiarios</h2>
              </div>
              {(() => {
                const porcentajeTotal = beneficiarios.reduce(
                  (sum, ben) => sum + (parseFloat(ben.porcentaje) || 0), 0
                );
                return porcentajeTotal < 100 ? (
                  <button
                    onClick={() => addItem(setBeneficiarios, {
                      nombre: "", apellidoPaterno: "", apellidoMaterno: "",
                      parentesco: "", porcentaje: "", fechaNacimiento: "",
                    })}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{ color: "var(--verde-vibrante)", background: "var(--verde-menta-claro)" }}
                  >
                    <Plus size={16} />
                  </button>
                ) : null;
              })()}
            </div>

            <div className="p-6 space-y-6">
              {/* Barra de porcentaje */}
              {(() => {
                const porcentajeTotal = beneficiarios.reduce(
                  (sum, ben) => sum + (parseFloat(ben.porcentaje) || 0), 0
                );
                const esCompleto = porcentajeTotal === 100;
                const excede = porcentajeTotal > 100;
                return (
                  <div className="rounded-xl p-3 border text-xs"
                    style={{
                      background: esCompleto ? "#f0fff4" : excede ? "#fff5f5" : "var(--verde-menta-claro)",
                      borderColor: esCompleto ? "#86efac" : excede ? "#fca5a5" : "var(--azul-celeste-suave)"
                    }}>
                    <span className="font-medium text-slate-600">Porcentaje total asignado: </span>
                    <span className="font-black"
                      style={{ color: esCompleto ? "#16a34a" : excede ? "#dc2626" : "var(--teal-principal)" }}>
                      {porcentajeTotal}%
                    </span>
                    {excede && <span className="text-red-500 ml-2">⚠️ No puede superar el 100%</span>}
                    {esCompleto && <span className="ml-2" style={{ color: "#16a34a" }}>✓ Porcentaje completo</span>}
                  </div>
                );
              })()}

              {beneficiarios.map((ben, index) => (
                <div key={ben.id} className="relative pb-4 last:pb-0">
                  <p className="text-[10px] font-bold uppercase mb-3 tracking-widest"
                    style={{ color: "var(--verde-vibrante)" }}>
                    Beneficiario {index + 1}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nombre(s) *" className={inputUnderline}
                      value={ben.nombre}
                      onChange={(e) => handleDynamicChange(setBeneficiarios, ben.id, "nombre", e.target.value)} />

                    <input type="text" placeholder="Apellidos *" className={inputUnderline}
                      value={ben.apellidoPaterno}
                      onChange={(e) => handleDynamicChange(setBeneficiarios, ben.id, "apellidoPaterno", e.target.value)} />

                    <select className={selectBase} value={ben.parentesco}
                      onChange={(e) => {
                        const pSeleccionado = listaParentescos.find((p) => p.parentescoNombre === e.target.value);
                        handleDynamicChange(setBeneficiarios, ben.id, "parentesco", e.target.value);
                        handleDynamicChange(setBeneficiarios, ben.id, "parentescoId", pSeleccionado?.parentescoId || 1);
                      }}>
                      <option value="">Seleccione parentesco</option>
                      {Array.isArray(listaParentescos) && listaParentescos.map((p) => (
                        <option key={p.parentescoId} value={p.parentescoNombre}>
                          {p.parentescoNombre || p.descripcion}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-col">
                      <label className="text-xs text-slate-400 mb-1">Fecha de Nacimiento</label>
                      <input type="date" className={inputUnderline} value={ben.fechaNacimiento}
                        onChange={(e) => handleDynamicChange(setBeneficiarios, ben.id, "fechaNacimiento", e.target.value)} />
                    </div>

                    <div className="flex flex-col">
                      <input type="number" placeholder="Porcentaje % *" min="0" max="100"
                        className={inputUnderline} value={ben.porcentaje}
                        onChange={(e) => {
                          const valor = parseFloat(e.target.value) || 0;
                          const porcentajeActualTotal = beneficiarios.reduce(
                            (sum, b) => b.id === ben.id ? sum : sum + (parseFloat(b.porcentaje) || 0), 0
                          );
                          if (porcentajeActualTotal + valor <= 100) {
                            handleDynamicChange(setBeneficiarios, ben.id, "porcentaje", e.target.value);
                          } else {
                            handleDynamicChange(setBeneficiarios, ben.id, "porcentaje",
                              (100 - porcentajeActualTotal).toString());
                          }
                        }}
                        onBlur={(e) => {
                          const valor = parseFloat(e.target.value);
                          if (valor < 0) handleDynamicChange(setBeneficiarios, ben.id, "porcentaje", "0");
                          else if (valor > 100) handleDynamicChange(setBeneficiarios, ben.id, "porcentaje", "100");
                        }} />
                      {(() => {
                        const porcentajeTotal = beneficiarios.reduce((sum, b) => sum + (parseFloat(b.porcentaje) || 0), 0);
                        const porcentajeActual = parseFloat(ben.porcentaje) || 0;
                        const disponible = 100 - (porcentajeTotal - porcentajeActual);
                        if (disponible < 100 && disponible > 0) {
                          return (
                            <span className="text-xs mt-1" style={{ color: "var(--teal-principal)" }}>
                              Disponible: {disponible}%
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {beneficiarios.length > 1 && (
                    <button
                      onClick={() => setBeneficiarios((prev) => prev.filter((b) => b.id !== ben.id))}
                      className="absolute top-0 right-0 text-xs text-slate-300 hover:text-red-400 transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════
              SECCIÓN: Datos Bancarios
          ══════════════════════════════════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2"
              style={{ borderLeftWidth: 4, borderLeftColor: "var(--teal-principal)" }}>
              <Landmark size={16} style={{ color: "var(--teal-principal)" }} />
              <h2 className="font-bold text-slate-700 uppercase text-xs tracking-widest">
                Datos Bancarios
              </h2>
            </div>

            <div className="p-6">
              {/* Selector de método */}
              <p className="text-xs font-medium text-slate-500 mb-3">Seleccione el método de cobro *</p>
              <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 mb-6">
                <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer transition-all font-bold text-sm`}
                  style={formData.datosBancarios === "debito"
                    ? { background: "linear-gradient(90deg, var(--teal-principal), var(--azul-celeste-suave))", color: "white", borderColor: "transparent", boxShadow: "0 4px 14px rgba(86,189,188,0.35)" }
                    : { background: "white", color: "#64748b", borderColor: "#e2e8f0" }}>
                  <input type="radio" name="datosBancarios" value="debito"
                    className="hidden" checked={formData.datosBancarios === "debito"}
                    onChange={handleInputChange} />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  TRANSFERENCIA
                </label>
              </div>

              {/* Campos de tarjeta */}
              {formData.datosBancarios === "debito" && (
                <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/40">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-4"
                    style={{ color: "var(--teal-principal)" }}>
                    Detalles de la Tarjeta
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Número de tarjeta */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Número de tarjeta *</label>
                      <input type="text" name="numeroTarjeta" maxLength={16}
                        placeholder="XXXXXXXXXXXXXXXX"
                        value={formData.numeroTarjeta}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (val.length <= 16) handleInputChange({ target: { name: "numeroTarjeta", value: val } });
                        }}
                        className={`${inputUnderline} font-mono tracking-widest`} />
                      <p className="text-[10px] mt-1"
                        style={{ color: formData.numeroTarjeta.length === 16 ? "var(--verde-vibrante)" : "#94a3b8" }}>
                        {formData.numeroTarjeta.length === 16
                          ? "✓ Tarjeta válida — 16/16 dígitos"
                          : `${formData.numeroTarjeta.length}/16 dígitos`}
                      </p>
                    </div>

                    {/* Confirmar tarjeta */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Confirme su tarjeta *</label>
                      <input type="text" name="confirmarTarjeta" maxLength={16}
                        placeholder="XXXXXXXXXXXXXXXX"
                        value={formData.confirmarTarjeta}
                        disabled={formData.numeroTarjeta.length !== 16}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (val.length <= 16) handleInputChange({ target: { name: "confirmarTarjeta", value: val } });
                        }}
                        className={`${inputUnderline} font-mono tracking-widest`}
                        style={
                          formData.numeroTarjeta.length !== 16
                            ? { opacity: 0.4, cursor: "not-allowed" }
                            : formData.confirmarTarjeta.length === 16 && formData.numeroTarjeta === formData.confirmarTarjeta
                              ? { borderBottomColor: "var(--verde-vibrante)" }
                              : formData.confirmarTarjeta.length === 16
                                ? { borderBottomColor: "#ef4444" }
                                : {}
                        } />
                      <div className="mt-1 text-[10px]">
                        {formData.numeroTarjeta.length !== 16 && (
                          <p className="text-slate-400">Complete el número de tarjeta primero</p>
                        )}
                        {formData.numeroTarjeta.length === 16 && formData.confirmarTarjeta.length > 0 && formData.confirmarTarjeta.length < 16 && (
                          <p style={{ color: "#f97316" }}>{formData.confirmarTarjeta.length}/16 dígitos</p>
                        )}
                        {formData.numeroTarjeta.length === 16 && formData.confirmarTarjeta.length === 16 && formData.numeroTarjeta === formData.confirmarTarjeta && (
                          <p style={{ color: "var(--verde-vibrante)" }}>✓ Tarjeta confirmada correctamente</p>
                        )}
                        {formData.numeroTarjeta.length === 16 && formData.confirmarTarjeta.length === 16 && formData.numeroTarjeta !== formData.confirmarTarjeta && (
                          <p className="text-red-500">⚠️ Los números no coinciden</p>
                        )}
                      </div>
                    </div>

                    {/* Banco */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Banco *</label>
                      <select name="banco" value={formData.banco} onChange={handleInputChange}
                        className={selectBase}>
                        <option value="">Seleccione banco</option>
                        {Array.isArray(listaBancos) && listaBancos.map((b) => (
                          <option key={b.claveBanco || b.id} value={b.bancoNombre}>{b.bancoNombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Mensaje global coincidencia */}
                  {formData.numeroTarjeta.length === 16 && formData.confirmarTarjeta.length === 16 && (
                    <p className="text-[10px] mt-4 font-medium"
                      style={{ color: formData.numeroTarjeta === formData.confirmarTarjeta ? "var(--verde-vibrante)" : "#ef4444" }}>
                      {formData.numeroTarjeta === formData.confirmarTarjeta
                        ? "✓ Los números de tarjeta coinciden correctamente."
                        : "⚠️ Los números de tarjeta no coinciden."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Botón de envío ── */}
          <div className="flex justify-end mt-8 pb-8">
            <button
              onClick={handleVerificar}
              disabled={cargando}
              className="px-10 py-3 rounded-xl font-black text-white text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={!cargando
                ? { background: "linear-gradient(90deg, var(--teal-principal), var(--verde-vibrante))", boxShadow: "0 4px 18px rgba(86,189,188,0.4)" }
                : { background: "#94a3b8" }
              }
            >
              {cargando ? "Enviando…" : "Verificar Información →"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}