import { openDB } from "./js/indexedDB-helper.js";

// Fetch all records
async function getRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("progress", "readonly");
    const store = tx.objectStore("progress");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Failed to fetch records");
  });
}

// Render table
async function renderRecords() {
  const records = await getRecords();
  const tbody = document.getElementById("recordsBody");
  tbody.innerHTML = "";

  records.forEach(rec => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="border px-3 py-2">${rec.fullName || "N/A"}</td>
      <td class="border px-3 py-2">${rec.class || "N/A"}</td>
      <td class="border px-3 py-2">${rec.schoolName || "N/A"}</td>
      <td class="border px-3 py-2">${rec.subject}</td>
      <td class="border px-3 py-2">${rec.session}</td>
      <td class="border px-3 py-2">${rec.term}</td>
      <td class="border px-3 py-2">${rec.score}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Export PDF
document.getElementById("exportPdf").addEventListener("click", async () => {
  const { jsPDF } = await import("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  const doc = new jsPDF();

  doc.text("Student Records", 10, 10);

  let y = 20;
  const records = await getRecords();
  records.forEach(r => {
    doc.text(
      `${r.fullName} | ${r.class} | ${r.schoolName} | ${r.subject} | ${r.session} | ${r.term} | Score: ${r.score}`,
      10,
      y
    );
    y += 10;
  });

  doc.save("student-records.pdf");
});

// Export Excel
document.getElementById("exportExcel").addEventListener("click", async () => {
  const { utils, writeFile } = await import("https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs");
  const records = await getRecords();

  const ws = utils.json_to_sheet(records);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Records");

  writeFile(wb, "student-records.xlsx");
});

// Load records on page load
renderRecords();
