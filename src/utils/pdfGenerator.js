export async function generatePDF() {
  // We no longer use html2canvas because it produces image-based PDFs that are not ATS-friendly.
  // Instead, we trigger the native browser print dialog, which generates crisp, selectable,
  // vector-based PDFs when the user selects "Save as PDF".
  
  // A slight delay ensures any UI states (like closing a dropdown) have time to paint
  // before the print dialog freezes the DOM.
  return new Promise((resolve) => {
    setTimeout(() => {
      window.print();
      resolve({ success: true });
    }, 100);
  });
}

export function printResume() {
  window.print();
}

export function emailResume(resumeName) {
  const subject = encodeURIComponent(`Resume - ${resumeName}`);
  const body = encodeURIComponent(
    `Hi,\n\nPlease find my resume attached.\n\nBest regards`
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}
