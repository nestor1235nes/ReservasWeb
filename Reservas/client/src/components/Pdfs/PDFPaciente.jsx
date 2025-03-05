import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PDFPaciente = ({ paciente, dataReserva, sesiones, user }) => {
  const doc = new jsPDF();

  // Función para limpiar etiquetas HTML
  const stripHtmlTags = (html) => {
    return html.replace(/<[^>]+>/g, '');
  };


  // Título principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Historial Clínico del Paciente', 70, 10);
  doc.setLineWidth(0.5);
  doc.line(10, 15, 200, 15); // Línea separadora

  // Sección: Datos del Paciente
  doc.setFontSize(12);
  doc.text('Datos del Paciente:', 10, 25);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Formato en pares de datos
  doc.setFont('helvetica', 'bold');
  doc.text('Nombre:', 10, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(paciente.nombre, 40, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('RUT:', 110, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(paciente.rut, 130, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('Celular:', 10, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(paciente.telefono || 'No disponible', 40, 45);

  doc.setFont('helvetica', 'bold');
  doc.text('Email:', 10, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(paciente.email || 'No disponible', 40, 55);

  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', 10, 65);
  doc.setFont('helvetica', 'normal');
  doc.text(paciente.direccion || 'No disponible', 40, 65, { maxWidth: 150 });

  doc.setFont('helvetica', 'bold');
  doc.text('Profesional Asignado:', 10, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(user.username || 'No disponible', 55, 75);

  let nextY = 85; // Ajuste de posición

  // Sección: Diagnóstico
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Diagnóstico:', 10, nextY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(dataReserva.diagnostico || 'No disponible', 10, nextY + 6, { maxWidth: 180 });

  nextY += 15; // Ajustar espacio

  // Sección: Anamnesis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Anamnesis:', 10, nextY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Limpiar etiquetas HTML de la anamnesis
  const anamnesisText = stripHtmlTags(dataReserva.anamnesis || 'No disponible');
  const anamnesisLines = doc.splitTextToSize(anamnesisText, 180);
  doc.text(anamnesisLines, 10, nextY + 6);

  nextY += 6 + anamnesisLines.length * 10; // Ajustar espacio dinámicamente

  // Sección: Historial de Sesiones
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Historial de Sesiones:', 10, nextY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  

  // Preparar datos de la tabla
  const tableData = sesiones.map(sesion => [
    new Date(sesion.fecha).toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    stripHtmlTags(sesion.notas) // Eliminar etiquetas HTML
  ]);

  doc.autoTable({
    startY: nextY + 6,
    head: [['Fecha', 'Procedimiento']],
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 150 } }
  });

  // Guardar el PDF
  doc.save(`Historial_${paciente.rut}.pdf`);
};

export default PDFPaciente;