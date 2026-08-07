// Catálogos Oficiales SAT para CFDI 4.0

export const REGIMENES_FISCALES = [
  { id: "601", name: "601 - General de Ley Personas Morales" },
  { id: "603", name: "603 - Personas Morales con Fines no Lucrativos" },
  { id: "605", name: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { id: "606", name: "606 - Arrendamiento" },
  { id: "612", name: "612 - Personas Físicas con Actividades Empresariales y Profesionales" },
  { id: "616", name: "616 - Sin obligaciones fiscales" },
  { id: "625", name: "625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
  { id: "626", name: "626 - Régimen Simplificado de Confianza (RESICO)" }
];

export const USOS_CFDI = [
  { id: "G01", name: "G01 - Adquisición de mercancías" },
  { id: "G02", name: "G02 - Devoluciones, descuentos o bonificaciones" },
  { id: "G03", name: "G03 - Gastos en general" },
  { id: "I01", name: "I01 - Construcciones" },
  { id: "I02", name: "I02 - Mobiliario y equipo de oficina por inversiones" },
  { id: "CP01", name: "CP01 - Pagos" },
  { id: "CN01", name: "CN01 - Nómina" },
  { id: "S01", name: "S01 - Sin efectos fiscales" }
];

export const FORMAS_PAGO = [
  { id: "01", name: "01 - Efectivo" },
  { id: "02", name: "02 - Cheque nominativo" },
  { id: "03", name: "03 - Transferencia electrónica de fondos" },
  { id: "04", name: "04 - Tarjeta de crédito" },
  { id: "28", name: "28 - Tarjeta de débito" },
  { id: "99", name: "99 - Por definir" }
];

export const METODOS_PAGO = [
  { id: "PUE", name: "PUE - Pago en una sola exhibición" },
  { id: "PPD", name: "PPD - Pago en parcialidades o diferido" }
];

export const OBJETOS_IMPUESTO = [
  { id: "01", name: "01 - No objeto de impuesto" },
  { id: "02", name: "02 - Sí objeto de impuesto" },
  { id: "03", name: "03 - Sí objeto de impuesto y no obligado al desglose" },
  { id: "04", name: "04 - Sí objeto de impuesto y no causa impuesto" }
];